import Link from "next/link";
import { redirect } from "next/navigation";
import { sb } from "@/lib/sb";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { PartFilterBar } from "@/components/parts/part-filter-bar";
import { CsvImportButton } from "@/components/parts/csv-import-dialog";
import { PartsTable, type PartRow } from "@/components/parts/parts-table";
import {
  PART_CATEGORIES,
  PART_CATEGORY_COLOR,
  type PartCategory,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PartsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    category?: string;
    low?: string;
    page?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session, "parts.read")) {
    return (
      <>
        <PageHeader title="Parts" />
        <Card className="p-10 text-center text-sm text-slate-500">
          You don't have access.
        </Card>
      </>
    );
  }

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pageSize = 20;
  const canWrite = can(session, "parts.write");
  const client = sb();

  let parts: PartRow[];
  let total: number;

  if (sp.low === "1") {
    // Stock-vs-reorder must be done in app code (Supabase can't compare columns).
    let q = client
      .from("Part")
      .select("*, supplier:Supplier(id, name)")
      .order("sku", { ascending: true });
    if (sp.category && (PART_CATEGORIES as readonly string[]).includes(sp.category)) {
      q = q.eq("category", sp.category);
    }
    if (sp.search) {
      q = q.or(
        `sku.ilike.%${sp.search}%,name.ilike.%${sp.search}%,description.ilike.%${sp.search}%`,
      );
    }
    const { data, error } = await q;
    if (error) throw error;
    const all = (data ?? []) as unknown as PartRow[];
    const low = all.filter((p) => p.stockQty <= p.reorderLevel);
    total = low.length;
    parts = low.slice((page - 1) * pageSize, page * pageSize);
  } else {
    let q = client
      .from("Part")
      .select("*, supplier:Supplier(id, name)", { count: "exact" })
      .order("sku", { ascending: true });
    if (sp.category && (PART_CATEGORIES as readonly string[]).includes(sp.category)) {
      q = q.eq("category", sp.category);
    }
    if (sp.search) {
      q = q.or(
        `sku.ilike.%${sp.search}%,name.ilike.%${sp.search}%,description.ilike.%${sp.search}%`,
      );
    }
    const skip = (page - 1) * pageSize;
    const { data, count, error } = await q.range(skip, skip + pageSize - 1);
    if (error) throw error;
    parts = (data ?? []) as unknown as PartRow[];
    total = count ?? 0;
  }

  // Per-category counts for the summary strip. Backed by the
  // "PartCategoryCount" view (migration 0012) — one query instead of eight.
  const { data: countsData, error: countsErr } = await client
    .from("PartCategoryCount")
    .select("*");
  if (countsErr) throw countsErr;
  const countByCategory: Record<string, number> = {};
  for (const cat of PART_CATEGORIES) countByCategory[cat] = 0;
  for (const row of countsData ?? []) {
    if (row.category) countByCategory[row.category] = row.count ?? 0;
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <PageHeader
        title="Replacement Parts"
        description="Catalog of replacement parts across all PVE products."
        actions={
          canWrite ? (
            <div className="flex gap-2">
              <CsvImportButton />
              <Link href="/parts/new">
                <Button>+ Add Part</Button>
              </Link>
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {PART_CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/parts?category=${encodeURIComponent(cat)}`}
            className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-sm"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {cat}
            </p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-2xl font-semibold text-slate-900">
                {countByCategory[cat] ?? 0}
              </span>
              <Badge className={PART_CATEGORY_COLOR[cat as PartCategory]}>
                {cat.split(" ")[0]}
              </Badge>
            </div>
          </Link>
        ))}
      </div>

      <PartFilterBar />

      <Card className="overflow-hidden">
        <PartsTable parts={parts} canWrite={canWrite} />
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
        />
      </Card>
    </>
  );
}
