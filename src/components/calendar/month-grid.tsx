"use client";

import * as React from "react";
import { buildMonthGrid } from "@/lib/calendar-planning-pure";
import { cn } from "@/lib/utils";
import { OrderCard } from "./order-card";
import type { CalendarOrder } from "./types";

interface Props {
  year: number;
  month: number;
  label: string;
  orders: CalendarOrder[];
  onOrderClick: (order: CalendarOrder) => void;
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthGrid({ year, month, label, orders, onOrderClick }: Props) {
  const cells = React.useMemo(() => buildMonthGrid(year, month), [year, month]);

  // Group orders by their ship-date ISO for fast per-day lookup.
  const ordersByDay = React.useMemo(() => {
    const map = new Map<string, CalendarOrder[]>();
    for (const o of orders) {
      const d = new Date(o.shipDate);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const arr = map.get(iso) ?? [];
      arr.push(o);
      map.set(iso, arr);
    }
    return map;
  }, [orders]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Month
        </p>
        <p className="text-base font-semibold text-slate-900">{label}</p>
      </div>
      <div className="grid grid-cols-7 border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {DOW.map((d) => (
          <div
            key={d}
            className="px-2 py-1.5 text-center border-r border-slate-100 last:border-r-0"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const list = ordersByDay.get(cell.iso) ?? [];
          return (
            <div
              key={cell.iso}
              className={cn(
                "group relative min-h-[110px] border-r border-b border-slate-100 last:border-r-0 p-1.5",
                !cell.isCurrentMonth && "bg-slate-50/60",
                cell.isToday && "bg-indigo-50/40",
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    cell.isCurrentMonth ? "text-slate-700" : "text-slate-400",
                    cell.isToday && "text-indigo-700",
                  )}
                >
                  {cell.date.getDate()}
                </span>
              </div>
              <div className="space-y-1">
                {list.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onClick={() => onOrderClick(order)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
