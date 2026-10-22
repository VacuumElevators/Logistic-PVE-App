// Origin-region "request modification" on a committed (APPROVED/ACCEPTED) order.
//
// Reopens the order in-place: status → DRAFT, key dates cleared, but
// `submittedAt` is preserved. The pre-modification state (items, status,
// dates) is snapshotted into AuditLog so the History card can render
// "this order was previously X" inline.
//
// Why `submittedAt` is preserved: the PATCH / DELETE routes gate
// post-modification edits on `submittedAt !== null && status === 'DRAFT'`.
// Items + notes remain editable; route, customer, and container stay locked.
//
// Sharp edge (documented, not handled): if the receiver DECLINEs the
// re-submitted modification, status becomes DECLINED and there is no
// automatic "revert to previous ACCEPTED state" path. The snapshot still
// lives in AuditLog metadata for manual inspection.

import { sb } from "@/lib/sb";
import {
  apiError,
  apiOk,
  requireApiSession,
  requireCap,
} from "@/lib/api";
import { canActOnOrderAsOrigin } from "@/lib/permissions";

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
      "id, status, originLocation, submittedAt, acceptedAt, approvedAt, approvedById, estimatedShipDate, estimatedArrivalDate, declinedAt, declineReason",
    )
    .eq("id", id)
    .maybeSingle();
  if (orderErr) return apiError(orderErr.message, 500);
  if (!order) return apiError("Order not found.", 404);

  if (order.status !== "APPROVED" && order.status !== "ACCEPTED") {
    return apiError(
      "Modification requests are only valid on APPROVED or ACCEPTED orders.",
      422,
    );
  }

  if (!canActOnOrderAsOrigin(auth.session, order)) {
    return apiError(
      "Only the origin region can request a modification on this order.",
      403,
    );
  }

  const { data: previousItems, error: itemsErr } = await client
    .from("OrderItem")
    .select("id, elevatorModelId, partId, description, quantity, configJson")
    .eq("orderId", id);
  if (itemsErr) return apiError(itemsErr.message, 500);

  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: "REQUEST_MODIFICATION",
    entity: "Order",
    entityId: id,
    metadata: {
      previousStatus: order.status,
      previousItems: previousItems ?? [],
      previousSubmittedAt: order.submittedAt,
      previousAcceptedAt: order.acceptedAt,
      previousApprovedAt: order.approvedAt,
      previousApprovedById: order.approvedById,
      previousEstimatedShipDate: order.estimatedShipDate,
      previousEstimatedArrivalDate: order.estimatedArrivalDate,
      previousDeclinedAt: order.declinedAt,
      previousDeclineReason: order.declineReason,
    },
  });
  if (auditErr) return apiError(auditErr.message, 500);

  const { data: updated, error: updErr } = await client
    .from("Order")
    .update({
      status: "DRAFT",
      acceptedAt: null,
      approvedAt: null,
      approvedById: null,
      estimatedShipDate: null,
      estimatedArrivalDate: null,
      declinedAt: null,
      declineReason: null,
    })
    .eq("id", id)
    .select()
    .single();
  if (updErr) return apiError(updErr.message, 500);

  return apiOk(updated);
}
