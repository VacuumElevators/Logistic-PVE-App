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

const PART_SELECT = "*, supplier:Supplier(id, name)";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "parts.read");
  if (forbidden) return forbidden;
  const { id } = await params;
  const { data: part, error } = await sb()
    .from("Part")
    .select(PART_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) return apiError(error.message, 500);
  if (!part) return apiError("Not found", 404);
  return apiOk(part);
}

const updateSchema = z
  .object({
    sku: z.string().min(1).max(60).optional(),
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    category: z.enum(PART_CATEGORIES).optional(),
    stockQty: z.number().int().min(0).optional(),
    reorderLevel: z.number().int().min(0).optional(),
    supplierId: z.string().nullable().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "No fields to update",
  });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "parts.write");
  if (forbidden) return forbidden;
  const { id } = await params;
  const client = sb();

  const { data: target, error: targetErr } = await client
    .from("Part")
    .select("id, sku")
    .eq("id", id)
    .maybeSingle();
  if (targetErr) return apiError(targetErr.message, 500);
  if (!target) return apiError("Not found", 404);

  const parsed = await parseJson(request, updateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  // SKU uniqueness check if changed.
  if (body.sku && body.sku !== target.sku) {
    const { data: dupe, error: dupeErr } = await client
      .from("Part")
      .select("id")
      .eq("sku", body.sku)
      .maybeSingle();
    if (dupeErr) return apiError(dupeErr.message, 500);
    if (dupe) return apiError("Part number already in use", 409);
  }

  const data: Record<string, unknown> = {};
  if (body.sku !== undefined) data.sku = body.sku.trim();
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.description !== undefined) data.description = body.description;
  if (body.category !== undefined) data.category = body.category;
  if (body.stockQty !== undefined) data.stockQty = body.stockQty;
  if (body.reorderLevel !== undefined) data.reorderLevel = body.reorderLevel;
  if (body.supplierId !== undefined) data.supplierId = body.supplierId || null;

  const { data: updated, error: updErr } = await client
    .from("Part")
    .update(data as never)
    .eq("id", id)
    .select(PART_SELECT)
    .single();
  if (updErr) return apiError(updErr.message, 500);

  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: "UPDATE",
    entity: "Part",
    entityId: id,
    metadata: { changes: Object.keys(body) },
  });
  if (auditErr) return apiError(auditErr.message, 500);

  return apiOk(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "parts.write");
  if (forbidden) return forbidden;
  const { id } = await params;
  const client = sb();

  const { data: target, error: targetErr } = await client
    .from("Part")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (targetErr) return apiError(targetErr.message, 500);
  if (!target) return apiError("Not found", 404);

  // Refuse if referenced anywhere.
  const [oiRes, boRes] = await Promise.all([
    client
      .from("OrderItem")
      .select("id", { count: "exact", head: true })
      .eq("partId", id),
    client
      .from("Backorder")
      .select("id", { count: "exact", head: true })
      .eq("partId", id),
  ]);
  if (oiRes.error) return apiError(oiRes.error.message, 500);
  if (boRes.error) return apiError(boRes.error.message, 500);

  const orderItems = oiRes.count ?? 0;
  const backorders = boRes.count ?? 0;
  if (orderItems > 0 || backorders > 0) {
    return apiError(
      `Cannot delete — ${orderItems} order item(s) and ${backorders} backorder(s) reference this part.`,
      409,
    );
  }

  const { error: delErr } = await client.from("Part").delete().eq("id", id);
  if (delErr) return apiError(delErr.message, 500);

  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: "DELETE",
    entity: "Part",
    entityId: id,
  });
  if (auditErr) return apiError(auditErr.message, 500);

  return apiOk({ ok: true });
}
