import { ZodError, type ZodType } from "zod";
import { getSession } from "./auth";
import type { AccessPayload } from "./auth";
import { can, type Capability } from "./permissions";
import type { Database } from "@/types/database";

type UserRole = Database["public"]["Enums"]["UserRole"];

export function apiError(
  message: string,
  status = 400,
  details?: unknown,
): Response {
  return Response.json({ error: message, details }, { status });
}

export function apiOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ data }, init);
}

export async function parseJson<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<{ data: T } | { error: Response }> {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    return { data: parsed };
  } catch (err) {
    if (err instanceof ZodError) {
      return { error: apiError("Invalid payload", 422, err.flatten()) };
    }
    return { error: apiError("Malformed JSON body", 400) };
  }
}

export async function requireApiSession(): Promise<
  { session: AccessPayload } | { error: Response }
> {
  const session = await getSession();
  if (!session) return { error: apiError("Unauthorized", 401) };
  return { session };
}

export function requireRole(
  session: AccessPayload,
  allowed: UserRole[],
): Response | null {
  if (!allowed.includes(session.role)) {
    return apiError("Forbidden", 403);
  }
  return null;
}

export function requireCap(
  session: AccessPayload,
  capability: Capability,
): Response | null {
  if (!can(session, capability)) {
    return apiError("Forbidden", 403, { missing: capability });
  }
  return null;
}
