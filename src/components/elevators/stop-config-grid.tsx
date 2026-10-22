"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Combobox } from "@/components/ui/combobox";
import {
  DOOR_OPTIONS,
  DOOR_META,
  allowedPositions,
  type DoorKey,
  type ElevatorModelCode,
  type StopConfig,
} from "@/lib/constants";

interface Props {
  model: ElevatorModelCode | null;
  stops: number;
  value: StopConfig[];
  onChange: (next: StopConfig[]) => void;
}

export function StopConfigGrid({ model, stops, value, onChange }: Props) {
  if (!model) {
    return (
      <p className="text-xs text-slate-500">
        Pick a model to configure each stop.
      </p>
    );
  }

  function update(stopIndex: number, patch: Partial<StopConfig>) {
    const next = value.map((row) =>
      row.stop === stopIndex ? { ...row, ...patch } : row,
    );
    onChange(next);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="w-16 px-3 py-2 text-left">Stop</th>
            <th className="px-3 py-2 text-left">Door</th>
            <th className="px-3 py-2 text-left">Position</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: stops }, (_, i) => {
            const row = value.find((r) => r.stop === i);
            const positions = allowedPositions(model, i);
            const fixedPosition = positions.length === 1;
            const door = row?.door ?? "LEFT";
            const position = row?.position ?? positions[0] ?? 0;
            return (
              <tr key={i} className="bg-white">
                <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-700">
                  P{i}
                </td>
                <td className="px-3 py-2">
                  <div role="radiogroup" className="inline-flex gap-1">
                    {DOOR_OPTIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        role="radio"
                        aria-checked={door === d}
                        onClick={() => update(i, { door: d as DoorKey })}
                        className={cn(
                          "inline-flex h-8 w-10 items-center justify-center rounded-md border text-xs font-semibold transition",
                          door === d
                            ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                        )}
                      >
                        {DOOR_META[d as DoorKey].short}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {fixedPosition ? (
                    <span className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-500">
                      {position}° (fixed)
                    </span>
                  ) : (
                    <Combobox
                      aria-label={`Position for stop ${i}`}
                      value={String(position)}
                      onChange={(v) => update(i, { position: Number(v) })}
                      className="h-8 w-28 text-xs"
                      options={positions.map((p) => ({
                        value: String(p),
                        label: `${p}°`,
                      }))}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Build a default stopsConfig array for a model + stop count.
 * For stops the model already constrains to a single position, that position is used.
 */
export function defaultStopsConfig(
  model: ElevatorModelCode | null,
  stops: number,
): StopConfig[] {
  return Array.from({ length: stops }, (_, i) => ({
    stop: i,
    door: "LEFT" as DoorKey,
    position: model ? (allowedPositions(model, i)[0] ?? 0) : 0,
  }));
}

/**
 * Reconcile an existing stopsConfig against a (possibly new) model + stop count.
 * - Preserves door choice for stops that survive.
 * - Clamps position to the first allowed value when the prior value isn't in the new model's set.
 * - Pads or truncates to match `stops`.
 */
export function reconcileStopsConfig(
  model: ElevatorModelCode | null,
  stops: number,
  prev: StopConfig[],
): StopConfig[] {
  return Array.from({ length: stops }, (_, i) => {
    const existing = prev.find((r) => r.stop === i);
    const allowed = model ? allowedPositions(model, i) : [0];
    const door: DoorKey = existing?.door ?? "LEFT";
    const position =
      existing && allowed.includes(existing.position)
        ? existing.position
        : (allowed[0] ?? 0);
    return { stop: i, door, position };
  });
}

export function formatStopsConfigShort(config: StopConfig[] | null): string {
  if (!config || config.length === 0) return "—";
  return config
    .map((c) => `${DOOR_META[c.door]?.short ?? "?"}${c.position}°`)
    .join(" · ");
}
