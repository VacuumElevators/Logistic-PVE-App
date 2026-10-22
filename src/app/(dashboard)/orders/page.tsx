import Link from "next/link";
import { redirect } from "next/navigation";
import { sb } from "@/lib/sb";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { OrderFilterBar } from "@/components/orders/order-filter-bar";
import {
  OrdersTable,
  type OrderTableRow,
} from "@/components/orders/orders-table";
import { LOCATIONS } from "@/lib/constants";
import { locationLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUSES = [
  "DRAFT",
  "IN_PROCESS",
  "APPROVED",
  "ACCEPTED",
  "DECLINED",
  "DISPATCHED",
  "DELIVERED",
] as const;

interface OrderRow {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  submittedAt: string | null;
  originLocation: string;
  destLocation: string;
  customer: { name: string } | null;
  containerNumber: string | null;
  airNumber: string | null;
  items: Array<{ id: string }>;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    location?: string;
    page?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session, "orders.read")) {
    return (
      <>
        <PageHeader title="Orders" />
        <Card className="p-10 text-center text-sm text-slate-500">
          You don't have access.
        </Card>
      </>
    );
  }

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pageSize = 20;
  const client = sb();

  let q = client
    .from("Order")
    .select(
      "*, customer:Customer(*), items:OrderItem(id)",
      { count: "exact" },
    )
    .order("createdAt", { ascending: false });

  if (sp.status && (STATUSES as readonly string[]).includes(sp.status)) {
    q = q.eq("status", sp.status as (typeof STATUSES)[number]);
  }

  // Location and search are independent constraints: each is its own group so
  // PostgREST ANDs them together. Folding both into one .or() made the location
  // disjunct (which matches every order at that location) swallow the search.
  if (sp.location && (LOCATIONS as readonly string[]).includes(sp.location)) {
    q = q.or(`originLocation.eq.${sp.location},destLocation.eq.${sp.location}`);
  }
  if (sp.search) {
    q = q.ilike("orderNumber", `%${sp.search}%`);
  }

  if (session.role !== "SUPER_ADMIN") {
    q = q.or(
      `originLocation.eq.${session.location},destLocation.eq.${session.location}`,
    );
  }

  const skip = (page - 1) * pageSize;
  const { data: ordersData, count, error } = await q.range(skip, skip + pageSize - 1);
  if (error) throw error;
  const orders = (ordersData ?? []) as unknown as OrderRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const counts: Record<string, number> = {};
  await Promise.all(
    STATUSES.map(async (s) => {
      let cq = client
        .from("Order")
        .select("id", { count: "exact", head: true })
        .eq("status", s);
      if (session.role !== "SUPER_ADMIN") {
        cq = cq.or(
          `originLocation.eq.${session.location},destLocation.eq.${session.location}`,
        );
      }
      const { count: c, error: cErr } = await cq;
      if (cErr) throw cErr;
      counts[s] = c ?? 0;
    }),
  );

  const tableRows: OrderTableRow[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    type: o.type,
    shipmentLabel:
      o.type === "AIRFREIGHT"
        ? (o.airNumber ?? "—")
        : (o.containerNumber ?? "—"),
    customerName: o.customer?.name ?? "—",
    routeLabel: `${locationLabel(o.originLocation)} → ${locationLabel(o.destLocation)}`,
    itemCount: o.items.length,
    submittedAt: o.submittedAt,
    status: o.status,
  }));

  return (
    <>
      <PageHeader
        title="Orders"
        description="Orders across all locations."
        actions={
          can(session, "orders.write") ? (
            <Link href="/orders/new">
              <Button>+ New Order</Button>
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/orders?status=${s}`}
            className="rounded-xl border border-slate-200 bg-white p-3 transition hover:shadow-sm"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {s}
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-semibold text-slate-900">
                {counts[s] ?? 0}
              </span>
              <StatusBadge kind="order" status={s} />
            </div>
          </Link>
        ))}
      </div>

      <OrderFilterBar showLocationFilter={session.role === "SUPER_ADMIN"} />

      <div className="space-y-3">
        <OrdersTable rows={tableRows} />
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
        />
      </div>
    </>
  );
}
