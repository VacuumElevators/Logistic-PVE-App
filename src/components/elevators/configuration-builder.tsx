"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { OptionCard } from "./option-card";
import { ColorPicker } from "./color-picker";
import { StopsPicker } from "./stops-picker";
import {
  StopConfigGrid,
  defaultStopsConfig,
  formatStopsConfigShort,
  reconcileStopsConfig,
} from "./stop-config-grid";
import {
  ELEVATOR_KIND_OPTIONS,
  ENGINE_OPTIONS,
  allowedPositions,
  type ElevatorKindKey,
  type EngineKey,
  type ElevatorModelCode,
  type StopConfig,
} from "@/lib/constants";
import { apiFetch } from "@/lib/api-fetch";

export interface ConfigBuilderModel {
  id: string;
  modelCode: string;
  name: string;
  description: string | null;
  capacity: number;
  stops: number; // max
}

interface InitialValues {
  id?: string;
  name?: string;
  modelId: string;
  elevatorKind?: ElevatorKindKey;
  engine?: EngineKey;
  color: string;
  stops: number;
  stopsConfig?: StopConfig[] | null;
  quantity: number;
  notes?: string | null;
}

interface Props {
  mode: "create" | "edit";
  models: ConfigBuilderModel[];
  initial?: Partial<InitialValues>;
  canDelete?: boolean;
  configId?: string;
}

