import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { planningWindow } from "@/lib/calendar-planning";
import { sb } from "@/lib/sb";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarPlanner } from "./planner";
import type { CalendarOrder } from "@/components/calendar/types";
import type { Database } from "@/types/database";

type Location = Database["public"]["Enums"]["Location"];
type OrderStatus = Database["public"]["Enums"]["OrderStatus"];

export const dynamic = "force-dynamic";

interface OrderRow {
  id: string;
  orderNumber: string;
  type: string;
  containerNumber: string | null;
  airNumber: string | null;
  originLocation: string;
  destLocation: string;
  status: string;
  requestedDate: string | null;
  estimatedShipDate: string | null;
  estimatedArrivalDate: string | null;
  fillPercent: number | null;
  customer: { name: string } | null;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session, "calendar.read")) {
    return (
      <>
        <PageHeader title="Planning Calendar" />
        <Card className="p-10 text-center text-sm text-slate-500">
          You don't have access.
        </Card>
      </>
    );
  }

  const params = await searchParams;
  const rawOffset = parseInt(params.offset ?? "0", 10);
  const offset = isNaN(rawOffset) ? 0 : Math.max(-24, Math.min(24, rawOffset));

  const now = new Date();
  const shiftedNow = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const { start, end, months } = planningWindow(shiftedNow);

  // One order = one container. Load active container orders and bucket them
  // client-side by ship date (estimatedShipDate ?? requestedDate). At the app's
  // volume a single scoped fetch is simpler and cheaper than a range query.
  let q = sb()
    .from("Order")
    .select(
      "id, orderNumber, type, containerNumber, airNumber, originLocation, destLocation, status, requestedDate, estimatedShipDate, estimatedArrivalDate, fillPercent, customer:Customer(name)",
    )
    .is("archivedAt", null);

  // Location scoping mirrors the Orders list: non-super users only see orders
  // on a route touching their location.
  if (session.role !== "SUPER_ADMIN") {
    q = q.or(
      `originLocation.eq.${session.location},destLocation.eq.${session.location}`,
    );
  }

  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as unknown as OrderRow[];

  const startMs = start.getTime();
  const endMs = end.getTime();

  const initialOrders: CalendarOrder[] = rows
    .map((o): CalendarOrder | null => {
      const shipDate = o.estimatedShipDate ?? o.requestedDate;
      if (!shipDate) return null;
      const t = new Date(shipDate).getTime();
      if (Number.isNaN(t) || t < startMs || t > endMs) return null;
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        type: o.type,
        containerNumber: o.containerNumber,
        airNumber: o.airNumber,
        originLocation: o.originLocation as Location,
        destLocation: o.destLocation as Location,
        status: o.status as OrderStatus,
        shipDate,
        arrivalDate: o.estimatedArrivalDate,
        fillPercent: o.fillPercent,
        customerName: o.customer?.name ?? null,
      };
    })
    .filter((o): o is CalendarOrder => o !== null);

  return (
    <>
      <PageHeader
        title="Planning Calendar"
        description={`${months[0].label} → ${months[2].label} · Orders by ship date.`}
        actions={
          can(session, "orders.write") ? (
            <Link href="/orders/new">
              <Button>+ New Order</Button>
            </Link>
          ) : undefined
        }
      />

      <CalendarPlanner
        months={months}
        initialOrders={initialOrders}
        monthOffset={offset}
      />
    </>
  );
}
