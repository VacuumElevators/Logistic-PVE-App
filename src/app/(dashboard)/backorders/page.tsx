import { sb } from "@/lib/sb";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, EmptyRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, locationLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface BackorderRow {
  id: string;
  qtyRequested: number;
  qtyFulfilled: number;
  expectedDate: string | null;
  location: string;
  status: string;
  order: { orderNumber: string };
  part: { name: string; sku: string };
}

export default async function BackordersPage() {
  const { data, error } = await sb()
    .from("Backorder")
    .select("*, order:Order(orderNumber), part:Part(name, sku)")
    .order("createdAt", { ascending: false });
  if (error) throw error;
  const backorders = (data ?? []) as unknown as BackorderRow[];

  return (
    <>
      <PageHeader
        title="Backorders"
        description="Track parts and elevators awaiting fulfillment."
      />

      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Order</TH>
              <TH>Part</TH>
              <TH>Location</TH>
              <TH className="text-right">Requested</TH>
              <TH className="text-right">Fulfilled</TH>
              <TH>Expected</TH>
              <TH>Status</TH>
            </tr>
          </THead>
          <TBody>
            {backorders.length === 0 && <EmptyRow colSpan={7} />}
            {backorders.map((b) => (
              <TR key={b.id}>
                <TD className="font-medium text-slate-900">
                  {b.order.orderNumber}
                </TD>
                <TD>
                  <p className="text-slate-900">{b.part.name}</p>
                  <p className="text-xs text-slate-500">{b.part.sku}</p>
                </TD>
                <TD className="text-xs text-slate-500">
                  {locationLabel(b.location)}
                </TD>
                <TD className="text-right">{b.qtyRequested}</TD>
                <TD className="text-right">{b.qtyFulfilled}</TD>
                <TD className="text-xs text-slate-500">
                  {formatDate(b.expectedDate)}
                </TD>
                <TD>
                  <StatusBadge kind="backorder" status={b.status} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </>
  );
}
