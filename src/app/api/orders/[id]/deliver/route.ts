import { sb } from "@/lib/sb";
import {
  apiError,
  apiOk,
  requireApiSession,
  requireCap,
} from "@/lib/api";
import { canTransition } from "@/lib/order-workflow";
import { canActOnOrderAsReceiver } from "@/lib/permissions";
import { sendOrderStatusEmail } from "@/lib/order-emails";

export async function POST(
  _request: Request,
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

  const { data: order, error: orderErr } = await client
    .from("Order")
    .select("id, status, destLocation")
    .eq("id", id)
    .maybeSingle();
  if (orderErr) return apiError(orderErr.message, 500);
  if (!order) return apiError("Not found", 404);
  if (!canActOnOrderAsReceiver(auth.session, order)) {
    return apiError("Only the receiving region can mark this delivered", 403);
  }
  if (!canTransition(order.status, "DELIVERED")) {
    return apiError(`Cannot mark delivered in status ${order.status}`, 409);
  }

  const { data: updated, error: updErr } = await client
    .from("Order")
    .update({ status: "DELIVERED", deliveredAt: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (updErr) return apiError(updErr.message, 500);

  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: "DELIVER",
    entity: "Order",
    entityId: id,
  });
  if (auditErr) return apiError(auditErr.message, 500);

  await sendOrderStatusEmail({
    orderId: id,
    status: "DELIVERED",
    actorId: auth.session.sub,
  });

  return apiOk(updated);
}
