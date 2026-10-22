import * as React from "react";
import { cn } from "@/lib/utils";
import {
  CYLINDERS_PER_PALLET,
  PALLETS_PER_CONTAINER,
  type CapacityBreakdown,
} from "@/lib/capacity";

interface ContainerVisualProps {
  breakdown: CapacityBreakdown;
  containerNumber?: string;
  sizeLabel?: string;
  status?: string;
  className?: string;
  cols?: number;
  rows?: number;
}

/**
 * Top-down stylised container: vertical corrugated long walls, door-end
 * stencils on the left, sealed wall on the right, wooden floor with
 * pallet grid inside.
 */
export function ContainerVisual({
  breakdown,
  containerNumber,
  sizeLabel,
  status,
  className,
  cols = 5,
  rows = 4,
}: ContainerVisualProps) {
  const total = cols * rows;
  const capacity = breakdown.palletCapacity ?? PALLETS_PER_CONTAINER;
  const fullPallets = Math.min(breakdown.fullPallets, total);
  const hasPartial = breakdown.partialPalletCylinders > 0;
  const partialIndex = hasPartial && fullPallets < total ? fullPallets : -1;
  const overflowSlots = Math.max(
    0,
    breakdown.pallets - Math.min(capacity, total),
  );

  // Vertical corrugation — series of thin vertical stripes.
  const corrugation =
    "repeating-linear-gradient(90deg, #1d4ed8 0 4px, #2563eb 4px 7px, #1e40af 7px 8px)";

  return (
    <div className={cn("space-y-1.5 w-full", className)}>
      <div
        className="relative w-full overflow-hidden rounded-md shadow-sm ring-1 ring-blue-900/40"
        style={{ background: "#1d4ed8" }}
      >
        <div className="flex">
          {/* Left end: doors with stencils */}
          <div className="relative w-9 flex-none bg-blue-700 border-r border-blue-900/40">
            <div className="absolute inset-y-0.5 left-1/2 w-px bg-blue-950/40" />
            <div className="absolute top-0.5 bottom-0.5 left-[20%] w-px bg-blue-950/60 animate-door-tick" />
            <div
              className="absolute top-0.5 bottom-0.5 right-[20%] w-px bg-blue-950/60 animate-door-tick"
              style={{ animationDelay: "1.5s" }}
            />
            <span className="absolute left-[20%] top-1/2 -translate-x-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-slate-200 ring-[0.5px] ring-blue-950/50" />
            <span className="absolute right-[20%] top-1/2 translate-x-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-slate-200 ring-[0.5px] ring-blue-950/50" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="font-mono text-[6px] font-bold leading-none tracking-wider text-white/85"
                style={{
                  writingMode: "vertical-rl",
                  textOrientation: "mixed",
                  transform: "rotate(180deg)",
                }}
              >
                {containerNumber ?? "PVE"}
              </span>
            </div>
          </div>

          {/* Container body: corrugated walls top/bottom + pallet floor */}
          <div className="relative flex-1">
            <div
              className="relative h-1.5 w-full border-b border-blue-950/40 overflow-hidden animate-corrugation-shimmer"
              style={{ background: corrugation }}
            />

            <div className="relative bg-amber-50/90 px-1.5 py-1.5">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-20"
                style={{
                  background:
                    "repeating-linear-gradient(90deg, transparent 0 14px, rgba(180,120,60,0.2) 14px 15px)",
                }}
              />

              <div
                className="relative grid gap-0.5"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: total }).map((_, i) => {
                  const isFull = i < fullPallets;
                  const isPartial = i === partialIndex;
                  const partialFraction = isPartial
                    ? breakdown.partialPalletCylinders / CYLINDERS_PER_PALLET
                    : 0;
                  return (
                    <div
                      key={`${i}-${isFull ? "full" : isPartial ? "p" : "e"}`}
                      role="img"
                      aria-label={
                        isFull
                          ? `Slot ${i + 1} loaded`
                          : isPartial
                            ? `Slot ${i + 1} partial`
                            : `Slot ${i + 1} empty`
                      }
                      style={{ animationDelay: `${i * 30}ms` }}
                      className={cn(
                        "relative flex h-5 items-center justify-center rounded-[2px] text-[8px] font-bold tabular-nums transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
                        isFull &&
                          "bg-gradient-to-b from-brand-500 to-brand-700 text-white shadow-inner ring-1 ring-brand-900/40 animate-pallet-load",
                        isPartial &&
                          "bg-amber-100 ring-1 ring-amber-500/60 overflow-hidden animate-pallet-load",
                        !isFull && !isPartial &&
                          "border border-dashed border-amber-700/30 bg-amber-50 animate-slot-idle",
                      )}
                    >
                      {isPartial && (
                        <span
                          aria-hidden
                          className="absolute inset-x-0 bottom-0 bg-amber-400 animate-partial-pulse transition-all duration-500 ease-out"
                          style={{
                            height: `${Math.round(partialFraction * 100)}%`,
                          }}
                        />
                      )}
                      <span className="relative z-10">
                        {isFull ? (
                          <PalletGlyph />
                        ) : isPartial ? (
                          <span className="text-[7px] text-amber-800">
                            {breakdown.partialPalletCylinders}/
                            {CYLINDERS_PER_PALLET}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className="relative h-1.5 w-full border-t border-blue-950/40 overflow-hidden animate-corrugation-shimmer"
              style={{ background: corrugation }}
            />
          </div>

          {/* Right end: sealed wall */}
          <div className="w-1.5 flex-none bg-blue-800 border-l border-blue-900/50" />
        </div>

        {/* Stats strip */}
        <div
          key={`${breakdown.pallets}-${breakdown.fillPercent}`}
          className="flex items-center justify-between gap-2 bg-blue-900 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white animate-stats-pop"
        >
          <span className="font-mono truncate">
            {containerNumber ?? "PVE"} · {sizeLabel ?? "40' HC"}
          </span>
          <span className="tabular-nums">
            {breakdown.pallets}/{capacity} · {breakdown.fillPercent}%
          </span>
          {status && (
            <span className="rounded-sm bg-white/95 px-1 py-px text-[7px] tracking-wider text-blue-900">
              {status}
            </span>
          )}
        </div>
      </div>

      {/* Overflow */}
      {overflowSlots > 0 && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5">
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-rose-700">
            Overflow — needs another container
          </p>
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: overflowSlots }).map((_, i) => (
              <div
                key={i}
                aria-label={`Overflow pallet ${i + 1}`}
                className="flex h-5 items-center justify-center rounded-[2px] bg-rose-500 text-[8px] font-bold text-white shadow-inner ring-1 ring-rose-700/40 animate-overflow-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                !
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-[9px] text-slate-500">
        <LegendDot
          color="bg-gradient-to-b from-brand-500 to-brand-700"
          label="Loaded"
        />
        {hasPartial && <LegendDot color="bg-amber-400" label="Partial" />}
        <LegendDot
          color="border border-dashed border-amber-700/40 bg-amber-50"
          label="Empty"
        />
        {overflowSlots > 0 && (
          <LegendDot color="bg-rose-500" label="Overflow" />
        )}
      </div>
    </div>
  );
}

function PalletGlyph() {
  return (
    <svg
      viewBox="0 0 10 10"
      aria-hidden
      className="h-2.5 w-2.5 fill-current opacity-90"
    >
      <rect x="1" y="2" width="8" height="1.2" rx="0.3" />
      <rect x="1" y="4.4" width="8" height="1.2" rx="0.3" />
      <rect x="1" y="6.8" width="8" height="1.2" rx="0.3" />
    </svg>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("h-2 w-2 rounded-sm", color)} />
      {label}
    </span>
  );
}
