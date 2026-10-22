import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { sb } from "@/lib/sb";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PartForm } from "@/components/parts/part-form";
import { PART_CATEGORY_COLOR, type PartCategory } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PartDetail {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  stockQty: number;
  reorderLevel: number;
  supplierId: string | null;
  createdAt: string;
  updatedAt: string;
  supplier: { id: string; name: string } | null;
}

export default async function PartDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session, "parts.read")) {
    return (
      <Card className="p-10 text-center text-sm text-slate-500">
        You don't have access.
      </Card>
    );
  }

  const { id } = await params;
  const client = sb();
  const [partRes, suppliersRes, oiRes, boRes] = await Promise.all([
    client
      .from("Part")
      .select("*, supplier:Supplier(id, name)")
      .eq("id", id)
      .maybeSingle(),
    client
      .from("Supplier")
      .select("id, name")
      .order("name", { ascending: true }),
    client
      .from("OrderItem")
      .select("id", { count: "exact", head: true })
      .eq("partId", id),
    client
      .from("Backorder")
      .select("id", { count: "exact", head: true })
      .eq("partId", id),
  ]);
  if (partRes.error) throw partRes.error;
  if (!partRes.data) notFound();
  if (suppliersRes.error) throw suppliersRes.error;
  if (oiRes.error) throw oiRes.error;
  if (boRes.error) throw boRes.error;

  const part = partRes.data as unknown as PartDetail;
  const suppliers = suppliersRes.data ?? [];
  const orderItems = oiRes.count ?? 0;
  const backorders = boRes.count ?? 0;
  const canWrite = can(session, "parts.write");
  const low = part.stockQty <= part.reorderLevel;

  return (
    <>
      <Link
        href="/parts"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" /> Back to parts
      </Link>

      <PageHeader
        title={part.name}
        description={part.sku}
        actions={
          <div className="flex items-center gap-2">
            <Badge
              className={
                PART_CATEGORY_COLOR[part.category as PartCategory] ??
                "bg-slate-100 text-slate-700"
              }
            >
              {part.category}
            </Badge>
            {low ? (
              <Badge className="bg-rose-50 text-rose-700">Reorder</Badge>
            ) : (
              <Badge className="bg-emerald-50 text-emerald-700">In stock</Badge>
            )}
          </div>
        }
      />

      {!canWrite ? (
        <Card className="p-6 text-sm text-slate-500">
          You can view this part but cannot make changes.
        </Card>
      ) : (
        <PartForm
          mode="edit"
          partId={part.id}
          suppliers={suppliers}
          initial={{
            sku: part.sku,
            name: part.name,
            description: part.description ?? "",
            category: part.category as PartCategory,
            stockQty: part.stockQty,
            reorderLevel: part.reorderLevel,
            supplierId: part.supplierId ?? "",
          }}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
          </CardHeader>
          <div className="px-6 pb-6 space-y-2 text-sm">
            <UsageRow label="Order items referencing this part" value={orderItems} />
            <UsageRow label="Open backorders" value={backorders} />
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Audit</CardTitle>
          </CardHeader>
          <div className="px-6 pb-6 space-y-2 text-sm">
            <UsageRow label="Created" value={formatDate(part.createdAt)} />
            <UsageRow label="Last updated" value={formatDate(part.updatedAt)} />
            <UsageRow
              label="Supplier"
              value={part.supplier?.name ?? "—"}
            />
          </div>
        </Card>
      </div>
    </>
  );
}

function UsageRow({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex justify-between border-b border-slate-100 last:border-0 py-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