export function ConfigurationBuilder({
  mode,
  models,
  initial,
  canDelete = false,
  configId,
}: Props) {
  const router = useRouter();

  const firstModel = models[0];
  const [modelId, setModelId] = React.useState<string>(
    initial?.modelId ?? firstModel?.id ?? "",
  );
  const [elevatorKind, setElevatorKind] = React.useState<ElevatorKindKey>(
    initial?.elevatorKind ?? "CYLINDER",
  );
  const [engine, setEngine] = React.useState<EngineKey>(
    initial?.engine ?? "NONE",
  );
  const [color, setColor] = React.useState<string>(initial?.color ?? "White");
  const [stops, setStops] = React.useState<number>(initial?.stops ?? 3);
  const [stopsConfig, setStopsConfig] = React.useState<StopConfig[]>(
    initial?.stopsConfig && initial.stopsConfig.length > 0
      ? initial.stopsConfig
      : defaultStopsConfig(
          (firstModel?.modelCode as ElevatorModelCode | undefined) ?? null,
          initial?.stops ?? 3,
        ),
  );
  const [quantity, setQuantity] = React.useState<number>(initial?.quantity ?? 1);
  const [name, setName] = React.useState<string>(initial?.name ?? "");
  const [notes, setNotes] = React.useState<string>(initial?.notes ?? "");

  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const selectedModel =
    models.find((m) => m.id === modelId) ?? firstModel ?? null;
  const modelCode = (selectedModel?.modelCode ?? null) as
    | ElevatorModelCode
    | null;

  // Auto-clamp stops when the selected model has a smaller maximum.
  React.useEffect(() => {
    if (selectedModel && stops > selectedModel.stops) {
      setStops(selectedModel.stops);
    }
  }, [selectedModel, stops]);

  // Reconcile stopsConfig whenever model or stops change.
  // Switching to a model whose position set is narrower may clamp prior choices.
  React.useEffect(() => {
    setStopsConfig((prev) => reconcileStopsConfig(modelCode, stops, prev));
  }, [modelCode, stops]);

  // Auto-generate a name in create mode so users don't have to think.
  React.useEffect(() => {
    if (mode !== "create") return;
    if (!selectedModel) return;
    const autoName = `${selectedModel.modelCode} · ${elevatorKind} · ${color} · ${stops} stops`;
    setName(autoName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel?.id, elevatorKind, color, stops]);

  function validate(): string | null {
    if (!selectedModel) return "Pick a model.";
    if (name.trim().length < 2) return "Give this configuration a name.";
    if (![2, 3, 4, 5].includes(stops)) return "Stops must be 2, 3, 4 or 5.";
    if (stops > selectedModel.stops) {
      return `${selectedModel.name} supports up to ${selectedModel.stops} stops.`;
    }
    if (quantity < 1 || quantity > 99)
      return "Quantity must be between 1 and 99.";
    if (!color.trim()) return "Pick a color.";
    if (stopsConfig.length !== stops) {
      return "Stops configuration is out of sync. Pick the number of stops again.";
    }
    for (const row of stopsConfig) {
      if (!modelCode) break;
      const allowed = allowedPositions(modelCode, row.stop);
      if (!allowed.includes(row.position)) {
        return `Position ${row.position}° is not allowed for stop P${row.stop} on ${modelCode}.`;
      }
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setLoading(true);

    const url =
      mode === "create"
        ? "/api/elevator-configurations"
        : `/api/elevator-configurations/${configId}`;

    const res = await apiFetch(url, {
      method: mode === "create" ? "POST" : "PATCH",
      body: JSON.stringify({
        name: name.trim(),
        modelId,
        elevatorKind,
        engine,
        color: color.trim(),
        stops,
        stopsConfig,
        quantity,
        notes: notes.trim() || null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(json?.error ?? "Failed to save configuration.");
      return;
    }
    if (mode === "create") {
      router.push(`/elevators/${json.data.id}`);
    } else {
      router.refresh();
    }
  }

  async function performDelete() {
    if (!configId) return;
    setDeleting(true);
    const res = await apiFetch(`/api/elevator-configurations/${configId}`, {
      method: "DELETE",
    });
    setDeleting(false);
    setConfirmingDelete(false);
    if (res.ok) router.push("/elevators");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Elevator Kind */}
          <Card>
            <CardHeader>
              <CardTitle>1. Elevator kind</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                role="radiogroup"
                aria-label="Elevator kind"
                className="grid gap-3 sm:grid-cols-2"
              >
                {ELEVATOR_KIND_OPTIONS.map((k) => (
                  <OptionCard
                    key={k.value}
                    selected={elevatorKind === k.value}
                    onSelect={() => setElevatorKind(k.value)}
                    title={k.label}
                    subtitle={k.value === "CYLINDER" ? "Hydraulic cylinder PVE" : "Self-supported cube"}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Model */}
          <Card>
            <CardHeader>
              <CardTitle>2. Choose a model</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                role="radiogroup"
                aria-label="Elevator model"
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                {models.map((m) => (
                  <OptionCard
                    key={m.id}
                    selected={modelId === m.id}
                    onSelect={() => setModelId(m.id)}
                    title={m.modelCode}
                    subtitle={`Up to ${m.stops} stops · ${m.capacity} pax`}
                    visual={
                      <div className="text-2xl font-semibold text-slate-300">
                        {m.modelCode}
                      </div>
                    }
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Engine */}
          <Card>
            <CardHeader>
              <CardTitle>3. Engine</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                role="radiogroup"
                aria-label="Elevator engine"
                className="grid gap-3 sm:grid-cols-3"
              >
                {ENGINE_OPTIONS.map((e) => (
                  <OptionCard
                    key={e.value}
                    selected={engine === e.value}
                    onSelect={() => setEngine(e.value)}
                    title={e.label}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Color */}
          <Card>
            <CardHeader>
              <CardTitle>4. Cabin color</CardTitle>
            </CardHeader>
            <CardContent>
              <ColorPicker value={color} onChange={setColor} />
            </CardContent>
          </Card>

          {/* Stops + Qty */}
          <Card>
            <CardHeader>
              <CardTitle>5. Stops & quantity</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Number of stops</Label>
                <StopsPicker
                  value={stops}
                  onChange={setStops}
                  maxStops={selectedModel?.stops ?? 5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={99}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(
                      Math.min(99, Math.max(1, Number(e.target.value) || 1)),
                    )
                  }
                  className="max-w-[8rem]"
                />
                <p className="text-xs text-slate-500">
                  Up to 99 units per configuration.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Per-stop config grid */}
          <Card>
            <CardHeader>
              <CardTitle>6. Per-stop door & position</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <StopConfigGrid
                model={modelCode}
                stops={stops}
                value={stopsConfig}
                onChange={setStopsConfig}
              />
              <p className="text-[11px] text-slate-500">
                Switching models may reset position choices that don't fit the new model.
              </p>
            </CardContent>
          </Card>

          {/* Name + notes */}
          <Card>
            <CardHeader>
              <CardTitle>7. Identify this configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Configuration name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                />
                <p className="text-xs text-slate-500">
                  This name appears in dropdowns when creating orders.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Site-specific details, finish notes, etc."
                  maxLength={500}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live summary */}
        <Card className="xl:sticky xl:top-20 h-fit">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <SummaryRow label="Kind" value={elevatorKind} />
            <SummaryRow
              label="Model"
              value={selectedModel?.modelCode ?? "—"}
            />
            <SummaryRow
              label="Engine"
              value={
                ENGINE_OPTIONS.find((e) => e.value === engine)?.label ?? engine
              }
            />
            <SummaryRow label="Color" value={color} />
            <SummaryRow label="Stops" value={String(stops)} />
            <SummaryRow
              label="Config"
              value={formatStopsConfigShort(stopsConfig)}
            />
            <SummaryRow label="Quantity" value={String(quantity)} />
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        {canDelete ? (
          <Button
            type="button"
            variant="danger"
            onClick={() => setConfirmingDelete(true)}
            disabled={loading || deleting}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete configuration
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : mode === "create" ? (
              "Save configuration"
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this configuration?"
        description="The configuration template will be removed. Existing orders that already referenced it are not affected."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={performDelete}
      />
    </form>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
