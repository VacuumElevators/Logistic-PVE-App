import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./card";
import {
  calculateCapacity,
  CYLINDERS_PER_PALLET,
  PALLETS_PER_CONTAINER,
  type CapacityBreakdown,
  type CapacitySeverity,
  type CapacityWarning,
} from "@/lib/capacity";

const SEVERITY_BAR: Record<CapacitySeverity, string> = {
  ok: "bg-emerald-500",
  info: "bg-sky-500",
  warning: "bg-amber-500",
  error: "bg-rose-500",
};

const SEVERITY_PILL: Record<CapacitySeverity, string> = {
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  error: "bg-rose-50 text-rose-700 border-rose-200",
};

function deriveSeverity(b: CapacityBreakdown): CapacitySeverity {
  if (b.isOver) return "error";
  if (b.fillPercent >= 85) return "warning";
  if (b.fillPercent >= 50) return "ok";
  if (b.fillPercent > 0) return "info";
  return "info";
}

interface CapacityBarProps {
  breakdown: CapacityBreakdown;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CapacityBar({
  breakdown,
  showLabel = true,
  size = "md",
  className,
}: CapacityBarProps) {
  const severity = deriveSeverity(breakdown);
  const widthPct = Math.min(100, breakdown.fillPercent);
  const overflowPct = breakdown.isOver
    ? Math.min(100, breakdown.fillPercent - 100)
    : 0;

  const heights = { sm: "h-1.5", md: "h-2.5", lg: "h-3.5" }[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-slate-100",
          heights,
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            SEVERITY_BAR[severity],
          )}
          style={{ width: `${widthPct}%` }}
        />
        {overflowPct > 0 && (
          <div
            className="absolute right-0 top-0 h-full bg-rose-700/60"
            style={{ width: `${overflowPct}%` }}
          />
        )}
      </div>
      {showLabel && (
        <span className="shrink-0 text-xs font-medium tabular-nums text-slate-600">
          {breakdown.fillPercent}%
        </span>
      )}
    </div>
  );
}

interface CapacityWidgetProps {
  cylinders: number;
  capacityPallets?: number;
  className?: string;
  compact?: boolean;
}

export function CapacityWidget({
  cylinders,
  capacityPallets = PALLETS_PER_CONTAINER,
  className,
  compact = false,
}: CapacityWidgetProps) {
  const breakdown = calculateCapacity(cylinders, capacityPallets);
  const severity = deriveSeverity(breakdown);

  return (
    <Card className={cn("p-5 space-y-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Container Fill
          </p>
          <p className="text-2xl font-semibold text-slate-900 tabular-nums">
            {breakdown.pallets} / {capacityPallets}{" "}
            <span className="text-sm font-medium text-slate-500">pallets</span>
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            {breakdown.cylinders} cylinders ·{" "}
            {breakdown.remainingPallets} pallet
            {breakdown.remainingPallets === 1 ? "" : "s"} remaining
          </p>
        </div>
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums",
            SEVERITY_PILL[severity],
          )}
        >
          {breakdown.fillPercent}% full
        </span>
      </div>

      <CapacityBar breakdown={breakdown} showLabel={false} size="lg" />

      {!compact && (
        <dl className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3 text-xs">
          <div>
            <dt className="text-slate-500">Full pallets</dt>
            <dd className="font-medium text-slate-900 tabular-nums">
              {breakdown.fullPallets}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Partial pallet</dt>
            <dd className="font-medium text-slate-900 tabular-nums">
              {breakdown.partialPalletCylinders}/{CYLINDERS_PER_PALLET}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Cylinders left</dt>
            <dd className="font-medium text-slate-900 tabular-nums">
              {breakdown.remainingCylinders}
            </dd>
          </div>
        </dl>
      )}

      {breakdown.warnings.length > 0 && (
        <CapacityWarnings warnings={breakdown.warnings} />
      )}
    </Card>
  );
}

export function CapacityWarnings({
  warnings,
  className,
}: {
  warnings: CapacityWarning[];
  className?: string;
}) {
  if (warnings.length === 0) return null;
  return (
    <ul className={cn("space-y-1.5", className)}>
      {warnings.map((w, i) => (
        <li
          key={`${w.code}-${i}`}
          className={cn(
            "flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-xs",
            SEVERITY_PILL[w.severity],
          )}
        >
          <span aria-hidden className="mt-px font-bold leading-none">
            {w.severity === "error"
              ? "!"
              : w.severity === "warning"
                ? "▲"
                : w.severity === "ok"
                  ? "✓"
                  : "i"}
          </span>
          <span>{w.message}</span>
        </li>
      ))}
    </ul>
  );
}
