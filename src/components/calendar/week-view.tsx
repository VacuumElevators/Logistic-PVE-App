"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { OrderCard } from "./order-card";
import type { CalendarOrder } from "./types";

interface Props {
  weekStart: Date;
  orders: CalendarOrder[];
  onOrderClick: (order: CalendarOrder) => void;
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekView({ weekStart, orders, onOrderClick }: Props) {
  const days = React.useMemo(() => {
    const arr: { iso: string; date: Date; isToday: boolean }[] = [];
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
      arr.push({
        iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        date: d,
        isToday:
          `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` === todayKey,
      });
    }
    return arr;
  }, [weekStart]);

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
      <div className="grid grid-cols-7 border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {days.map((d, i) => (
          <div
            key={d.iso}
            className={cn(
              "px-3 py-2 border-r border-slate-100 last:border-r-0 flex items-center justify-between",
              d.isToday && "bg-indigo-50/40",
            )}
          >
            <span>{DOW[i]}</span>
            <span
              className={cn(
                "text-base font-bold tabular-nums",
                d.isToday ? "text-indigo-700" : "text-slate-900",
              )}
            >
              {d.date.getDate()}
            </span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 min-h-[280px]">
        {days.map((d) => {
          const list = ordersByDay.get(d.iso) ?? [];
          return (
            <div
              key={d.iso}
              className={cn(
                "group relative border-r border-b border-slate-100 last:border-r-0 p-2 space-y-1.5",
                d.isToday && "bg-indigo-50/30",
              )}
            >
              {list.length === 0 && (
                <p className="text-[10px] text-slate-300 text-center pt-6">
                  no shipments
                </p>
              )}
              {list.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onClick={() => onOrderClick(order)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
