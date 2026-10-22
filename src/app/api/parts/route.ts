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

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "parts.read");
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const category = url.searchParams.get("category") ?? undefined;
  const lowOnly = url.searchParams.get("low") === "1";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const pageSize = 20;
  const client = sb();

  if (lowOnly) {
    // Stock at or below reorder level. Supabase doesn't support column-to-column
    // comparison in filters, so we filter in JS after fetching matching rows.
    let q = client.from("Part").select(PART_SELECT).order("sku", { ascending: true });
    if (category && (PART_CATEGORIES as readonly string[]).includes(category)) {
      q = q.eq("category", category);
    }
    if (search) {
      q = q.or(
        `sku.ilike.%${search}%,name.ilike.%${search}%,description.ilike.%${search}%`,
      );
    }
    const { data: all, error } = await q;
    if (error) return apiError(error.message, 500);
    const low = (all ?? []).filter(
      (p) => (p as { stockQty: number; reorderLevel: number }).stockQty <=
        (p as { stockQty: number; reorderLevel: number }).reorderLevel,
    );
    return apiOk({
      parts: low.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: low.length,
      totalPages: Math.max(1, Math.ceil(low.length / pageSize)),
    });
  }

  let q = client
    .from("Part")
    .select(PART_SELECT, { count: "exact" })
    .order("sku", { ascending: true });
  if (category && (PART_CATEGORIES as readonly string[]).includes(category)) {
    q = q.eq("category", category);
  }
  if (search) {
    q = q.or(
      `sku.ilike.%${search}%,name.ilike.%${search}%,description.ilike.%${search}%`,
    );
  }
  const skip = (page - 1) * pageSize;
  const { data: parts, count, error } = await q.range(skip, skip + pageSize - 1);
  if (error) return apiError(error.message, 500);
  const total = count ?? 0;

  return apiOk({
    parts: parts ?? [],
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

const createSchema = z.object({
  sku: z.string().min(1).max(60),
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  category: z.enum(PART_CATEGORIES),
  stockQty: z.number().int().min(0).default(0),
  reorderLevel: z.number().int().min(0).default(0),
  supplierId: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "parts.write");
  if (forbidden) return forbidden;

  const parsed = await parseJson(request, createSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;
  const client = sb();

  const { data: existing, error: existingErr } = await client
    .from("Part")
    .select("id")
    .eq("sku", body.sku)
    .maybeSingle();
  if (existingErr) return apiError(existingErr.message, 500);
  if (existing) return apiError("Part number already exists", 409);

  const { data: created, error: createErr } = await client
    .from("Part")
    .insert({
      sku: body.sku.trim(),
      name: body.name.trim(),
      description: body.description ?? null,
      category: body.category,
      stockQty: body.stockQty,
      reorderLevel: body.reorderLevel,
      supplierId: body.supplierId || null,
    })
    .select(PART_SELECT)
    .single();
  if (createErr) return apiError(createErr.message, 500);

  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: "CREATE",
    entity: "Part",
    entityId: (created as { id: string }).id,
  });
  if (auditErr) return apiError(auditErr.message, 500);

  return apiOk(created, { status: 201 });
}
