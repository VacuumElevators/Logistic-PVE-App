"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlySeriesPoint } from "@/lib/dashboard";

interface Props {
  data: MonthlySeriesPoint[];
}

export function MonthlyShipmentChart({ data }: Props) {
  return (
    <div className="h-72 w-full px-2 pb-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="shipGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c33533" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#c33533" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="delivGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#eef2f7" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#94a3b8"
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />
          <YAxis
            stroke="#94a3b8"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              fontSize: 12,
              boxShadow: "0 8px 24px -12px rgba(15,23,42,0.15)",
            }}
            labelStyle={{ color: "#0f172a", fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="shipments"
            name="Shipped"
            stroke="#c33533"
            strokeWidth={2}
            fill="url(#shipGrad)"
          />
          <Area
            type="monotone"
            dataKey="delivered"
            name="Delivered"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#delivGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-2 flex justify-center gap-6 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> Shipped
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Delivered
        </span>
      </div>
    </div>
  );
}
