"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

/**
 * Themed react-day-picker wrapper. Brand colors are applied through the
 * library's own CSS variables so layout/behavior stay stock and on-brand.
 */
export function Calendar({
  className,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays
      // captionLayout="label" (default) keeps the prev/next arrows and avoids
      // react-day-picker's native <select> month/year dropdowns.
      className={cn("p-3", className)}
      style={
        {
          "--rdp-accent-color": "var(--color-brand-600)",
          "--rdp-accent-background-color": "var(--color-brand-50)",
          "--rdp-today-color": "var(--color-brand-600)",
          "--rdp-day-width": "2.25rem",
          "--rdp-day-height": "2.25rem",
          "--rdp-day_button-width": "2.25rem",
          "--rdp-day_button-height": "2.25rem",
          "--rdp-day_button-border-radius": "0.5rem",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
