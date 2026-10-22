"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import {
  ELEVATOR_KIND_OPTIONS,
  ENGINE_OPTIONS,
  STOP_OPTIONS,
} from "@/lib/constants";

interface Props {
  modelOptions: { code: string; name: string }[];
}

export function ConfigFilterBar({ modelOptions }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [search, setSearch] = React.useState(params.get("search") ?? "");
  const modelCode = params.get("modelCode") ?? "";
  const elevatorKind = params.get("elevatorKind") ?? "";
  const engine = params.get("engine") ?? "";
  const stops = params.get("stops") ?? "";

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

  const hasFilters =
    !!search || !!modelCode || !!elevatorKind || !!engine || !!stops;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="search"
          placeholder="Search by name or color…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 h-9 text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <Combobox
        aria-label="Filter by kind"
        value={elevatorKind}
        onChange={(v) => setParam("elevatorKind", v)}
        className="h-9 w-32"
        options={[
          { value: "", label: "All kinds" },
          ...ELEVATOR_KIND_OPTIONS.map((k) => ({
            value: k.value,
            label: k.label,
          })),
        ]}
      />

      <Combobox
        aria-label="Filter by model"
        value={modelCode}
        onChange={(v) => setParam("modelCode", v)}
        className="h-9 w-36"
        options={[
          { value: "", label: "All models" },
          ...modelOptions.map((m) => ({
            value: m.code,
            label: `${m.code} — ${m.name}`,
          })),
        ]}
      />

      <Combobox
        aria-label="Filter by engine"
        value={engine}
        onChange={(v) => setParam("engine", v)}
        className="h-9 w-40"
        options={[
          { value: "", label: "All engines" },
          ...ENGINE_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
          })),
        ]}
      />

      <Combobox
        aria-label="Filter by stops"
        value={stops}
        onChange={(v) => setParam("stops", v)}
        className="h-9 w-28"
        options={[
          { value: "", label: "Any stops" },
          ...STOP_OPTIONS.map((n) => ({
            value: String(n),
            label: `${n} stops`,
          })),
        ]}
      />

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
