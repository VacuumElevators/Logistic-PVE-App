"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { ELEVATOR_COLORS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (color: string) => void;
}

const PRESET_NAMES = ELEVATOR_COLORS.filter((c) => c.name !== "Custom").map(
  (c) => c.name,
);

export function ColorPicker({ value, onChange }: Props) {
  const isCustom = !PRESET_NAMES.includes(value);
  const [customValue, setCustomValue] = React.useState(
    isCustom ? value : "",
  );

  function pickPreset(name: string) {
    onChange(name);
    setCustomValue("");
  }

  function pickCustom() {
    if (!isCustom) onChange(customValue.trim() || "Custom");
  }

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Cabin color"
        className="flex flex-wrap gap-2"
      >
        {ELEVATOR_COLORS.filter((c) => c.name !== "Custom").map((color) => {
          const selected = value === color.name;
          return (
            <button
              key={color.name}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => pickPreset(color.name)}
              className={cn(
                "group relative flex items-center gap-2 rounded-lg border bg-white pl-1.5 pr-3 py-1.5 text-sm transition",
                selected
                  ? "border-brand-500 ring-2 ring-brand-500/20"
                  : "border-slate-200 hover:border-slate-300",
              )}
            >
              <span
                className="relative h-6 w-6 rounded-md border border-slate-200"
                style={{ background: color.hex }}
              >
                {selected && (
                  <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow" />
                )}
              </span>
              <span className="font-medium text-slate-700">{color.name}</span>
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={isCustom}
          onClick={pickCustom}
          className={cn(
            "flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm transition",
            isCustom
              ? "border-brand-500 ring-2 ring-brand-500/20"
              : "border-slate-200 hover:border-slate-300",
          )}
        >
          <span className="h-6 w-6 rounded-md border border-slate-200 bg-gradient-to-br from-fuchsia-300 via-brand-300 to-amber-300" />
          <span className="font-medium text-slate-700">Custom</span>
        </button>
      </div>

      {isCustom && (
        <Input
          placeholder="Custom finish (e.g. RAL 7016 Matte)"
          value={customValue}
          onChange={(e) => {
            setCustomValue(e.target.value);
            onChange(e.target.value.trim() || "Custom");
          }}
          className="max-w-sm"
          maxLength={40}
        />
      )}
    </div>
  );
}
