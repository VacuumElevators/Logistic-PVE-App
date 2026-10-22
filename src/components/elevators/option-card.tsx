"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface OptionCardProps {
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  visual?: React.ReactNode;
  ariaLabel?: string;
}

export function OptionCard({
  selected,
  onSelect,
  disabled = false,
  title,
  subtitle,
  visual,
  ariaLabel,
}: OptionCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "relative flex w-full flex-col items-start gap-2 rounded-xl border bg-white p-4 text-left transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        selected
          ? "border-brand-500 ring-2 ring-brand-500/20 shadow-sm"
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm",
        disabled && "opacity-50 cursor-not-allowed hover:border-slate-200 hover:shadow-none",
      )}
    >
      {selected && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
          <Check className="h-3 w-3" />
        </span>
      )}
      {visual && (
        <div className="flex h-12 w-full items-center justify-center text-slate-400">
          {visual}
        </div>
      )}
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {subtitle && (
          <p className="text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
    </button>
  );
}
