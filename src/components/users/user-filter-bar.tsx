"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { LOCATIONS, LOCATION_META } from "@/lib/constants";
import { ROLES, roleLabel } from "@/lib/permissions";
import type { Database } from "@/types/database";

type Location = Database["public"]["Enums"]["Location"];

interface FilterBarProps {
  canFilterLocation: boolean;
  /** When false the location selector is hidden and the location is forced. */
  scopedLocation?: Location;
}

export function UserFilterBar({
  canFilterLocation,
  scopedLocation,
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [search, setSearch] = React.useState(params.get("search") ?? "");
  const role = params.get("role") ?? "";
  const location = params.get("location") ?? "";
  const status = params.get("status") ?? "";

  // Debounce search input → URL push.
  React.useEffect(() => {
    const handle = setTimeout(() => {
      const current = new URLSearchParams(params.toString());
      if (search.trim()) current.set("search", search.trim());
      else current.delete("search");
      current.set("page", "1");
      router.push(`${pathname}?${current.toString()}`);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function setParam(name: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    next.set("page", "1");
    router.push(`${pathname}?${next.toString()}`);
  }

  const hasFilters =
    !!search || !!role || !!location || !!status;

  function clearAll() {
    setSearch("");
    router.push(pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 h-9 text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <Combobox
        aria-label="Filter by role"
        value={role}
        onChange={(v) => setParam("role", v)}
        className="h-9 w-40"
        options={[
          { value: "", label: "All roles" },
          ...ROLES.map((r) => ({ value: r, label: roleLabel(r) })),
        ]}
      />

      {canFilterLocation && (
        <Combobox
          aria-label="Filter by location"
          value={location}
          onChange={(v) => setParam("location", v)}
          className="h-9 w-40"
          options={[
            { value: "", label: "All locations" },
            ...LOCATIONS.map((l) => ({
              value: l,
              label: LOCATION_META[l].label,
            })),
          ]}
        />
      )}

      {!canFilterLocation && scopedLocation && (
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 h-9 text-sm text-slate-600">
          <span>{LOCATION_META[scopedLocation].flag}</span>
          {LOCATION_META[scopedLocation].label}
        </div>
      )}

      <Combobox
        aria-label="Filter by status"
        value={status}
        onChange={(v) => setParam("status", v)}
        className="h-9 w-40"
        options={[
          { value: "", label: "Any status" },
          { value: "ACTIVE", label: "Active" },
          { value: "INACTIVE", label: "Inactive" },
          { value: "SUSPENDED", label: "Suspended" },
        ]}
      />

      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 px-2 h-9"
        >
          <X className="h-3.5 w-3.5" /> Clear
        </button>
      )}
    </div>
  );
}
