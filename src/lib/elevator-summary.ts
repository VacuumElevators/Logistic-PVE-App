import type { ElevatorKindKey } from "./constants";

/**
 * The subset of an elevator draft/config needed to describe it in one line.
 * Kept structural (not tied to ElevatorDraft) so both the new-order and
 * edit-order forms can build it from either a dialog draft or a stored
 * configJson blob.
 */
export interface ElevatorSummaryInput {
  modelLabel: string;
  elevatorKind: ElevatorKindKey | string;
  color: string;
  stops: number;
  withCabin?: boolean;
  electricClosing?: boolean;
  transparentPolycarbonate?: boolean;
  disassembled?: boolean;
  foldableSeat?: boolean;
  gsm?: boolean;
  lowNoiseMotor?: boolean;
  telephone?: boolean;
  intermediateSection?: string;
}

/**
 * One-line spec summary stored as OrderItem.description. The user's free-text
 * Comments live separately in configJson.comments — the two are never merged,
 * so a comment can't hide the spec (and vice versa).
 */
export function buildElevatorSummary(input: ElevatorSummaryInput): string {
  const flags = [
    input.withCabin ? "with cabin" : null,
    input.electricClosing ? "electric closing" : null,
    input.transparentPolycarbonate ? "transparent polycarbonate" : null,
    input.disassembled ? "disassembled" : null,
    input.foldableSeat ? "foldable seat" : null,
    input.gsm ? "GSM" : null,
    input.lowNoiseMotor ? "low-noise motor" : null,
    input.telephone ? "telephone" : null,
  ].filter(Boolean) as string[];

  const section = input.intermediateSection?.trim();
  if (section) flags.push(`intermediate section ${section}`);

  const tail = flags.length > 0 ? ` · ${flags.join(", ")}` : "";
  return `${input.modelLabel} · ${input.elevatorKind} · ${input.color} · ${input.stops} stops${tail}`;
}
