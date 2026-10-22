import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./card";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  delta?: { value: string; positive?: boolean };
  accent?: "brand" | "emerald" | "amber" | "sky" | "rose";
}

const ACCENTS: Record<NonNullable<StatCardProps["accent"]>, string> = {
  brand: "bg-brand-50 text-brand-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  sky: "bg-sky-50 text-sky-600",
  rose: "bg-rose-50 text-rose-600",
};

export function StatCard({
  label,
  value,
  icon,
  delta,
  accent = "brand",
}: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
          {delta && (
            <p
              className={cn(
                "text-xs font-medium",
                delta.positive ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {delta.value}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              ACCENTS[accent],
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
