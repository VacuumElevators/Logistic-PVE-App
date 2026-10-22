"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Truck,
  PackageCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  CalendarDays,
  Search,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { MonthGrid } from "@/components/calendar/month-grid";
import { WeekView } from "@/components/calendar/week-view";
import type { CalendarOrder } from "@/components/calendar/types";
import { LOCATION_META, LOCATIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Month {
  year: number;
  month: number;
  label: string;
}

interface Props {
  months: Month[];
  initialOrders: CalendarOrder[];
  monthOffset: number;
}

type ViewMode = "month" | "week";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "IN_PROCESS", label: "In process" },
  { value: "APPROVED", label: "Approved" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "DISPATCHED", label: "Dispatched" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "DECLINED", label: "Declined" },
];

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = (day + 6) % 7; // Mon = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
}

export function CalendarPlanner({ months, initialOrders, monthOffset }: Props) {
  const router = useRouter();
  const [orders, setOrders] = React.useState<CalendarOrder[]>(initialOrders);

  // Filters
  const [filterOrigin, setFilterOrigin] = React.useState<string>("");
  const [filterDest, setFilterDest] = React.useState<string>("");
  const [filterStatus, setFilterStatus] = React.useState<string>("");
  const [filterNumber, setFilterNumber] = React.useState<string>("");

  // View
  const [view, setView] = React.useState<ViewMode>("month");
  const [weekStart, setWeekStart] = React.useState<Date>(() =>
    startOfWeek(new Date()),
  );

  React.useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const filtered = React.useMemo(() => {
    return orders.filter((o) => {
      if (filterOrigin && o.originLocation !== filterOrigin) return false;
      if (filterDest && o.destLocation !== filterDest) return false;
      if (filterStatus && o.status !== filterStatus) return false;
      if (filterNumber.trim()) {
        const needle = filterNumber.trim().toLowerCase();
        const container = (o.containerNumber ?? "").toLowerCase();
        const air = (o.airNumber ?? "").toLowerCase();
        const orderNo = o.orderNumber.toLowerCase();
        if (
          !container.includes(needle) &&
          !air.includes(needle) &&
          !orderNo.includes(needle)
        )
          return false;
      }
      return true;
    });
  }, [orders, filterOrigin, filterDest, filterStatus, filterNumber]);

  const monthSummary = React.useMemo(() => {
    return months.map((m) => {
      const inMonth = orders.filter((o) => {
        const d = new Date(o.shipDate);
        return d.getFullYear() === m.year && d.getMonth() + 1 === m.month;
      });
      return {
        ...m,
        total: inMonth.length,
        pending: inMonth.filter((o) =>
          ["IN_PROCESS", "APPROVED", "ACCEPTED"].includes(o.status),
        ).length,
        dispatched: inMonth.filter((o) => o.status === "DISPATCHED").length,
        delivered: inMonth.filter((o) => o.status === "DELIVERED").length,
      };
    });
  }, [orders, months]);

  function openOrder(order: CalendarOrder) {
    router.push(`/orders/${order.id}`);
  }

  function resetFilters() {
    setFilterOrigin("");
    setFilterDest("");
    setFilterStatus("");
    setFilterNumber("");
  }

  const hasFilters =
    !!filterOrigin || !!filterDest || !!filterStatus || !!filterNumber.trim();

  const weekLabel = React.useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(weekStart)} – ${fmt(end)}, ${end.getFullYear()}`;
  }, [weekStart]);

  function navigate(delta: number) {
    const next = monthOffset + delta;
    router.push(next === 0 ? "/calendar" : `/calendar?offset=${next}`);
  }

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Previous month"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {monthOffset !== 0 && (
            <button
              type="button"
              onClick={() => navigate(-monthOffset)}
              className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Today
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(1)}
            aria-label="Next month"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <span className="text-sm font-medium text-slate-600">
          {months[0].label} – {months[2].label}
        </span>
      </div>

      {/* Top KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {monthSummary.map((m) => (
          <Card key={`${m.year}-${m.month}`} className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {m.label}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-semibold text-slate-900 tabular-nums">
                {m.total}
              </span>
              <span className="text-[11px] text-slate-500">
                shipment{m.total === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
              <Pill
                icon={<Clock className="h-3 w-3" />}
                label={`${m.pending}`}
                color="text-amber-600"
              />
              <Pill
                icon={<Truck className="h-3 w-3" />}
                label={`${m.dispatched}`}
                color="text-indigo-600"
              />
              <Pill
                icon={<PackageCheck className="h-3 w-3" />}
                label={`${m.delivered}`}
                color="text-emerald-600"
              />
            </div>
          </Card>
        ))}
      </div>

      {/* Filter / view bar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="search"
              value={filterNumber}
              onChange={(e) => setFilterNumber(e.target.value)}
              placeholder="Shipment # or order #"
              className="h-9 w-48 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2 text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <Combobox
            aria-label="Filter by origin"
            value={filterOrigin}
            onChange={setFilterOrigin}
            className="h-9 w-40"
            options={[
              { value: "", label: "All origins" },
              ...LOCATIONS.map((l) => ({
                value: l,
                label: `From ${LOCATION_META[l].label}`,
              })),
            ]}
          />
          <Combobox
            aria-label="Filter by destination"
            value={filterDest}
            onChange={setFilterDest}
            className="h-9 w-40"
            options={[
              { value: "", label: "All destinations" },
              ...LOCATIONS.map((l) => ({
                value: l,
                label: `To ${LOCATION_META[l].label}`,
              })),
            ]}
          />
          <Combobox
            aria-label="Filter by status"
            value={filterStatus}
            onChange={setFilterStatus}
            className="h-9 w-36"
            options={[
              { value: "", label: "Any status" },
              ...STATUS_OPTIONS.map((s) => ({
                value: s.value,
                label: s.label,
              })),
            ]}
          />

          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 px-2 h-9"
            >
              Clear
            </button>
          )}

          <span className="ml-auto flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setView("month")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 h-8 text-xs font-medium transition",
                  view === "month"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50",
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Month
              </button>
              <button
                type="button"
                onClick={() => setView("week")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 h-8 text-xs font-medium transition",
                  view === "week"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50",
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" /> Week
              </button>
            </div>
          </span>
        </div>
      </Card>

      {/* Calendar view */}
      {view === "month" ? (
        <div className="grid gap-4 xl:grid-cols-3">
          {months.map((m) => (
            <MonthGrid
              key={`${m.year}-${m.month}`}
              year={m.year}
              month={m.month}
              label={m.label}
              orders={filtered}
              onOrderClick={openOrder}
            />
          ))}
        </div>
      ) : (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Week of {weekLabel}
              </h3>
              <p className="text-xs text-slate-500">
                Orders by ship date. Click one to open it.
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() - 7);
                  setWeekStart(d);
                }}
                aria-label="Previous week"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-slate-900"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setWeekStart(startOfWeek(new Date()))}
                className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() + 7);
                  setWeekStart(d);
                }}
                aria-label="Next week"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-slate-900"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <WeekView
            weekStart={weekStart}
            orders={filtered}
            onOrderClick={openOrder}
          />
        </Card>
      )}
    </div>
  );
}

function Pill({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded bg-slate-50 px-1.5 py-0.5",
        color,
      )}
    >
      {icon}
      {label}
    </span>
  );
}
