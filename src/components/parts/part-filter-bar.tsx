"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { PART_CATEGORIES } from "@/lib/constants";

export function PartFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [search, setSearch] = React.useState(params.get("search") ?? "");
  const category = params.get("category") ?? "";
  const low = params.get("low") === "1";

  React.useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (search.trim()) next.set("search", search.trim());
      else next.delete("search");
      next.set("page", "1");
      router.push(`${pathname}?${next.toString()}`);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function setParam(name: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    next.set("page", "1");
    router.push(`${pathname}?${next.toString()}`);
  }

  const hasFilters = !!search || !!category || low;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="search"
          placeholder="Search by part #, name or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 h-9 text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <Combobox
        aria-label="Filter by category"
        value={category}
        onChange={(v) => setParam("category", v)}
        className="h-9 w-44"
        options={[
          { value: "", label: "All categories" },
          ...PART_CATEGORIES.map((c) => ({ value: c, label: c })),
        ]}
      />

      <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 h-9 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={low}
          onChange={(e) => setParam("low", e.target.checked ? "1" : "")}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        Reorder needed
      </label>

      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            router.push(pathname);
          }}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 px-2 h-9"
        >
          <X className="h-3.5 w-3.5" /> Clear
        </button>
      )}
    </div>
  );
}
