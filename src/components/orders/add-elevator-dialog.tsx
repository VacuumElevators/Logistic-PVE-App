"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import {
  ELEVATOR_COLORS,
  ELEVATOR_KIND_OPTIONS,
  ENGINE_OPTIONS,
  type ElevatorKindKey,
  type EngineKey,
  type ElevatorModelCode,
  type StopConfig,
} from "@/lib/constants";
import {
  StopConfigGrid,
  defaultStopsConfig,
  reconcileStopsConfig,
} from "@/components/elevators/stop-config-grid";
import { cn } from "@/lib/utils";

export interface ElevatorDraft {
  elevatorKind: ElevatorKindKey;
  modelId: string;
  modelLabel: string;
  modelCode: ElevatorModelCode;
  engine: EngineKey;
  color: string;
  stops: number;
  stopsConfig: StopConfig[];
  quantity: number;
  /** Free-text requirements/clarifications not covered by the options. */
  comments: string;
  withCabin: boolean;
  electricClosing: boolean;
  transparentPolycarbonate: boolean;
  disassembled: boolean;
  foldableSeat: boolean;
  gsm: boolean;
  lowNoiseMotor: boolean;
  telephone: boolean;
  /** Free-text dimensions for the intermediate section, e.g. "1200 × 800 mm". */
  intermediateSection: string;
}

interface ElevatorModelOption {
  id: string;
  modelCode: string;
  name: string;
  stops: number;
}

interface Props {
  open: boolean;
  models: ElevatorModelOption[];
  onClose: () => void;
  onConfirm: (draft: ElevatorDraft) => void;
  /** When present the dialog opens pre-filled — i.e. editing an existing elevator. */
  initial?: Partial<ElevatorDraft>;
}

const COMMENTS_MAX = 1000;

/**
 * Seed every field from `initial` where given, else the add-new defaults.
 * `stops` and `stopsConfig` are always derived together so the per-stop grid
 * can't be clamped away by the reconcile effect on first render.
 */
function seedFrom(
  initial: Partial<ElevatorDraft> | undefined,
  models: ElevatorModelOption[],
) {
  const fallbackModel = models[0];
  const modelId = initial?.modelId ?? fallbackModel?.id ?? "";
  const model = models.find((m) => m.id === modelId);
  const modelCode = (model?.modelCode ??
    initial?.modelCode ??
    null) as ElevatorModelCode | null;
  const stops = initial?.stops ?? 2;
  const stopsConfig =
    initial?.stopsConfig && initial.stopsConfig.length > 0
      ? reconcileStopsConfig(modelCode, stops, initial.stopsConfig)
      : defaultStopsConfig(modelCode, stops);

  return {
    elevatorKind: initial?.elevatorKind ?? ("CYLINDER" as ElevatorKindKey),
    modelId,
    engine: initial?.engine ?? ("NONE" as EngineKey),
    color: initial?.color ?? "White",
    stops,
    stopsConfig,
    quantity: initial?.quantity ?? 1,
    comments: initial?.comments ?? "",
    withCabin: initial?.withCabin ?? true,
    electricClosing: initial?.electricClosing ?? false,
    transparentPolycarbonate: initial?.transparentPolycarbonate ?? false,
    disassembled: initial?.disassembled ?? false,
    foldableSeat: initial?.foldableSeat ?? false,
    gsm: initial?.gsm ?? false,
    lowNoiseMotor: initial?.lowNoiseMotor ?? false,
    telephone: initial?.telephone ?? false,
    intermediateSection: initial?.intermediateSection ?? "",
  };
}

