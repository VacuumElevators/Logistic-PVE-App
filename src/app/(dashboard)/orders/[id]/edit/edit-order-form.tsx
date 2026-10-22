"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Info, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
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
import { buildElevatorSummary } from "@/lib/elevator-summary";
import { apiFetch } from "@/lib/api-fetch";
import { locationLabel } from "@/lib/utils";

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

export interface ExistingItem {
  kind: "ELEVATOR" | "PART" | "GENERAL";
  refId: string;
  description: string;
  quantity: number;
  configJson: unknown;
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
  orderId: string;
  isModification: boolean;
  header: {
    orderNumber: string;
    origin: string;
    dest: string;
    customerName: string | null;
    type: string;
    containerNumber: string | null;
    airNumber: string | null;
  };
  initialNotes: string;
  initialItems: ExistingItem[];
  elevatorModels: ElevatorModel[];
  parts: Part[];
}

export function EditOrderForm({
  orderId,
  isModification,
  header,
  initialNotes,
  initialItems,
  elevatorModels,
  parts,
}: Props) {
  const router = useRouter();
  const [notes, setNotes] = React.useState(initialNotes);
  const [items, setItems] = React.useState<FormItem[]>(() =>
    initialItems.map((it) => ({
      key: crypto.randomUUID(),
      kind: it.kind,
      refId: it.refId,
      description: it.description,
      quantity: it.quantity,
      config: (it.configJson ?? undefined) as FormItem["config"],
    })),
  );
  const [showElevatorDialog, setShowElevatorDialog] = React.useState(false);
  const [showPartsDialog, setShowPartsDialog] = React.useState(false);
  // Set while editing an existing elevator row; null when adding a new one.
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [elevatorInitial, setElevatorInitial] = React.useState<
    Partial<ElevatorDraft> | undefined
  >(undefined);
  const [saving, setSaving] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const totalElevatorQty = items
    .filter((i) => i.kind === "ELEVATOR")
    .reduce((s, i) => s + i.quantity, 0);

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

  function addPartsFromDialog(additions: PartAddition[]) {
    setItems((prev) => [
      ...prev,
      ...additions.map((a) => ({
        key: crypto.randomUUID(),
        kind: a.kind,
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

  function buildPatchBody() {
    return {
      notes,
      items: items.map((i) => ({
        kind: i.kind,
        refId: i.kind === "GENERAL" ? undefined : i.refId,
        description: i.description,
        quantity: i.quantity,
        configJson: i.config ?? null,
      })),
    };
  }

  function validate(): string | null {
    if (items.length === 0) return "Add at least one line item.";
    if (items.some((i) => i.quantity < 1))
      return "Every line item needs a quantity of at least 1.";
    return null;
  }

  async function save() {
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    const res = await apiFetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify(buildPatchBody()),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(json?.error ?? "Failed to save.");
      return;
    }
    router.refresh();
  }

  async function saveAndSubmit() {
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    const saveRes = await apiFetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify(buildPatchBody()),
    });
    if (!saveRes.ok) {
      const json = await saveRes.json().catch(() => ({}));
      setSubmitting(false);
      setError(json?.error ?? "Failed to save before submit.");
      return;
    }
    const submitRes = await apiFetch(`/api/orders/${orderId}/submit`, {
      method: "POST",
    });
    setSubmitting(false);
    if (!submitRes.ok) {
      const json = await submitRes.json().catch(() => ({}));
      setError(json?.error ?? "Failed to submit.");
      return;
    }
    router.push(`/orders/${orderId}`);
    router.refresh();
  }

  return (
    <div className="space-y-3 min-w-0">
      {isModification && (
        <Card className="p-3 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-none" />
            <div className="text-xs text-amber-800">
              <p className="font-medium">Modification mode</p>
              <p>
                Only items and notes can be changed. Route, customer, and
                container stay locked to the original commit. Submitting will
                notify the receiving region for re-approval.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <ReadOnly label="Customer" value={header.customerName ?? "—"} />
          <ReadOnly label="Origin" value={locationLabel(header.origin)} />
          <ReadOnly label="Destination" value={locationLabel(header.dest)} />
          <ReadOnly
            label={header.type === "AIRFREIGHT" ? "Air #" : "Container"}
            value={
              header.type === "AIRFREIGHT"
                ? (header.airNumber ?? "—")
                : (header.containerNumber ?? "—")
            }
          />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Line items</h3>
            {totalElevatorQty > 0 && (
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
            <p className="text-xs text-slate-400 py-3 text-center">
              No items yet. Add an elevator or a replacement part.
            </p>
          )}
          {items.map((item) => (
            <div
              key={item.key}
              className="grid grid-cols-12 gap-2 items-center rounded-lg border border-slate-100 px-2 py-1.5"
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
        </div>
      </Card>

      <Card className="p-4">
        <label className="text-[11px] font-medium text-slate-600 mb-1 block">
          Notes
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes for approval / shipping"
          className="min-h-[56px]"
        />
      </Card>

      {error && (
        <Card className="p-3 border-rose-200 bg-rose-50">
          <p className="text-xs text-rose-700">{error}</p>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(`/orders/${orderId}`)}
          disabled={saving || submitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={save}
          disabled={saving || submitting}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            "Save"
          )}
        </Button>
        <Button
          type="button"
          onClick={saveAndSubmit}
          disabled={saving || submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
            </>
          ) : (
            "Save & submit for approval"
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

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm text-slate-900">{value}</p>
    </div>
  );
}
