import type {
  ElevatorKindKey,
  ElevatorModelCode,
  EngineKey,
  StopConfig,
} from "@/lib/constants";
import { buildElevatorSummary } from "@/lib/elevator-summary";
import type { ElevatorDraft } from "./add-elevator-dialog";

/**
 * The configJson blob stored on an ELEVATOR line item. Free-form on the server
 * (only a 5KB cap), so every field is optional — older rows predate the newer
 * options and legacy rows may have no config at all.
 */
export interface ElevatorConfig {
  elevatorKind?: ElevatorKindKey;
  engine?: EngineKey;
  color?: string;
  stops?: number;
  stopsConfig?: StopConfig[];
  withCabin?: boolean;
  electricClosing?: boolean;
  transparentPolycarbonate?: boolean;
  disassembled?: boolean;
  foldableSeat?: boolean;
  gsm?: boolean;
  lowNoiseMotor?: boolean;
  telephone?: boolean;
  intermediateSection?: string;
  comments?: string;
}

interface ModelOption {
  id: string;
  modelCode: string;
  name: string;
}

/** Flatten a confirmed draft into the configJson blob we persist. */
export function configFromDraft(draft: ElevatorDraft): ElevatorConfig {
  return {
    elevatorKind: draft.elevatorKind,
    engine: draft.engine,
    color: draft.color,
    stops: draft.stops,
    stopsConfig: draft.stopsConfig,
    withCabin: draft.withCabin,
    electricClosing: draft.electricClosing,
    transparentPolycarbonate: draft.transparentPolycarbonate,
    disassembled: draft.disassembled,
    foldableSeat: draft.foldableSeat,
    gsm: draft.gsm,
    lowNoiseMotor: draft.lowNoiseMotor,
    telephone: draft.telephone,
    intermediateSection: draft.intermediateSection,
    comments: draft.comments,
  };
}

/**
 * Rebuild the dialog's pre-fill from a stored line item.
 *
 * `quantity` and the model label live outside `config`, so they're read from the
 * item and the model catalog. If the stored description isn't what we'd generate
 * today it was hand-typed under the old single-field behaviour — carry it into
 * Comments rather than silently overwriting it.
 */
export function draftInitialFromItem(
  item: {
    refId: string;
    description: string;
    quantity: number;
    config?: ElevatorConfig;
  },
  models: ModelOption[],
): Partial<ElevatorDraft> {
  const cfg = item.config ?? {};
  const model = models.find((m) => m.id === item.refId);
  const regenerated = model
    ? buildElevatorSummary({
        ...cfg,
        modelLabel: `${model.modelCode} — ${model.name}`,
        elevatorKind: cfg.elevatorKind ?? "CYLINDER",
        color: cfg.color ?? "White",
        stops: cfg.stops ?? 2,
      })
    : null;
  const comments =
    cfg.comments ??
    (regenerated !== null && item.description === regenerated
      ? ""
      : item.description);

  return {
    ...cfg,
    modelId: item.refId,
    modelCode: model?.modelCode as ElevatorModelCode | undefined,
    quantity: item.quantity,
    comments,
  };
}
