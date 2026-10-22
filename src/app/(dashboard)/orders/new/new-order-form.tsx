"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import {
  AddElevatorDialog,
  type ElevatorDraft,
} from "@/components/orders/add-elevator-dialog";
import {
  AddPartsDialog,
  type PartAddition,
} from "@/components/orders/add-parts-dialog";
import {
  configFromDraft,
  draftInitialFromItem,
  type ElevatorConfig,
} from "@/components/orders/elevator-item";
import { ORDER_LOCATIONS, LOCATION_META } from "@/lib/constants";
import { buildElevatorSummary } from "@/lib/elevator-summary";
import { apiFetch } from "@/lib/api-fetch";

interface Customer {
  id: string;
  name: string;
  location: string;
}
interface ElevatorModel {
  id: string;
  modelCode: string;
  name: string;
  stops: number;
}
interface Part {
  id: string;
  sku: string;
  name: string;
  category: string;
}

interface FormItem {
  key: string;
  kind: "ELEVATOR" | "PART" | "GENERAL";
  refId: string;
  description: string;
  quantity: number;
  config?: ElevatorConfig;
}

interface Props {
  customers: Customer[];
  elevatorModels: ElevatorModel[];
  parts: Part[];
  defaultOrigin?: string;
}

export function NewOrderForm({
  customers,
  elevatorModels,
  parts,
  defaultOrigin,
}: Props) {
  const router = useRouter();
  // PVE Argentina is hidden from order details (customer/origin/destination).
  const orderCustomers = customers.filter((c) => c.location !== "ARGENTINA");
  const [customerId, setCustomerId] = React.useState(orderCustomers[0]?.id ?? "");
  const [origin, setOrigin] = React.useState<string>(defaultOrigin ?? "USA");
  const [dest, setDest] = React.useState<string>(
    ORDER_LOCATIONS.find((l) => l !== (defaultOrigin ?? "USA")) ?? "SPAIN",
  );
  const [notes, setNotes] = React.useState("");
  const [items, setItems] = React.useState<FormItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showElevatorDialog, setShowElevatorDialog] = React.useState(false);
  const [showPartsDialog, setShowPartsDialog] = React.useState(false);
  // Set while editing an existing elevator row; null when adding a new one.
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [elevatorInitial, setElevatorInitial] = React.useState<
    Partial<ElevatorDraft> | undefined
  >(undefined);

  const [fillPercent, setFillPercent] = React.useState<string>("");
  const [orderType, setOrderType] = React.useState<"CONTAINER" | "AIRFREIGHT">(
    "CONTAINER",
  );

  function openAddElevator() {
    // Always clear edit state, else "+ Elevator" would reopen the last edit.
    setEditingKey(null);
    setElevatorInitial(undefined);
    setShowElevatorDialog(true);
  }

  function openEditElevator(item: FormItem) {
    setEditingKey(item.key);
    setElevatorInitial(draftInitialFromItem(item, elevatorModels));
    setShowElevatorDialog(true);
  }

  function closeElevatorDialog() {
    setShowElevatorDialog(false);
    setEditingKey(null);
    setElevatorInitial(undefined);
  }

  function upsertElevatorFromDialog(draft: ElevatorDraft) {
    const description = buildElevatorSummary(draft);
    const config = configFromDraft(draft);
    setItems((prev) =>
      editingKey
        ? prev.map((i) =>
            i.key === editingKey
              ? {
                  ...i,
                  refId: draft.modelId,
                  description,
                  quantity: draft.quantity,
                  config,
                }
              : i,
          )
        : [
            ...prev,
            {
              key: crypto.randomUUID(),
              kind: "ELEVATOR" as const,
              refId: draft.modelId,
              description,
              quantity: draft.quantity,
              config,
            },
          ],
    );
    closeElevatorDialog();
  }

  // Approximate pallet count = total elevator quantity. Container packing logic
  // is deferred (per 2026-05-28 PVE call) — this is a rough hint, not a
  // blocker.
  const totalElevatorQty = items
    .filter((i) => i.kind === "ELEVATOR")
    .reduce((s, i) => s + i.quantity, 0);

  function addPartsFromDialog(additions: PartAddition[]) {
    setItems((prev) => [
      ...prev,
      ...additions.map((a) => ({
        key: crypto.randomUUID(),
        kind: a.kind, // "PART" or "GENERAL"
        refId: a.kind === "PART" ? a.partId : "",
        description: a.description,
        quantity: a.quantity,
      })),
    ]);
    setShowPartsDialog(false);
  }

  function updateItemQty(key: string, quantity: number) {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, quantity } : i)),
    );
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  async function submit(saveAsDraft: boolean) {
    setError(null);
    if (items.length === 0) {
      setError("Add at least one line item.");
      return;
    }
    if (items.some((i) => i.quantity < 1)) {
      setError("Every line item needs a quantity of at least 1.");
      return;
    }
    if (!customerId) {
      setError("Pick a customer for the order.");
      return;
    }

    setLoading(true);
    const res = await apiFetch("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        type: orderType,
        customerId,
        originLocation: origin,
        destLocation: dest,
        notes,
        saveAsDraft,
        fillPercent:
          orderType === "CONTAINER" && fillPercent ? Number(fillPercent) : null,
        items: items.map((i) => ({
          kind: i.kind,
          refId: i.kind === "GENERAL" ? undefined : i.refId,
          description: i.description,
          quantity: i.quantity,
          configJson: i.config ?? null,
        })),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json?.error ?? "Failed to create order.");
      return;
    }
    router.push(`/orders/${json.data.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-3 min-w-0">
      <ShipmentTypeToggle value={orderType} onChange={setOrderType} />
      <div className="grid items-start gap-3 lg:grid-cols-2">
        {/* Step 1 — Order details */}
        <Card className="p-4">
          <Section step={1} title="Order details" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer">
              <Combobox
                aria-label="Customer"
                value={customerId}
                onChange={setCustomerId}
                className="h-9"
                placeholder="Select a customer"
                options={orderCustomers.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
              />
            </Field>

            <Field label="Origin">
              <Combobox
                aria-label="Origin"
                value={origin}
                onChange={setOrigin}
                className="h-9"
                options={ORDER_LOCATIONS.map((l) => ({
                  value: l,
                  label: LOCATION_META[l].label,
                }))}
              />
            </Field>
            <Field label="Destination">
              <Combobox
                aria-label="Destination"
                value={dest}
                onChange={setDest}
                className="h-9"
                options={ORDER_LOCATIONS.map((l) => ({
                  value: l,
                  label: LOCATION_META[l].label,
                }))}
              />
            </Field>

            {orderType === "CONTAINER" && (
              <Field label="Fill % (optional)">
                <Combobox
                  aria-label="Container fill percentage"
                  value={fillPercent}
                  onChange={setFillPercent}
                  className="h-9"
                  placeholder="— Not set —"
                  options={[0, 10, 25, 50, 75, 90, 100].map((n) => ({
                    value: String(n),
                    label: `${n}%`,
                  }))}
                />
              </Field>
            )}

            <Field label="Notes" className="sm:col-span-2">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes for approval / shipping"
                className="min-h-[56px]"
              />
            </Field>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Section step={2} title="Line items" inline />
              {orderType === "CONTAINER" && totalElevatorQty > 0 && (
                <span className="text-xs text-slate-500">
                  ≈ {totalElevatorQty} pallet{totalElevatorQty === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={openAddElevator}
              >
                <Plus className="h-3.5 w-3.5" /> Elevator
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowPartsDialog(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Part
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {items.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
                <Plus className="h-5 w-5 text-slate-300" />
                <p className="text-xs text-slate-400">
                  No items yet. Add an elevator or a replacement part.
                </p>
              </div>
            )}
            {items.map((item) => (
              <div
                key={item.key}
                className="grid grid-cols-12 gap-2 items-center rounded-lg border border-slate-100 px-2 py-1.5 transition-colors hover:border-slate-200 hover:bg-slate-50/60"
              >
                <div className="col-span-12 md:col-span-8 min-w-0">
                  <p className="text-sm text-slate-800 truncate">
                    {item.description}
                  </p>
                  {item.config?.comments && (
                    <p className="text-xs text-slate-500 truncate">
                      {item.config.comments}
                    </p>
                  )}
                  {item.kind === "GENERAL" && (
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">
                      General part
                    </p>
                  )}
                </div>
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    updateItemQty(
                      item.key,
                      Math.max(1, Number(e.target.value) || 1),
                    )
                  }
                  aria-label="Quantity"
                  placeholder="Qty"
                  className="col-span-10 md:col-span-2 h-9 text-center"
                />
                {item.kind === "ELEVATOR" ? (
                  <button
                    type="button"
                    onClick={() => openEditElevator(item)}
                    aria-label="Edit elevator"
                    className="col-span-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 justify-self-end"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                ) : (
                  <div className="col-span-1" aria-hidden />
                )}
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  aria-label="Remove item"
                  className="col-span-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-rose-500 hover:bg-rose-50 justify-self-end"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            {error && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs text-rose-600">{error}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => submit(true)}
            disabled={loading}
          >
            Save as draft
          </Button>
          <Button
            type="button"
            onClick={() => submit(false)}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              "Submit for approval"
            )}
          </Button>
        </div>

      {showElevatorDialog && (
        <AddElevatorDialog
          key={editingKey ?? "new"}
          open
          models={elevatorModels}
          initial={elevatorInitial}
          onClose={closeElevatorDialog}
          onConfirm={upsertElevatorFromDialog}
        />
      )}
      {showPartsDialog && (
        <AddPartsDialog
          parts={parts}
          onClose={() => setShowPartsDialog(false)}
          onConfirm={addPartsFromDialog}
        />
      )}
    </div>
  );
}

/* ---------- compact helpers ---------- */

function Section({
  step,
  title,
  inline = false,
}: {
  step: number;
  title: string;
  inline?: boolean;
}) {
  return (
    <div className={inline ? "" : "mb-3"}>
      <div className="flex items-center gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-[10px] font-semibold text-brand-700">
          {step}
        </span>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <label className="text-[11px] font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function ShipmentTypeToggle({
  value,
  onChange,
}: {
  value: "CONTAINER" | "AIRFREIGHT";
  onChange: (v: "CONTAINER" | "AIRFREIGHT") => void;
}) {
  const options: { value: "CONTAINER" | "AIRFREIGHT"; label: string }[] = [
    { value: "CONTAINER", label: "Container (sea)" },
    { value: "AIRFREIGHT", label: "Airfreight" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === o.value
              ? "bg-brand-50 text-brand-700"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
