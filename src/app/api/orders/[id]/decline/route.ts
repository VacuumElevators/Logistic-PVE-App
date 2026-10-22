import { z } from "zod";
import { sb } from "@/lib/sb";
import {
  apiError,
  apiOk,
  parseJson,
  requireApiSession,
  requireCap,
} from "@/lib/api";
import { canTransition } from "@/lib/order-workflow";
import { canActOnOrderAsReceiver } from "@/lib/permissions";
import { sendOrderStatusEmail } from "@/lib/order-emails";

const schema = z.object({
  reason: z.string().min(3).max(500),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  // Authorized by destination-location match (canActOnOrderAsReceiver, below).
  // Require only a non-viewer operator (STAFF+); VIEWER lacks orders.write.
  const forbidden = requireCap(auth.session, "orders.write");
  if (forbidden) return forbidden;
  const { id } = await params;
  const client = sb();

  const parsed = await parseJson(request, schema);
  if ("error" in parsed) return parsed.error;

  const { data: order, error: orderErr } = await client
    .from("Order")
    .select("id, status, destLocation")
    .eq("id", id)
    .maybeSingle();
  if (orderErr) return apiError(orderErr.message, 500);
  if (!order) return apiError("Not found", 404);

  if (!canActOnOrderAsReceiver(auth.session, order)) {
    return apiError("Only the receiving region can decline this order", 403);
  }

  if (!canTransition(order.status, "DECLINED")) {
    return apiError(`Cannot decline an order in status ${order.status}`, 409);
  }

  const { data: updated, error: updErr } = await client
    .from("Order")
    .update({
      status: "DECLINED",
      declinedAt: new Date().toISOString(),
      declineReason: parsed.data.reason,
    })
    .eq("id", id)
    .select()
    .single();
  if (updErr) return apiError(updErr.message, 500);

  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: "DECLINE",
    entity: "Order",
    entityId: id,
    metadata: { reason: parsed.data.reason },
  });
  if (auditErr) return apiError(auditErr.message, 500);

  await sendOrderStatusEmail({
    orderId: id,
    status: "DECLINED",
    actorId: auth.session.sub,
  });

  return apiOk(updated);
}
