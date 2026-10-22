"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  EmptyRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { PartRowActions } from "./part-row-actions";
import { apiFetch } from "@/lib/api-fetch";
import {
  PART_CATEGORIES,
  PART_CATEGORY_COLOR,
  type PartCategory,
} from "@/lib/constants";

export interface PartRow {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  stockQty: number;
  reorderLevel: number;
  supplier: { id: string; name: string } | null;
}

interface Props {
  parts: PartRow[];
  canWrite: boolean;
}

export function PartsTable({ parts, canWrite }: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = React.useState<PartCategory>(
    "General Parts",
  );
  const [busy, setBusy] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{
    kind: "ok" | "error";
    message: string;
  } | null>(null);

  // Drop selection of rows that disappear from the page (filter / pagination).
  React.useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      const visibleIds = new Set(parts.map((p) => p.id));
      for (const id of prev) {
        if (visibleIds.has(id)) next.add(id);
      }
      return next;
    });
  }, [parts]);

  const allSelected =
    parts.length > 0 && parts.every((p) => selectedIds.has(p.id));
  const someSelected = parts.some((p) => selectedIds.has(p.id));

  function toggleAll() {
    setSelectedIds((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        for (const p of parts) next.delete(p.id);
        return next;
      }
      const next = new Set(prev);
      for (const p of parts) next.add(p.id);
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applyBulkMove() {
    if (selectedIds.size === 0) return;
    setBusy(true);
    setFeedback(null);
    const ids = Array.from(selectedIds);
    const res = await apiFetch("/api/parts/bulk-category", {
      method: "POST",
      body: JSON.stringify({ ids, category: bulkCategory }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setFeedback({
        kind: "error",
        message: json?.error ?? "Failed to move parts.",
      });
      return;
    }
    setFeedback({
      kind: "ok",
      message: `Moved ${ids.length} part${ids.length === 1 ? "" : "s"} to ${bulkCategory}.`,
    });
    setSelectedIds(new Set());
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {canWrite && selectedIds.size > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 shadow-sm">
          <span className="text-xs font-semibold text-amber-900">
            {selectedIds.size} part{selectedIds.size === 1 ? "" : "s"} selected
          </span>
          <span className="text-xs text-amber-700">→ move to</span>
          <Combobox
            aria-label="Target category"
            value={bulkCategory}
            onChange={(v) => setBulkCategory(v as PartCategory)}
            className="h-8 w-44"
            options={PART_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
          <Button
            type="button"
            size="sm"
            onClick={applyBulkMove}
            disabled={busy}
          >
            {busy ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Moving…
              </>
            ) : (
              `Move ${selectedIds.size} part${selectedIds.size === 1 ? "" : "s"}`
            )}
          </Button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-amber-800 underline underline-offset-2 hover:text-amber-900"
          >
            Clear
          </button>
        </div>
      )}

      {feedback && (
        <div
          className={
            feedback.kind === "ok"
              ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700"
              : "rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
          }
        >
          {feedback.message}
        </div>
      )}

      <Table>
        <THead>
          <tr>
            {canWrite && (
              <TH className="w-8">
                <input
                  type="checkbox"
                  aria-label="Select all parts on this page"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !allSelected && someSelected;
                  }}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 rounded border-slate-300"
                />
              </TH>
            )}
            <TH>Part #</TH>
            <TH>Name</TH>
            <TH>Category</TH>
            <TH>Supplier</TH>
            <TH className="text-right">Quantity</TH>
            <TH>Status</TH>
            <TH className="text-right pr-4">Actions</TH>
          </tr>
        </THead>
        <TBody>
          {parts.length === 0 && (
            <EmptyRow
              colSpan={canWrite ? 8 : 7}
              message="No parts match these filters."
            />
          )}
          {parts.map((p) => {
            const low = p.stockQty <= p.reorderLevel;
            const checked = selectedIds.has(p.id);
            return (
              <TR key={p.id}>
                {canWrite && (
                  <TD className="w-8">
                    <input
                      type="checkbox"
                      aria-label={`Select ${p.sku}`}
                      checked={checked}
                      onChange={() => toggleOne(p.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300"
                    />
                  </TD>
                )}
                <TD className="font-mono text-xs font-medium text-slate-900">
                  {canWrite ? (
                    <Link
                      href={`/parts/${p.id}`}
                      className="hover:text-brand-600"
                    >
                      {p.sku}
                    </Link>
                  ) : (
                    p.sku
                  )}
                </TD>
                <TD>
                  <p className="font-medium text-slate-900">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {p.description}
                    </p>
                  )}
                </TD>
                <TD>
                  <Badge
                    className={
                      PART_CATEGORY_COLOR[p.category as PartCategory] ??
                      "bg-slate-100 text-slate-700"
                    }
                  >
                    {p.category}
                  </Badge>
                </TD>
                <TD className="text-xs text-slate-600">
                  {p.supplier?.name ?? "—"}
                </TD>
                <TD className="text-right font-medium text-slate-900">
                  {p.stockQty}
                </TD>
                <TD>
                  {low ? (
                    <Badge className="bg-rose-50 text-rose-700">Reorder</Badge>
                  ) : (
                    <Badge className="bg-emerald-50 text-emerald-700">
                      In stock
                    </Badge>
                  )}
                </TD>
                <TD className="text-right pr-4">
                  <PartRowActions
                    part={{ id: p.id, sku: p.sku, name: p.name }}
                    canManage={canWrite}
                  />
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
