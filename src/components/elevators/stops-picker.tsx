"use client";

import { cn } from "@/lib/utils";
import { STOP_OPTIONS } from "@/lib/constants";

interface Props {
  value: number;
  onChange: (stops: number) => void;
  maxStops: number;
}

export function StopsPicker({ value, onChange, maxStops }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Number of stops"
      className="flex flex-wrap gap-2"
    >
      {STOP_OPTIONS.map((n) => {
        const disabled = n > maxStops;
        const selected = value === n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(n)}
            className={cn(
              "relative inline-flex h-12 min-w-[3rem] items-center justify-center rounded-lg border text-sm font-semibold transition",
              selected
                ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
              disabled && "opacity-40 cursor-not-allowed",
            )}
          >
            {n}
          </button>
        );
      })}
      {maxStops < STOP_OPTIONS[STOP_OPTIONS.length - 1] && (
        <p className="self-center text-xs text-slate-500">
          (this model supports up to {maxStops} stops)
        </p>
      )}
    </div>
  );
}
