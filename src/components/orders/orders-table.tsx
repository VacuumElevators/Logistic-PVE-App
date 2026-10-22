"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, cn } from "@/lib/utils";

export interface OrderTableRow {
  id: string;
  orderNumber: string;
  type: string;
  shipmentLabel: string;
  customerName: string;
  routeLabel: string;
  itemCount: number;
  submittedAt: string | null;
  status: string;
}

type SortKey =
  | "order"
  | "shipment"
  | "customer"
  | "route"
  | "items"
  | "submitted"
  | "status";

type SortType = "string" | "number" | "date";

interface Column {
  key: SortKey;
  label: string;
  type: SortType;
  className?: string;
  value: (r: OrderTableRow) => string | number | null;
}

const COLUMNS: Column[] = [
  { key: "order", label: "Order #", type: "string", value: (r) => r.orderNumber },
  { key: "shipment", label: "Shipment #", type: "string", value: (r) => r.shipmentLabel },
  { key: "customer", label: "Customer", type: "string", value: (r) => r.customerName },
  { key: "route", label: "Route", type: "string", value: (r) => r.routeLabel },
  { key: "items", label: "Items", type: "number", value: (r) => r.itemCount },
  { key: "submitted", label: "Submitted", type: "date", value: (r) => r.submittedAt },
  { key: "status", label: "Status", type: "string", value: (r) => r.status },
];

type Dir = "asc" | "desc";

export function OrdersTable({ rows }: { rows: OrderTableRow[] }) {
  // Default: unsorted — preserve the server order (newest first).
  const [sortKey, setSortKey] = React.useState<SortKey | null>(null);
  const [dir, setDir] = React.useState<Dir>("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDir("asc");
    }
  }

  const sortedRows = React.useMemo(() => {
    if (!sortKey) return rows;
    const col = COLUMNS.find((c) => c.key === sortKey);
    if (!col) return rows;
    const factor = dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = col.value(a);
      const bv = col.value(b);
      const aEmpty = av === null || av === "" || av === "—";
      const bEmpty = bv === null || bv === "" || bv === "—";
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      if (col.type === "string") {
        return factor * String(av).localeCompare(String(bv));
      }
      if (col.type === "date") {
        return factor * (new Date(av as string).getTime() - new Date(bv as string).getTime());
      }
      return factor * (Number(av) - Number(bv));
    });
  }, [rows, sortKey, dir]);

  // Excel-style gridlines: every cell gets a right + bottom border; the wrapper
  // supplies the outer frame. `last:border-r-0` avoids a double edge on the right.
  const headCell =
    "border-b border-r border-slate-300 last:border-r-0 bg-slate-100 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600 whitespace-nowrap";
  const bodyCell =
    "border-b border-r border-slate-200 last:border-r-0 px-3 py-1.5 whitespace-nowrap";

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-300 bg-white">
      <table className="w-full border-collapse text-sm text-slate-700">
        <thead className="sticky top-0 z-10">
          <tr>
            {COLUMNS.map((col) => {
              const active = sortKey === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(headCell, col.className)}
                  aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className={cn(
                      "group inline-flex w-full items-center gap-1 transition-colors hover:text-slate-900",
                      active ? "text-slate-900" : "text-slate-600",
                    )}
                  >
                    {col.label}
                    <SortIcon active={active} dir={dir} />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 && (
            <tr>
              <td
                colSpan={COLUMNS.length}
                className="px-3 py-8 text-center text-sm text-slate-400"
              >
                No orders match these filters.
              </td>
            </tr>
          )}
          {sortedRows.map((r) => (
            <tr
              key={r.id}
              className="odd:bg-white even:bg-slate-50/60 transition-colors hover:bg-brand-50/50"
            >
              <td className={bodyCell}>
                <Link
                  href={`/orders/${r.id}`}
                  className="font-medium text-slate-900 hover:text-brand-600"
                >
                  {r.orderNumber}
                </Link>
              </td>
              <td className={cn(bodyCell, "text-xs text-slate-700")}>
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-mono">{r.shipmentLabel}</span>
                  {r.type === "AIRFREIGHT" && (
                    <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                      Air
                    </span>
                  )}
                </span>
              </td>
              <td className={cn(bodyCell, "text-sm")}>{r.customerName}</td>
              <td className={cn(bodyCell, "text-xs text-slate-500")}>{r.routeLabel}</td>
              <td className={cn(bodyCell, "text-right tabular-nums")}>{r.itemCount}</td>
              <td className={cn(bodyCell, "text-xs text-slate-500")}>
                {formatDate(r.submittedAt)}
              </td>
              <td className={bodyCell}>
                <StatusBadge kind="order" status={r.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: Dir }) {
  if (!active) {
    return (
      <ChevronsUpDown className="h-3 w-3 text-slate-300 group-hover:text-slate-400" />
    );
  }
  return dir === "asc" ? (
    <ChevronUp className="h-3 w-3 text-brand-600" />
  ) : (
    <ChevronDown className="h-3 w-3 text-brand-600" />
  );
}
