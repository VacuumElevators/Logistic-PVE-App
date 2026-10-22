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
  estimatedShipDate: z.string().min(8),
  estimatedArrivalDate: z.string().min(8),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  // Receiving-side transitions are authorized by destination-location match
  // (canActOnOrderAsReceiver, below), not by a manager-only capability. Here we
  // only require a non-viewer operator (STAFF+ has orders.write; VIEWER does not),
  // so the destination team can accept orders sent to them.
  const forbidden = requireCap(auth.session, "orders.write");
  if (forbidden) return forbidden;
  const { id } = await params;
  const client = sb();

  const parsed = await parseJson(request, schema);
  if ("error" in parsed) return parsed.error;
  const { estimatedShipDate, estimatedArrivalDate } = parsed.data;

  const ship = new Date(estimatedShipDate);
  const arrival = new Date(estimatedArrivalDate);
  if (Number.isNaN(ship.getTime()) || Number.isNaN(arrival.getTime())) {
    return apiError("Invalid date format", 422);
  }
  if (arrival < ship) {
    return apiError("Arrival date must be after ship date", 422);
  }

  const { data: order, error: orderErr } = await client
    .from("Order")
    .select("id, status, destLocation")
    .eq("id", id)
    .maybeSingle();
  if (orderErr) return apiError(orderErr.message, 500);
  if (!order) return apiError("Not found", 404);

  if (!canActOnOrderAsReceiver(auth.session, order)) {
    return apiError("Only the receiving region can accept this order", 403);
  }

  if (!canTransition(order.status, "ACCEPTED")) {
    return apiError(`Cannot accept an order in status ${order.status}`, 409);
  }

  const { data: updated, error: updErr } = await client
    .from("Order")
    .update({
      status: "ACCEPTED",
      acceptedAt: new Date().toISOString(),
      estimatedShipDate: ship.toISOString(),
      estimatedArrivalDate: arrival.toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (updErr) return apiError(updErr.message, 500);

  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: "ACCEPT",
    entity: "Order",
    entityId: id,
    metadata: {
      estimatedShipDate: ship.toISOString(),
      estimatedArrivalDate: arrival.toISOString(),
    },
  });
  if (auditErr) return apiError(auditErr.message, 500);

  await sendOrderStatusEmail({
    orderId: id,
    status: "ACCEPTED",
    actorId: auth.session.sub,
  });

  return apiOk(updated);
}