export function AddElevatorDialog({
  open,
  models,
  onClose,
  onConfirm,
  initial,
}: Props) {
  const isEdit = initial != null;
  // Seeded once per mount. Callers mount this dialog only while it's open and
  // key it per edit target, so a fresh open always gets fresh state — no
  // reset-on-open effect (and no re-seeding from an inline `initial` object,
  // which would wipe input on every parent re-render).
  const [state, setState] = React.useState(() => seedFrom(initial, models));

  function set<K extends keyof ReturnType<typeof seedFrom>>(
    key: K,
    value: ReturnType<typeof seedFrom>[K],
  ) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  // Portal target is only available on the client — gate the render so SSR/
  // hydration stays consistent.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const model = models.find((m) => m.id === state.modelId);
  const modelCode = (model?.modelCode ?? null) as ElevatorModelCode | null;
  const maxStops = model?.stops ?? 5;
  // CUBE (CUBE36) does not offer transparent polycarbonate.
  const isCube = modelCode === "CUBE";
  // Editing an elevator whose model has since been deactivated: it isn't in the
  // options list, so the user has to re-pick one before saving.
  const modelUnavailable = !model && !!initial?.modelId;

  // Reconcile stopsConfig whenever model or stops change.
  React.useEffect(() => {
    setState((prev) => ({
      ...prev,
      stopsConfig: reconcileStopsConfig(modelCode, prev.stops, prev.stopsConfig),
    }));
  }, [modelCode, state.stops]);

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // If a combobox/date popover is open, let it handle Escape — don't also
      // close the whole dialog.
      if (document.querySelector("[data-radix-popper-content-wrapper]")) return;
      onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  function handleConfirm() {
    if (!model || !modelCode) return;
    onConfirm({
      elevatorKind: state.elevatorKind,
      modelId: model.id,
      modelLabel: `${model.modelCode} — ${model.name}`,
      modelCode,
      engine: state.engine,
      color: state.color,
      stops: state.stops,
      stopsConfig: state.stopsConfig,
      quantity: state.quantity,
      comments: state.comments.trim(),
      withCabin: state.withCabin,
      electricClosing: state.electricClosing,
      // CUBE (CUBE36) does not offer transparent polycarbonate — never persist it as true.
      transparentPolycarbonate: isCube ? false : state.transparentPolycarbonate,
      disassembled: state.disassembled,
      foldableSeat: state.foldableSeat,
      gsm: state.gsm,
      lowNoiseMotor: state.lowNoiseMotor,
      telephone: state.telephone,
      intermediateSection: state.intermediateSection.trim(),
    });
  }

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

      <div className="relative w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10 animate-fade-in max-h-[90vh]">
        {/* Amber header */}
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-amber-400 to-amber-300 px-5 py-3">
          <h3 className="text-base font-bold text-slate-900">
            {isEdit ? "Edit Elevator / Cylinder" : "Add Elevator / Cylinder"}
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-800">
                Quantity
              </span>
              <NumberStepper
                value={state.quantity}
                onChange={(n) => set("quantity", n)}
              />
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
        </div>

        {modelUnavailable && (
          <div className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-600" />
            <p className="text-xs text-amber-800">
              This elevator&apos;s original model is no longer available. Pick a
              model to continue — the rest of the configuration has been kept.
            </p>
          </div>
        )}

        {/* Top row of selects */}
        <div className="grid gap-2 px-5 pt-4 sm:grid-cols-6">
          <Field label="Kind">
            <Combobox
              aria-label="Kind"
              value={state.elevatorKind}
              onChange={(v) => set("elevatorKind", v as ElevatorKindKey)}
              className="h-9"
              options={ELEVATOR_KIND_OPTIONS.map((k) => ({
                value: k.value,
                label: k.label,
              }))}
            />
          </Field>
          <Field label="Model">
            <Combobox
              aria-label="Model"
              value={state.modelId}
              onChange={(v) => set("modelId", v)}
              className="h-9"
              placeholder="— No models —"
              options={models.map((m) => ({
                value: m.id,
                label: m.modelCode,
              }))}
            />
          </Field>
          <Field label="Engine">
            <Combobox
              aria-label="Engine"
              value={state.engine}
              onChange={(v) => set("engine", v as EngineKey)}
              className="h-9"
              options={ENGINE_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
            />
          </Field>
          <Field label="Color">
            <Combobox
              aria-label="Color"
              value={state.color}
              onChange={(v) => set("color", v)}
              className="h-9"
              options={[
                ...ELEVATOR_COLORS.filter((c) => c.name !== "Custom").map(
                  (c) => ({ value: c.name, label: c.name }),
                ),
                { value: "Custom", label: "Custom" },
              ]}
            />
          </Field>
          <Field label="Stops">
            <Combobox
              aria-label="Stops"
              value={String(state.stops)}
              onChange={(v) => set("stops", Number(v))}
              className="h-9"
              options={[2, 3, 4, 5].map((s) => ({
                value: String(s),
                label: `${s} stops`,
                disabled: s > maxStops,
              }))}
            />
          </Field>
          <Field label="Qty">
            <Input
              type="number"
              min={1}
              value={state.quantity}
              onChange={(e) =>
                set("quantity", Math.max(1, Number(e.target.value) || 1))
              }
              className="h-9 text-center"
            />
          </Field>
        </div>

        {/* Comments */}
        <div className="px-5 pt-3">
          <Field label="Comments">
            <Textarea
              value={state.comments}
              onChange={(e) => set("comments", e.target.value)}
              maxLength={COMMENTS_MAX}
              placeholder="Special requirements or clarifications not covered by the options above"
              className="min-h-[64px]"
            />
          </Field>
        </div>

        {/* Body: per-stop config + flags */}
        <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
          {/* Per-stop config */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Per-stop door & position
            </p>
            <StopConfigGrid
              model={modelCode}
              stops={state.stops}
              value={state.stopsConfig}
              onChange={(next) => set("stopsConfig", next)}
            />
            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={state.disassembled}
                onChange={(e) => set("disassembled", e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              Disassembled
            </label>
          </div>

          {/* Feature flags */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Options
            </p>
            <CheckRow
              checked={state.withCabin}
              onChange={(v) => set("withCabin", v)}
              label="With Cabin"
              accent="indigo"
            />
            <CheckRow
              checked={state.electricClosing}
              onChange={(v) => set("electricClosing", v)}
              label="Electric closing"
            />
            {!isCube && (
              <CheckRow
                checked={state.transparentPolycarbonate}
                onChange={(v) => set("transparentPolycarbonate", v)}
                label="Transparent polycarbonate"
              />
            )}
            <CheckRow
              checked={state.foldableSeat}
              onChange={(v) => set("foldableSeat", v)}
              label="Foldable seat"
            />
            <CheckRow
              checked={state.gsm}
              onChange={(v) => set("gsm", v)}
              label="GSM"
            />
            <CheckRow
              checked={state.lowNoiseMotor}
              onChange={(v) => set("lowNoiseMotor", v)}
              label="Low-noise motor"
            />
            <CheckRow
              checked={state.telephone}
              onChange={(v) => set("telephone", v)}
              label="Telephone"
            />
            <div className="pt-1">
              <Field label="Intermediate section dimensions">
                <Input
                  value={state.intermediateSection}
                  onChange={(e) => set("intermediateSection", e.target.value)}
                  maxLength={200}
                  placeholder="e.g. 1200 × 800 mm"
                  className="h-9"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!model}>
            {isEdit ? "Save changes" : "Done"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-medium text-slate-600">{label}</Label>
      {children}
    </div>
  );
}

function NumberStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-slate-300 bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="px-1.5 h-7 text-slate-600 hover:text-slate-900"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
        className="h-7 w-10 text-center text-sm text-slate-900 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="px-1.5 h-7 text-slate-600 hover:text-slate-900"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  accent,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  accent?: "indigo" | "default";
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 rounded-md border bg-white px-2.5 py-1.5 text-xs text-slate-700 cursor-pointer transition",
        checked && accent === "indigo"
          ? "border-indigo-300 bg-indigo-50/60 text-indigo-800"
          : checked
            ? "border-slate-300"
            : "border-slate-200 hover:border-slate-300",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={cn(
          "h-3.5 w-3.5 rounded border-slate-300 focus:ring-2",
          accent === "indigo"
            ? "text-indigo-600 focus:ring-indigo-500"
            : "text-slate-600 focus:ring-slate-400",
        )}
      />
      {label}
    </label>
  );
}
