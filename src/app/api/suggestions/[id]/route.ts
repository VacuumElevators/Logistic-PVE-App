import { z } from "zod";
import { sb } from "@/lib/sb";
import {
  apiError,
  apiOk,
  parseJson,
  requireApiSession,
  requireCap,
} from "@/lib/api";

const patchSchema = z.object({
  status: z.enum(["OPEN", "RESOLVED"]),
});

// Admins (settings.read = MANAGER and up) review + resolve suggestions.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "settings.read");
  if (forbidden) return forbidden;

  const { id } = await params;
  const parsed = await parseJson(request, patchSchema);
  if ("error" in parsed) return parsed.error;

  const resolved = parsed.data.status === "RESOLVED";
  const client = sb();
  const { error } = await client
    .from("Suggestion")
    .update({
      status: parsed.data.status,
      resolvedAt: resolved ? new Date().toISOString() : null,
      resolvedById: resolved ? auth.session.sub : null,
    })
    .eq("id", id);
  if (error) return apiError(error.message, 500);

  return apiOk({ ok: true });
}
