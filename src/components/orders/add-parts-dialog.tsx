"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  PART_CATEGORY_COLOR,
  type PartCategory,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export type PartAddition =
  | {
      kind: "PART";
      partId: string;
      description: string;
      quantity: number;
    }
  | {
      kind: "GENERAL";
      description: string;
      quantity: number;
    };

interface PartOption {
  id: string;
  sku: string;
  name: string;
  category: string;
}

interface GeneralRow {
  key: string;
  description: string;
  quantity: number;
}

interface Props {
  parts: PartOption[];
  onClose: () => void;
  onConfirm: (additions: PartAddition[]) => void;
}

// Always mounted only when open — parent controls visibility. Mount = fresh
// state via React's natural initialization. No reset effect needed.
export function AddPartsDialog({ parts, onClose, onConfirm }: Props) {
  const [step, setStep] = React.useState<"pick-category" | "list-parts">(
    "pick-category",
  );
  const [category, setCategory] = React.useState<PartCategory | null>(null);
  const [search, setSearch] = React.useState("");
  // Map<partId, qty> — persists across category switches so users can build a
  // multi-category cart in a single open of the dialog.
  const [skuQtys, setSkuQtys] = React.useState<Map<string, number>>(new Map());
  const [generalRows, setGeneralRows] = React.useState<GeneralRow[]>(() => [
    { key: crypto.randomUUID(), description: "", quantity: 1 },
  ]);

  // Portal target (document.body) is client-only — gate render until mounted.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isGeneralTab = category === "General Parts";

  // Count parts per category from the prop — no extra query needed.
  const countByCategory = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const p of parts) m.set(p.category, (m.get(p.category) ?? 0) + 1);
    return m;
  }, [parts]);

  const visibleSkus = React.useMemo(() => {
    if (!category || isGeneralTab) return [];
    const q = search.trim().toLowerCase();
    const inCategory = parts
      .filter((p) => p.category === category)
      .sort((a, b) => a.sku.localeCompare(b.sku));
    if (q.length === 0) return inCategory;
    return inCategory.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
    );
  }, [parts, category, search, isGeneralTab]);

  function setQty(partId: string, qty: number) {
    const clamped = Math.max(0, Math.floor(qty));
    setSkuQtys((prev) => {
      const next = new Map(prev);
      if (clamped <= 0) {
        next.delete(partId);
      } else {
        next.set(partId, clamped);
      }
      return next;
    });
  }

  function addGeneralRow() {
    setGeneralRows((prev) => [
      ...prev,
      { key: crypto.randomUUID(), description: "", quantity: 1 },
    ]);
  }

  function updateGeneralRow(key: string, patch: Partial<GeneralRow>) {
    setGeneralRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  }

  function removeGeneralRow(key: string) {
    setGeneralRows((prev) => prev.filter((r) => r.key !== key));
  }

  function pickCategory(c: PartCategory) {
    setCategory(c);
    setSearch("");
    setStep("list-parts");
  }

  function backToCategories() {
    setStep("pick-category");
  }

  function handleConfirm() {
    const additions: PartAddition[] = [];
    const partById = new Map(parts.map((p) => [p.id, p]));
    for (const [partId, qty] of skuQtys.entries()) {
      if (qty <= 0) continue;
      const p = partById.get(partId);
      if (!p) continue;
      additions.push({
        kind: "PART",
        partId,
        description: `${p.sku} — ${p.name}`,
        quantity: qty,
      });
    }
    for (const row of generalRows) {
      const desc = row.description.trim();
      if (!desc || row.quantity <= 0) continue;
      additions.push({
        kind: "GENERAL",
        description: desc,
        quantity: Math.floor(row.quantity),
      });
    }
    if (additions.length === 0) {
      onClose();
      return;
    }
    onConfirm(additions);
  }

  const totalSkus = Array.from(skuQtys.values()).reduce(
    (s, q) => s + (q > 0 ? 1 : 0),
    0,
  );
  const totalGeneral = generalRows.filter(
    (r) => r.description.trim() && r.quantity > 0,
  ).length;
  const hasAny = totalSkus > 0 || totalGeneral > 0;

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex w-full max-w-3xl max-h-[90vh] flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10 animate-fade-in">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 bg-gradient-to-r from-amber-400 to-amber-300 px-5 py-3">
          <div className="flex items-center gap-2">
            {step === "list-parts" && (
              <button
                type="button"
                onClick={backToCategories}
                aria-label="Change category"
                className="inline-flex h-7 items-center gap-1 rounded-md bg-white/40 px-2 text-xs font-medium text-slate-900 hover:bg-white/60"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Change
              </button>
            )}
            <h3 className="text-base font-bold text-slate-900">
              {step === "pick-category"
                ? "Add Parts"
                : category
                  ? `${categoryLabel(category)} parts`
                  : "Add Parts"}
            </h3>
            {hasAny && (
              <span className="rounded-full bg-white/50 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                {totalSkus + totalGeneral} ready
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-900/70 hover:bg-white/30 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step 2 only: search bar */}
        {step === "list-parts" && !isGeneralTab && (
          <div className="shrink-0 px-5 pt-4">
            <Label className="text-[11px] font-medium text-slate-600">
              Search
            </Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by SKU or name…"
              className="h-9 mt-1"
              autoFocus
            />
          </div>
        )}

        {/* Body — scrolls. min-h-0 is the critical fix so flex children shrink. */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {step === "pick-category" ? (
            <CategoryGrid
              countByCategory={countByCategory}
              onPick={pickCategory}
            />
          ) : isGeneralTab ? (
            <GeneralPartsPanel
              rows={generalRows}
              onAdd={addGeneralRow}
              onUpdate={updateGeneralRow}
              onRemove={removeGeneralRow}
            />
          ) : (
            <SkuTable skus={visibleSkus} qtys={skuQtys} setQty={setQty} />
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <p className="text-xs text-slate-500">
            {step === "pick-category" ? (
              "Pick an elevator to see its parts."
            ) : hasAny ? (
              <>
                Ready to add{" "}
                <span className="font-semibold text-slate-700">
                  {totalSkus} SKU{totalSkus === 1 ? "" : "s"}
                </span>
                {totalGeneral > 0 && (
                  <>
                    {" + "}
                    <span className="font-semibold text-slate-700">
                      {totalGeneral} general
                    </span>
                  </>
                )}
              </>
            ) : (
              "Set a quantity, then click Add to order."
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            {step === "list-parts" && (
              <Button onClick={handleConfirm} disabled={!hasAny}>
                Add to order
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ---------- Step 1: category grid ---------- */

// Per the 2026-05-28 PVE call: 4 main configurable elevators vs 3 cylinder
// (cable) elevators that PVE only ships parts for — different category.
const MAIN_ELEVATORS: readonly PartCategory[] = [
  "PVE30 Parts",
  "PVE37 Parts",
  "PVE52 Parts",
  "CUBE36 Parts",
];
const CYLINDER_ONLY: readonly PartCategory[] = [
  "SQ200 Parts",
  "CY200 Parts",
  "CY300 Parts",
];

function categoryLabel(c: PartCategory): string {
  if (c === "General Parts") return "General Parts";
  return c.replace(" Parts", "");
}

function CategoryGrid({
  countByCategory,
  onPick,
}: {
  countByCategory: Map<string, number>;
  onPick: (c: PartCategory) => void;
}) {
  return (
    <div className="space-y-5">
      <CategoryGroup
        title="Elevators"
        subtitle="Configurable models — parts for service & repair."
        cats={MAIN_ELEVATORS}
        countByCategory={countByCategory}
        onPick={onPick}
      />
      <CategoryGroup
        title="Cylinder elevators (parts only)"
        subtitle="Cable elevators assembled in-house. No full-elevator orders — replacement parts only."
        cats={CYLINDER_ONLY}
        countByCategory={countByCategory}
        onPick={onPick}
      />
      <CategoryGroup
        title="Other"
        subtitle="Screws, panels, covers — anything without a SKU."
        cats={["General Parts"]}
        countByCategory={countByCategory}
        onPick={onPick}
      />
    </div>
  );
}

function CategoryGroup({
  title,
  subtitle,
  cats,
  countByCategory,
  onPick,
}: {
  title: string;
  subtitle: string;
  cats: readonly PartCategory[];
  countByCategory: Map<string, number>;
  onPick: (c: PartCategory) => void;
}) {
  return (
    <div>
      <div className="mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </p>
        <p className="text-[11px] text-slate-400">{subtitle}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {cats.map((c) => {
          const count = countByCategory.get(c) ?? 0;
          const isGeneral = c === "General Parts";
          const dimmed = !isGeneral && count === 0;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onPick(c)}
              className={cn(
                "group flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-amber-300 hover:shadow-sm",
                dimmed && "opacity-60",
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {categoryLabel(c)}
                </p>
                <p className="text-[11px] text-slate-500">
                  {isGeneral
                    ? "Manual entry — no SKU"
                    : count === 0
                      ? "No parts uploaded yet"
                      : `${count} part${count === 1 ? "" : "s"}`}
                </p>
              </div>
              <span
                className={cn(
                  "ml-3 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  PART_CATEGORY_COLOR[c],
                )}
              >
                {categoryLabel(c).split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Step 2: SKU table ---------- */

function SkuTable({
  skus,
  qtys,
  setQty,
}: {
  skus: PartOption[];
  qtys: Map<string, number>;
  setQty: (partId: string, qty: number) => void;
}) {
  if (skus.length === 0) {
    return (
      <p className="text-xs text-slate-400 py-6 text-center">
        No parts here. Try a different category or clear the search.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left font-medium">SKU</th>
            <th className="px-3 py-2 text-left font-medium">Name</th>
            <th className="w-24 px-3 py-2 text-right font-medium">Qty</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {skus.map((p) => {
            const qty = qtys.get(p.id) ?? 0;
            return (
              <tr
                key={p.id}
                className={qty > 0 ? "bg-amber-50/40" : "hover:bg-slate-50"}
              >
                <td className="px-3 py-1.5 font-mono text-xs text-slate-700">
                  {p.sku}
                </td>
                <td className="px-3 py-1.5 text-slate-800">{p.name}</td>
                <td className="px-3 py-1.5 text-right">
                  <Input
                    type="number"
                    min={0}
                    value={qty}
                    onChange={(e) =>
                      setQty(p.id, Number(e.target.value) || 0)
                    }
                    className="ml-auto h-8 w-20 text-center"
                    aria-label={`Quantity for ${p.sku}`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Step 2 (General): manual rows ---------- */

function GeneralPartsPanel({
  rows,
  onAdd,
  onUpdate,
  onRemove,
}: {
  rows: GeneralRow[];
  onAdd: () => void;
  onUpdate: (key: string, patch: Partial<GeneralRow>) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Manually enter parts without a SKU — screws, panels, covers, etc. Blank
        rows are skipped when you click Add.
      </p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-12 items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5"
          >
            <Input
              value={row.description}
              onChange={(e) =>
                onUpdate(row.key, { description: e.target.value })
              }
              placeholder="Description (e.g. Screws 1/4 in, Panel cover)"
              className="col-span-12 h-9 md:col-span-9"
            />
            <Input
              type="number"
              min={1}
              value={row.quantity}
              onChange={(e) =>
                onUpdate(row.key, {
                  quantity: Math.max(1, Number(e.target.value) || 1),
                })
              }
              aria-label="Quantity"
              placeholder="Qty"
              className="col-span-11 h-9 text-center md:col-span-2"
            />
            <button
              type="button"
              onClick={() => onRemove(row.key)}
              aria-label="Remove row"
              className="col-span-1 inline-flex h-9 w-9 items-center justify-center justify-self-end rounded-md text-rose-500 hover:bg-rose-50"
              disabled={rows.length === 1}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900"
      >
        <Plus className="h-3.5 w-3.5" /> Add another
      </button>
    </div>
  );
}
