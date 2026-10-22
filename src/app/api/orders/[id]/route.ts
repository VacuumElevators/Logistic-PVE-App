import { z } from "zod";
import { sb } from "@/lib/sb";
import {
  apiError,
  apiOk,
  parseJson,
  requireApiSession,
  requireCap,
} from "@/lib/api";
import { LOCATIONS } from "@/lib/constants";

const itemSchema = z
  .object({
    kind: z.enum(["ELEVATOR", "PART", "GENERAL"]),
    refId: z.string().min(1).optional(),
    description: z.string().min(1),
    quantity: z.number().int().positive(),
    configJson: z
      .unknown()
      .nullable()
      .optional()
      .refine(
        (v) => v == null || JSON.stringify(v).length < 5000,
        { message: "configJson too large (>5KB)" },
      ),
  })
  .refine((v) => v.kind === "GENERAL" || !!v.refId, {
    message: "refId required for ELEVATOR / PART items",
    path: ["refId"],
  });

const updateSchema = z
  .object({
    customerId: z.string().nullable().optional(),
    originLocation: z.enum(LOCATIONS).optional(),
    destLocation: z.enum(LOCATIONS).optional(),
    requestedDate: z.string().nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
    items: z.array(itemSchema).min(1).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "No fields to update",
  });

const ORDER_SELECT =
  "*, customer:Customer(*), createdBy:User!Order_createdById_fkey(id, name, email), items:OrderItem(*, elevatorModel:ElevatorModel(*), part:Part(*))";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "orders.read");
  if (forbidden) return forbidden;
  const { id } = await params;
  const { data: order, error } = await sb()
    .from("Order")
    .select(ORDER_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) return apiError(error.message, 500);
  if (!order) return apiError("Not found", 404);
  return apiOk(order);
}

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

  const { data: target, error: targetErr } = await client
    .from("Order")
    .select("id, status, submittedAt")
    .eq("id", id)
    .maybeSingle();
  if (targetErr) return apiError(targetErr.message, 500);
  if (!target) return apiError("Not found", 404);
  if (target.status !== "DRAFT") {
    return apiError(
      "Only DRAFT orders can be edited. Use workflow actions to advance state.",
      409,
    );
  }

  const parsed = await parseJson(request, updateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  // Post-modification DRAFT (submittedAt set) restricts mutable fields to
  // items + notes — route, customer, requestedDate stay locked from the
  // original commit. Never-submitted DRAFTs (submittedAt null) allow all.
  const isPostModification = target.submittedAt !== null;
  if (isPostModification) {
    const disallowed: Array<keyof typeof body> = [
      "customerId",
      "originLocation",
      "destLocation",
      "requestedDate",
    ];
    for (const f of disallowed) {
      if (body[f] !== undefined) {
        return apiError(
          `Field '${String(f)}' cannot be changed during a modification.`,
          422,
        );
      }
    }
  }

  const data: Record<string, unknown> = {};
  if (body.customerId !== undefined) data.customerId = body.customerId;
  if (body.originLocation !== undefined) data.originLocation = body.originLocation;
  if (body.destLocation !== undefined) data.destLocation = body.destLocation;
  if (body.requestedDate !== undefined) {
    data.requestedDate = body.requestedDate
      ? new Date(body.requestedDate).toISOString()
      : null;
  }
  if (body.notes !== undefined) data.notes = body.notes;

  if (body.items) {
    const { error: delErr } = await client
      .from("OrderItem")
      .delete()
      .eq("orderId", id);
    if (delErr) return apiError(delErr.message, 500);
    const { error: insErr } = await client.from("OrderItem").insert(
      body.items.map((i) => ({
        orderId: id,
        elevatorModelId: i.kind === "ELEVATOR" ? i.refId ?? null : null,
        partId: i.kind === "PART" ? i.refId ?? null : null,
        description: i.description,
        quantity: i.quantity,
        configJson: (i.configJson ?? null) as never,
      })),
    );
    if (insErr) return apiError(insErr.message, 500);
  }

  const { data: updated, error: updErr } = await client
    .from("Order")
    .update(data as never)
    .eq("id", id)
    .select("*, customer:Customer(*), items:OrderItem(*)")
    .single();
  if (updErr) return apiError(updErr.message, 500);

  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: "UPDATE",
    entity: "Order",
    entityId: id,
    metadata: { changes: Object.keys(body) },
  });
  if (auditErr) return apiError(auditErr.message, 500);

  return apiOk(updated);
}

// Admin order deletion (orders.delete = LOCATION_ADMIN / SUPER_ADMIN).
// A never-submitted DRAFT is hard-deleted (cascades to OrderItem) since it has
// no meaningful history. A submitted/real order is soft-deleted (archived):
// its row + AuditLog are preserved for the audit trail and it is hidden from
// the order list.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "orders.delete");
  if (forbidden) return forbidden;
  const { id } = await params;
  const client = sb();

  const { data: target, error: targetErr } = await client
    .from("Order")
    .select("id, status, submittedAt, archivedAt")
    .eq("id", id)
    .maybeSingle();
  if (targetErr) return apiError(targetErr.message, 500);
  if (!target) return apiError("Not found", 404);

  const isNeverSubmittedDraft =
    target.status === "DRAFT" && target.submittedAt === null;

  if (isNeverSubmittedDraft) {
    const { error: delErr } = await client.from("Order").delete().eq("id", id);
    if (delErr) return apiError(delErr.message, 500);
    const { error: auditErr } = await client.from("AuditLog").insert({
      userId: auth.session.sub,
      action: "DELETE",
      entity: "Order",
      entityId: id,
    });
    if (auditErr) return apiError(auditErr.message, 500);
    return apiOk({ ok: true, deleted: true });
  }

  if (target.archivedAt) return apiOk({ ok: true, archived: true });

  const { error: archErr } = await client
    .from("Order")
    .update({ archivedAt: new Date().toISOString() })
    .eq("id", id);
  if (archErr) return apiError(archErr.message, 500);
  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: "ARCHIVE",
    entity: "Order",
    entityId: id,
  });
  if (auditErr) return apiError(auditErr.message, 500);
  return apiOk({ ok: true, archived: true });
}
