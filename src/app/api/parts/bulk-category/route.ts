import { z } from "zod";
import { sb } from "@/lib/sb";
import {
  apiError,
  apiOk,
  parseJson,
  requireApiSession,
  requireCap,
} from "@/lib/api";
import { PART_CATEGORIES } from "@/lib/constants";

const bodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  category: z.enum(PART_CATEGORIES),
});

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "parts.write");
  if (forbidden) return forbidden;

  const parsed = await parseJson(request, bodySchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;
  const client = sb();

  // Preflight: confirm every id exists. Prevents silent partial updates from a stale client.
  const { data: existing, error: existingErr } = await client
    .from("Part")
    .select("id")
    .in("id", body.ids);
  if (existingErr) return apiError(existingErr.message, 500);
  const existingIds = new Set((existing ?? []).map((p) => p.id));
  if (existingIds.size !== body.ids.length) {
    const missing = body.ids.filter((id) => !existingIds.has(id));
    return apiError(
      `Some parts no longer exist: ${missing.slice(0, 5).join(", ")}${
        missing.length > 5 ? " …" : ""
      }`,
      422,
    );
  }

  const { data: updated, error: updateErr } = await client
    .from("Part")
    .update({ category: body.category })
    .in("id", body.ids)
    .select("id");
  if (updateErr) return apiError(updateErr.message, 500);
  if ((updated ?? []).length !== body.ids.length) {
    return apiError(
      `Update affected ${updated?.length ?? 0} of ${body.ids.length} parts`,
      500,
    );
  }

  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: "UPDATE",
    entity: "Part",
    metadata: {
      bulk: true,
      count: body.ids.length,
      category: body.category,
      sample: body.ids.slice(0, 10),
    },
  });
  if (auditErr) return apiError(auditErr.message, 500);

  return apiOk({ updated: body.ids.length, category: body.category });
}
