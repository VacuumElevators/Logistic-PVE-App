"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Check, ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** Visible search field appears once the list reaches this length. Default 8. */
  searchThreshold?: number;
  "aria-label"?: string;
  emptyText?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  disabled,
  className,
  id,
  searchThreshold = 8,
  emptyText = "No matches.",
  "aria-label": ariaLabel,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const listId = React.useId();

  // Display rule: show the matching option's label — INCLUDING an option whose
  // value is "" (e.g. "All statuses", "— None —"). Only fall back to the
  // placeholder when nothing matches.
  const selected = options.find((o) => o.value === value);
  const showSearch = options.length >= searchThreshold;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span className={cn("truncate", !selected && "text-slate-400")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <CommandPrimitive
          // Filter on label text; keywords add the raw value as a fallback match.
          className="overflow-hidden rounded-lg"
        >
          <div
            className={cn(
              "flex items-center gap-2 border-b border-slate-100 px-3",
              showSearch ? "h-9" : "sr-only",
            )}
          >
            {showSearch && (
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
            )}
            <CommandPrimitive.Input
              placeholder={showSearch ? "Search…" : undefined}
              className={cn(
                "flex-1 bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400",
                !showSearch && "sr-only",
              )}
            />
          </div>
          <CommandPrimitive.List
            id={listId}
            className="max-h-60 overflow-y-auto overflow-x-hidden p-1"
          >
            <CommandPrimitive.Empty className="py-6 text-center text-sm text-slate-400">
              {emptyText}
            </CommandPrimitive.Empty>
            {options.map((option) => (
              <CommandPrimitive.Item
                key={option.value || "__empty__"}
                value={option.label}
                keywords={option.value ? [option.value] : undefined}
                disabled={option.disabled}
                onSelect={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 outline-none",
                  "data-[selected=true]:bg-brand-50 data-[selected=true]:text-brand-700",
                  "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40",
                )}
              >
                <span className="truncate">{option.label}</span>
                {option.value === value && (
                  <Check className="h-4 w-4 shrink-0 text-brand-600" />
                )}
              </CommandPrimitive.Item>
            ))}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </PopoverContent>
    </Popover>
  );
}
