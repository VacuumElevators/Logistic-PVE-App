import { sb } from "./sb";

export interface DashboardStats {
  totalOrders: number;
  draftOrders: number;
  inProcessOrders: number;
  approvedOrders: number;
  acceptedOrders: number;
  declinedOrders: number;
  dispatchedShipments: number;
  pendingBackorders: number;
  shipmentsThisMonth: number;
  shipmentsLastMonth: number;
}

export interface MonthlySeriesPoint {
  month: string; // ISO YYYY-MM
  label: string; // human label e.g. "Mar"
  shipments: number;
  delivered: number;
}

export interface ActivityEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  userName: string | null;
  userEmail: string | null;
  createdAt: Date;
  metadata: unknown;
}

export interface RecentOrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  type: string;
  status: string;
  originLocation: string;
  destLocation: string;
  createdAt: Date;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const startThisMonth = startOfMonth(now);
  const startLastMonth = new Date(
    startThisMonth.getFullYear(),
    startThisMonth.getMonth() - 1,
    1,
  );
  const client = sb();

  const [
    totalOrders,
    draftOrders,
    inProcessOrders,
    approvedOrders,
    acceptedOrders,
    declinedOrders,
    dispatchedShipments,
    pendingBackorders,
    shipmentsThisMonth,
    shipmentsLastMonth,
  ] = await Promise.all([
    client.from("Order").select("id", { count: "exact", head: true }),
    client.from("Order").select("id", { count: "exact", head: true }).eq("status", "DRAFT"),
    client.from("Order").select("id", { count: "exact", head: true }).eq("status", "IN_PROCESS"),
    client.from("Order").select("id", { count: "exact", head: true }).eq("status", "APPROVED"),
    client.from("Order").select("id", { count: "exact", head: true }).eq("status", "ACCEPTED"),
    client.from("Order").select("id", { count: "exact", head: true }).eq("status", "DECLINED"),
    client
      .from("Order")
      .select("id", { count: "exact", head: true })
      .eq("status", "DISPATCHED")
      .is("archivedAt", null),
    client
      .from("Backorder")
      .select("id", { count: "exact", head: true })
      .in("status", ["OPEN", "PARTIALLY_FULFILLED"]),
    client
      .from("Order")
      .select("id", { count: "exact", head: true })
      .gte("dispatchedAt", startThisMonth.toISOString()),
    client
      .from("Order")
      .select("id", { count: "exact", head: true })
      .gte("dispatchedAt", startLastMonth.toISOString())
      .lt("dispatchedAt", startThisMonth.toISOString()),
  ]);

  for (const r of [
    totalOrders,
    draftOrders,
    inProcessOrders,
    approvedOrders,
    acceptedOrders,
    declinedOrders,
    dispatchedShipments,
    pendingBackorders,
    shipmentsThisMonth,
    shipmentsLastMonth,
  ]) {
    if (r.error) throw r.error;
  }

  return {
    totalOrders: totalOrders.count ?? 0,
    draftOrders: draftOrders.count ?? 0,
    inProcessOrders: inProcessOrders.count ?? 0,
    approvedOrders: approvedOrders.count ?? 0,
    acceptedOrders: acceptedOrders.count ?? 0,
    declinedOrders: declinedOrders.count ?? 0,
    dispatchedShipments: dispatchedShipments.count ?? 0,
    pendingBackorders: pendingBackorders.count ?? 0,
    shipmentsThisMonth: shipmentsThisMonth.count ?? 0,
    shipmentsLastMonth: shipmentsLastMonth.count ?? 0,
  };
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export async function getMonthlyShipmentSeries(
  monthsBack = 6,
): Promise<MonthlySeriesPoint[]> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);

  const { data: shipped, error } = await sb()
    .from("Order")
    .select("dispatchedAt, deliveredAt")
    .gte("dispatchedAt", start.toISOString());
  if (error) throw error;

  // Initialize buckets for each month in the window.
  const series: MonthlySeriesPoint[] = [];
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    series.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: MONTH_LABELS[d.getMonth()],
      shipments: 0,
      delivered: 0,
    });
  }

  const indexFor = (d: Date) =>
    (d.getFullYear() - start.getFullYear()) * 12 +
    (d.getMonth() - start.getMonth());

  for (const o of shipped ?? []) {
    if (o.dispatchedAt) {
      const idx = indexFor(new Date(o.dispatchedAt));
      if (idx >= 0 && idx < series.length) series[idx].shipments += 1;
    }
    if (o.deliveredAt) {
      const idx = indexFor(new Date(o.deliveredAt));
      if (idx >= 0 && idx < series.length) series[idx].delivered += 1;
    }
  }
  return series;
}

export async function getRecentActivity(
  limit = 12,
): Promise<ActivityEntry[]> {
  const { data: logs, error } = await sb()
    .from("AuditLog")
    .select("id, action, entity, entityId, createdAt, metadata, user:User(name, email)")
    .order("createdAt", { ascending: false })
    .limit(limit);
  if (error) throw error;
  type Row = {
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    createdAt: string;
    metadata: unknown;
    user: { name: string; email: string } | null;
  };
  return ((logs ?? []) as unknown as Row[]).map((log) => ({
    id: log.id,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    userName: log.user?.name ?? null,
    userEmail: log.user?.email ?? null,
    createdAt: new Date(log.createdAt),
    metadata: log.metadata,
  }));
}

export async function getRecentOrders(
  limit = 6,
): Promise<RecentOrderRow[]> {
  const { data: orders, error } = await sb()
    .from("Order")
    .select(
      "id, orderNumber, type, status, originLocation, destLocation, createdAt, customer:Customer(name)",
    )
    .order("createdAt", { ascending: false })
    .limit(limit);
  if (error) throw error;
  type Row = {
    id: string;
    orderNumber: string;
    type: string;
    status: string;
    originLocation: string;
    destLocation: string;
    createdAt: string;
    customer: { name: string } | null;
  };
  return ((orders ?? []) as unknown as Row[]).map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customer?.name ?? "—",
    type: o.type,
    status: o.status,
    originLocation: o.originLocation,
    destLocation: o.destLocation,
    createdAt: new Date(o.createdAt),
  }));
}
