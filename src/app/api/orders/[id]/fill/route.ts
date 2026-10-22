import { z } from "zod";
import { sb } from "@/lib/sb";
import {
  apiError,
  apiOk,
  parseJson,
  requireApiSession,
  requireCap,
} from "@/lib/api";
import {
  canActOnOrderAsOrigin,
  canActOnOrderAsReceiver,
} from "@/lib/permissions";

const schema = z.object({
  fillPercent: z.number().int().min(0).max(100).nullable(),
});

// Manual container fill percentage (per 2026-07-09 PVE call). Set by whoever is
// working the order — the origin or the receiving team — to show real-time
// progress. Read-only VIEWER cannot (no orders.write).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "orders.write");
  if (forbidden) return forbidden;

  const { id } = await params;
  const client = sb();

  const { data: order, error: orderErr } = await client
    .from("Order")
    .select("id, status, originLocation, destLocation")
    .eq("id", id)
    .maybeSingle();
  if (orderErr) return apiError(orderErr.message, 500);
  if (!order) return apiError("Order not found.", 404);

  if (
    !canActOnOrderAsOrigin(auth.session, order) &&
    !canActOnOrderAsReceiver(auth.session, order)
  ) {
    return apiError("You can't update this order's fill percentage.", 403);
  }

  const parsed = await parseJson(request, schema);
  if ("error" in parsed) return parsed.error;
  const { fillPercent } = parsed.data;

  const { error: updErr } = await client
    .from("Order")
    .update({ fillPercent })
    .eq("id", id);
  if (updErr) return apiError(updErr.message, 500);

  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: "UPDATE_FILL",
    entity: "Order",
    entityId: id,
    metadata: { fillPercent },
  });
  if (auditErr) return apiError(auditErr.message, 500);

  return apiOk({ ok: true, fillPercent });
}
