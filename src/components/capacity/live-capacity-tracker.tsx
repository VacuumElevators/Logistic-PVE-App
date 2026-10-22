"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { CapacityBar } from "@/components/ui/capacity-progress";
import { SlotGrid } from "./slot-grid";
import { ContainerVisual } from "./container-visual";
import {
  calculateCapacity,
  PALLETS_PER_CONTAINER,
  type CapacityBreakdown,
} from "@/lib/capacity";

interface Props {
  cylinders: number;
  capacityPallets?: number;
  title?: string;
  /** Compact mode hides verbose warning list (keeps the over-capacity error). */
  compact?: boolean;
  /** Even denser layout for use inside forms. */
  dense?: boolean;
  /** Show the realistic container chrome instead of a flat slot grid. */
  rich?: boolean;
  /** Container number to stencil on the rich visual. */
  containerNumber?: string;
  /** Size label for the rich visual (e.g. "40' HC"). */
  sizeLabel?: string;
  /** When true, surface a banner: general parts can't be auto-sized yet. */
  hasGeneralParts?: boolean;
  className?: string;
  onChange?: (breakdown: CapacityBreakdown) => void;
}

/**
 * Live container-capacity tracker that updates as `cylinders` changes.
 */
export function LiveCapacityTracker({
  cylinders,
  capacityPallets = PALLETS_PER_CONTAINER,
  title = "Container Capacity",
  compact = false,
  dense = false,
  rich = false,
  containerNumber,
  sizeLabel,
  hasGeneralParts = false,
  className,
  onChange,
}: Props) {
  const breakdown = React.useMemo(
    () => calculateCapacity(cylinders, capacityPallets),
    [cylinders, capacityPallets],
  );

  React.useEffect(() => {
    onChange?.(breakdown);
  }, [breakdown, onChange]);

  // In dense mode, only critical (error) warnings are shown.
  const criticalWarnings = breakdown.warnings.filter((w) => w.severity === "error");

  return (
    <Card className={cn(dense ? "p-3" : "p-5", "space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 truncate">
            {title}
          </h3>
          <p className="text-[11px] text-slate-500 tabular-nums">
            {breakdown.cylinders} cyl · {breakdown.pallets} / {capacityPallets} pallets ·{" "}
            {breakdown.remainingPallets} left
          </p>
        </div>
        <FillPill breakdown={breakdown} />
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <p className="text-xl font-semibold text-slate-900 tabular-nums leading-none">
            {breakdown.pallets}
            <span className="text-xs font-medium text-slate-500 ml-1">
              / {capacityPallets}
            </span>
          </p>
          <p className="text-xs font-medium text-slate-700 tabular-nums">
            {breakdown.fillPercent}% full
          </p>
        </div>
        <CapacityBar breakdown={breakdown} showLabel={false} size="sm" />
      </div>

      {rich ? (
        <ContainerVisual
          breakdown={breakdown}
          containerNumber={containerNumber}
          sizeLabel={sizeLabel}
        />
      ) : (
        <SlotGrid breakdown={breakdown} size="sm" />
      )}

      {!compact && criticalWarnings.length > 0 && (
        <ul className="space-y-1">
          {criticalWarnings.map((w, i) => (
            <li
              key={i}
              className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700"
            >
              {w.message}
            </li>
          ))}
        </ul>
      )}

      {hasGeneralParts && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
          <p className="font-semibold">General parts present</p>
          <p className="text-amber-700">
            Pallet space is estimated. Confirm packing with the receiving region
            before locking the container.
          </p>
        </div>
      )}
    </Card>
  );
}

function FillPill({ breakdown }: { breakdown: CapacityBreakdown }) {
  const tone = breakdown.isOver
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : breakdown.fillPercent >= 85
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : breakdown.fillPercent >= 50
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-sky-50 text-sky-700 border-sky-200";
  const label = breakdown.isOver
    ? "Over"
    : breakdown.isFull
      ? "Full"
      : breakdown.isEmpty
        ? "Empty"
        : `${breakdown.fillPercent}%`;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium tabular-nums",
        tone,
      )}
    >
      {label}
    </span>
  );
}
