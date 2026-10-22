import { z } from "zod";
import { sb } from "@/lib/sb";
import {
  apiError,
  apiOk,
  parseJson,
  requireApiSession,
  requireCap,
} from "@/lib/api";
import { listLocationsWithStats } from "@/lib/locations";
import { LOCATIONS } from "@/lib/constants";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "locations.read");
  if (forbidden) return forbidden;
  return apiOk(await listLocationsWithStats());
}

const createSchema = z.object({
  code: z.enum(LOCATIONS),
  name: z.string().min(2).max(80),
  country: z.string().min(2).max(80),
  city: z.string().max(80).optional(),
  address: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().optional(),
  currency: z.string().length(3).default("USD"),
  timezone: z.string().max(64).optional(),
  flag: z.string().max(8).optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "locations.write");
  if (forbidden) return forbidden;
  if (auth.session.role !== "SUPER_ADMIN") {
    return apiError("Only Super Admins can create locations", 403);
  }

  const parsed = await parseJson(request, createSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const client = sb();
  const { data: existing, error: existingErr } = await client
    .from("LocationProfile")
    .select("code")
    .eq("code", body.code)
    .maybeSingle();
  if (existingErr) return apiError(existingErr.message, 500);
  if (existing) return apiError("Location already provisioned", 409);

  const { data: created, error: createErr } = await client
    .from("LocationProfile")
    .insert(body)
    .select()
    .single();
  if (createErr) return apiError(createErr.message, 500);

  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: "CREATE",
    entity: "Location",
    entityId: created.code,
  });
  if (auditErr) return apiError(auditErr.message, 500);

  return apiOk(created, { status: 201 });
}
