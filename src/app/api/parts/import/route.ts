import { z } from "zod";
import { sb } from "@/lib/sb";
import {
  apiError,
  apiOk,
  parseJson,
  requireApiSession,
  requireCap,
} from "@/lib/api";
import { parseCsv } from "@/lib/csv";
import { PART_CATEGORIES } from "@/lib/constants";

const REQUIRED_HEADERS = ["sku", "name", "category"] as const;
const ROW_LIMIT = 2000;

const requestSchema = z.object({
  csv: z.string().min(1).max(2_000_000),
  mode: z.enum(["create", "upsert"]).default("upsert"),
});

interface RowError {
  row: number;
  message: string;
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: RowError[];
}

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "parts.write");
  if (forbidden) return forbidden;

  const parsed = await parseJson(request, requestSchema);
  if ("error" in parsed) return parsed.error;
  const { csv, mode } = parsed.data;

  const { headers, rows } = parseCsv(csv);
  if (rows.length === 0) return apiError("CSV is empty", 400);
  if (rows.length > ROW_LIMIT) {
    return apiError(`Too many rows (max ${ROW_LIMIT})`, 413);
  }

  const missing = REQUIRED_HEADERS.filter(
    (h) => !headers.map((x) => x.toLowerCase()).includes(h),
  );
  if (missing.length > 0) {
    return apiError(
      `CSV is missing required column(s): ${missing.join(", ")}`,
      400,
    );
  }

  const result: ImportResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };
  const client = sb();

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const row: Record<string, string> = {};
    Object.entries(raw).forEach(([k, v]) => {
      row[k.trim().toLowerCase()] = v;
    });

    const sku = row.sku?.trim();
    const name = row.name?.trim();
    const category = row.category?.trim();

    const rowNo = i + 2; // human row (header is 1)

    if (!sku || !name || !category) {
      result.errors.push({
        row: rowNo,
        message: "Missing required field (sku, name, category)",
      });
      result.skipped++;
      continue;
    }
    if (!(PART_CATEGORIES as readonly string[]).includes(category)) {
      result.errors.push({
        row: rowNo,
        message: `Invalid category "${category}". Allowed: ${PART_CATEGORIES.join(" | ")}`,
      });
      result.skipped++;
      continue;
    }

    const description = row.description?.trim() || null;
    const stockQty = row.quantity
      ? Number(row.quantity)
      : row.stockqty
        ? Number(row.stockqty)
        : 0;
    const reorderLevel = row.reorderlevel ? Number(row.reorderlevel) : 0;

    if (Number.isNaN(stockQty) || Number.isNaN(reorderLevel)) {
      result.errors.push({
        row: rowNo,
        message: "Non-numeric value in quantity/reorder column",
      });
      result.skipped++;
      continue;
    }

    try {
      const { data: existing, error: existingErr } = await client
        .from("Part")
        .select("id")
        .eq("sku", sku)
        .maybeSingle();
      if (existingErr) throw existingErr;
      if (existing) {
        if (mode === "create") {
          result.skipped++;
          continue;
        }
        const { error: updErr } = await client
          .from("Part")
          .update({
            name,
            description,
            category,
            stockQty,
            reorderLevel,
          })
          .eq("sku", sku);
        if (updErr) throw updErr;
        result.updated++;
      } else {
        const { error: insErr } = await client.from("Part").insert({
          sku,
          name,
          description,
          category,
          stockQty,
          reorderLevel,
        });
        if (insErr) throw insErr;
        result.imported++;
      }
    } catch (err) {
      result.errors.push({
        row: rowNo,
        message:
          err instanceof Error ? err.message : "Database error processing row",
      });
      result.skipped++;
    }
  }

  const { error: auditErr } = await sb().from("AuditLog").insert({
    userId: auth.session.sub,
    action: "IMPORT",
    entity: "Part",
    metadata: {
      imported: result.imported,
      updated: result.updated,
      skipped: result.skipped,
      errorCount: result.errors.length,
    },
  });
  if (auditErr) return apiError(auditErr.message, 500);

  return apiOk(result);
}
