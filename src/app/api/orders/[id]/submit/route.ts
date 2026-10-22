import { sb } from "@/lib/sb";
import {
  apiError,
  apiOk,
  requireApiSession,
  requireCap,
} from "@/lib/api";
import { canTransition } from "@/lib/order-workflow";
import { assignContainerNumber, assignAirNumber } from "@/lib/calendar-planning";
import { sendOrderStatusEmail } from "@/lib/order-emails";

export async function POST(
  _request: Request,
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
    .select(
      "id, type, status, submittedAt, originLocation, destLocation, containerNumber, airNumber, items:OrderItem(id)",
    )
    .eq("id", id)
    .maybeSingle();
  if (orderErr) return apiError(orderErr.message, 500);
  if (!order) return apiError("Not found", 404);
  if (!canTransition(order.status, "IN_PROCESS")) {
    return apiError(`Cannot submit an order in status ${order.status}`, 409);
  }
  const items = (order as unknown as { items: Array<{ id: string }> }).items;
  if (items.length === 0) {
    return apiError("Cannot submit an order with no line items", 422);
  }

  // Claim the per-route shipment number at submit. Done before the status flip
  // so a failure leaves a clean DRAFT to re-submit; idempotent, so a
  // modification re-submit keeps its existing number. Container orders get a
  // C-number, airfreight orders an A-number.
  try {
    if (order.type === "AIRFREIGHT") {
      await assignAirNumber(client, order);
    } else {
      await assignContainerNumber(client, order);
    }
  } catch (e) {
    return apiError(
      e instanceof Error ? e.message : "Could not assign a shipment number.",
      500,
    );
  }

  // Preserve original submittedAt on modification re-submit. The re-submit's
  // own timestamp lives in the AuditLog SUBMIT row inserted below.
  const update: Record<string, unknown> = { status: "IN_PROCESS" };
  if (order.submittedAt === null) {
    update.submittedAt = new Date().toISOString();
  }

  const { data: updated, error: updErr } = await client
    .from("Order")
    .update(update as never)
    .eq("id", id)
    .select()
    .single();
  if (updErr) return apiError(updErr.message, 500);

  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: "SUBMIT",
    entity: "Order",
    entityId: id,
  });
  if (auditErr) return apiError(auditErr.message, 500);

  await sendOrderStatusEmail({
    orderId: id,
    status: "IN_PROCESS",
    actorId: auth.session.sub,
  });

  return apiOk(updated);
}
