import * as React from "react";
import { cn } from "@/lib/utils";
import {
  CYLINDERS_PER_PALLET,
  PALLETS_PER_CONTAINER,
  type CapacityBreakdown,
} from "@/lib/capacity";

interface SlotGridProps {
  breakdown: CapacityBreakdown;
  /** Cols × rows. Defaults to 5 × 4 (= 20 slots). */
  cols?: number;
  rows?: number;
  /** Show numeric badge in each slot. */
  showIndex?: boolean;
  /** Per-slot size class. */
  size?: "xs" | "sm" | "md" | "lg";
  /** Hide the legend strip (for very compact placements). */
  hideLegend?: boolean;
  className?: string;
}

/**
 * Visual representation of a container's 20 pallet slots.
 *
 * - Full pallets fill green slots
 * - A partial pallet (e.g. 2/4 cylinders) shows a striped half-fill slot
 * - Over-capacity pallets show in red after the grid
 * - Empty slots are outlined
 */
export function SlotGrid({
  breakdown,
  cols = 5,
  rows = 4,
  showIndex = false,
  size = "md",
  hideLegend = false,
  className,
}: SlotGridProps) {
  const total = cols * rows;
  const capacity = breakdown.palletCapacity ?? PALLETS_PER_CONTAINER;
  const fullPallets = Math.min(breakdown.fullPallets, total);
  const hasPartial = breakdown.partialPalletCylinders > 0;
  const partialIndex = hasPartial && fullPallets < total ? fullPallets : -1;
  const overflowSlots = Math.max(
    0,
    breakdown.pallets - Math.min(capacity, total),
  );

  const sizeCls = {
    xs: "h-4 w-4 text-[8px]",
    sm: "h-5 w-5 text-[9px]",
    md: "h-8 w-8 text-[10px]",
    lg: "h-10 w-10 text-xs",
  }[size];

  const gap = size === "xs" || size === "sm" ? "gap-1" : "gap-1.5";

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < total; i++) {
    const isFull = i < fullPallets;
    const isPartial = i === partialIndex;
    const partialFraction = isPartial
      ? breakdown.partialPalletCylinders / CYLINDERS_PER_PALLET
      : 0;

    cells.push(
      <div
        key={i}
        role="img"
        aria-label={
          isFull
            ? `Slot ${i + 1} occupied`
            : isPartial
              ? `Slot ${i + 1} partially filled (${breakdown.partialPalletCylinders}/${CYLINDERS_PER_PALLET} cylinders)`
              : `Slot ${i + 1} empty`
        }
        className={cn(
          "relative flex items-center justify-center rounded-md border font-mono font-semibold tabular-nums transition-colors",
          sizeCls,
          isFull && "border-brand-300 bg-brand-500 text-white shadow-sm",
          isPartial && "border-amber-300 bg-amber-50 text-amber-700 overflow-hidden",
          !isFull && !isPartial &&
            "border-dashed border-slate-200 bg-slate-50 text-slate-300",
        )}
      >
        {isPartial && (
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 bg-amber-400"
            style={{ height: `${Math.round(partialFraction * 100)}%` }}
          />
        )}
        <span className="relative z-10">
          {isFull ? "X" : showIndex ? i + 1 : ""}
          {isPartial && !showIndex && (
            <span className="text-[8px]">
              {breakdown.partialPalletCylinders}/{CYLINDERS_PER_PALLET}
            </span>
          )}
        </span>
      </div>,
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn("grid", gap)}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {cells}
      </div>

      {overflowSlots > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-rose-700">
            Over capacity by {overflowSlots} pallet
            {overflowSlots === 1 ? "" : "s"}
          </p>
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: overflowSlots }).map((_, i) => (
              <div
                key={`over-${i}`}
                role="img"
                aria-label={`Overflow pallet ${i + 1}`}
                className={cn(
                  "flex items-center justify-center rounded-md border border-rose-300 bg-rose-500 text-white font-mono text-[10px] font-semibold animate-pulse",
                  sizeCls,
                )}
              >
                !
              </div>
            ))}
          </div>
        </div>
      )}

      {!hideLegend && (
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
          <LegendDot color="bg-brand-500" label="Full" />
          {hasPartial && (
            <LegendDot color="bg-amber-400" label="Partial" />
          )}
          <LegendDot
            color="border border-dashed border-slate-300 bg-slate-50"
            label="Empty"
          />
          {overflowSlots > 0 && (
            <LegendDot color="bg-rose-500" label="Overflow" />
          )}
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-sm", color)} />
      {label}
    </span>
  );
}
