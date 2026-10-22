import Link from "next/link";
import {
  ShoppingCart,
  FileText,
  Container as ContainerIcon,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Truck,
  Send,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  EmptyRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { MonthlyShipmentChart } from "@/components/dashboard/monthly-shipment-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { NotificationsPanel } from "@/components/dashboard/notifications-panel";
import { LocationsOverview } from "@/components/dashboard/locations-overview";
import {
  getDashboardStats,
  getMonthlyShipmentSeries,
  getRecentActivity,
  getRecentOrders,
} from "@/lib/dashboard";
import { listLocationsWithStats } from "@/lib/locations";
import { formatDate, locationLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

function deltaLabel(current: number, previous: number) {
  if (previous === 0) {
    return current > 0
      ? { value: `+${current} this month`, positive: true }
      : { value: "No shipments yet", positive: false };
  }
  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  const sign = diff >= 0 ? "+" : "";
  return {
    value: `${sign}${pct}% vs last month`,
    positive: diff >= 0,
  };
}

export default async function DashboardPage() {
  const [stats, monthly, activity, recentOrders, locations] = await Promise.all([
    getDashboardStats(),
    getMonthlyShipmentSeries(6),
    getRecentActivity(10),
    getRecentOrders(6),
    listLocationsWithStats(),
  ]);

  const shipmentDelta = deltaLabel(
    stats.shipmentsThisMonth,
    stats.shipmentsLastMonth,
  );

  return (
    <>
      <PageHeader
        title="Operations Dashboard"
        description="Real-time overview across Argentina, USA, Spain and India."
        actions={
          <Link href="/orders/new">
            <Button>+ New Order</Button>
          </Link>
        }
      />

      {/* KPI grid — 8 cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Orders"
          value={stats.totalOrders}
          icon={<ShoppingCart className="h-5 w-5" />}
          accent="brand"
        />
        <StatCard
          label="Draft Orders"
          value={stats.draftOrders}
          icon={<FileText className="h-5 w-5" />}
          accent="amber"
        />
        <StatCard
          label="In Process"
          value={stats.inProcessOrders}
          icon={<Send className="h-5 w-5" />}
          accent="sky"
        />
        <StatCard
          label="Accepted Orders"
          value={stats.acceptedOrders}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="emerald"
        />
        <StatCard
          label="Declined Orders"
          value={stats.declinedOrders}
          icon={<XCircle className="h-5 w-5" />}
          accent="rose"
        />
        <StatCard
          label="Dispatched Shipments"
          value={stats.dispatchedShipments}
          icon={<ContainerIcon className="h-5 w-5" />}
          accent="sky"
        />
        <StatCard
          label="Pending Backorders"
          value={stats.pendingBackorders}
          icon={<AlertCircle className="h-5 w-5" />}
          accent="rose"
        />
        <StatCard
          label="Shipments This Month"
          value={stats.shipmentsThisMonth}
          icon={<Truck className="h-5 w-5" />}
          accent="emerald"
          delta={shipmentDelta}
        />
      </div>

      <LocationsOverview locations={locations} />

      {/* Chart + Activity feed */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Monthly Shipments</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Last 6 months — shipped vs delivered
              </p>
            </div>
            <Link
              href="/calendar"
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              View calendar →
            </Link>
          </CardHeader>
          <MonthlyShipmentChart data={monthly} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <ActivityFeed entries={activity} />
        </Card>
      </div>

      {/* Recent orders + Notifications panel */}
      <div className="grid gap-6 lg:grid-cols-3" id="notifications">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Link
              href="/orders"
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              View all →
            </Link>
          </CardHeader>
          <Table>
            <THead>
              <tr>
                <TH>Order #</TH>
                <TH>Customer</TH>
                <TH>Route</TH>
                <TH>Date</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {recentOrders.length === 0 && <EmptyRow colSpan={5} />}
              {recentOrders.map((o) => (
                <TR key={o.id}>
                  <TD>
                    <Link
                      href={`/orders/${o.id}`}
                      className="font-medium text-slate-900 hover:text-brand-600"
                    >
                      {o.orderNumber}
                    </Link>
                  </TD>
                  <TD>{o.customerName}</TD>
                  <TD className="text-xs text-slate-500">
                    {locationLabel(o.originLocation)} →{" "}
                    {locationLabel(o.destLocation)}
                  </TD>
                  <TD className="text-xs text-slate-500">
                    {formatDate(o.createdAt)}
                  </TD>
                  <TD>
                    <StatusBadge kind="order" status={o.status} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>

        <Card className="overflow-hidden">
          <NotificationsPanel />
        </Card>
      </div>
    </>
  );
}
