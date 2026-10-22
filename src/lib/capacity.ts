export const CYLINDERS_PER_PALLET = 4;
export const PALLETS_PER_CONTAINER = 20;
export const CYLINDERS_PER_CONTAINER =
  CYLINDERS_PER_PALLET * PALLETS_PER_CONTAINER;

export const NEAR_FULL_THRESHOLD = 0.85;
export const HALF_FULL_THRESHOLD = 0.5;

export type CapacitySeverity = "ok" | "info" | "warning" | "error";

export interface CapacityWarning {
  severity: CapacitySeverity;
  code:
    | "OVER_CAPACITY"
    | "AT_CAPACITY"
    | "NEAR_CAPACITY"
    | "UNDERFILLED"
    | "PARTIAL_PALLET"
    | "EMPTY";
  message: string;
}

export interface CapacityBreakdown {
  cylinders: number;
  fullPallets: number;
  partialPalletCylinders: number;
  pallets: number;
  palletCapacity: number;
  remainingPallets: number;
  remainingCylinders: number;
  fillPercent: number;
  isOver: boolean;
  isFull: boolean;
  isEmpty: boolean;
  warnings: CapacityWarning[];
}

export function palletsFromCylinders(cylinders: number): number {
  if (cylinders <= 0) return 0;
  return Math.ceil(cylinders / CYLINDERS_PER_PALLET);
}

export function fullPalletsFromCylinders(cylinders: number): number {
  if (cylinders <= 0) return 0;
  return Math.floor(cylinders / CYLINDERS_PER_PALLET);
}

export function partialPalletCylinders(cylinders: number): number {
  if (cylinders <= 0) return 0;
  return cylinders % CYLINDERS_PER_PALLET;
}

export function cylindersFromPallets(pallets: number): number {
  return Math.max(0, pallets) * CYLINDERS_PER_PALLET;
}

export function fillPercent(
  pallets: number,
  capacity: number = PALLETS_PER_CONTAINER,
): number {
  if (capacity <= 0) return 0;
  return Math.round((pallets / capacity) * 100);
}

export function remainingPallets(
  pallets: number,
  capacity: number = PALLETS_PER_CONTAINER,
): number {
  return Math.max(0, capacity - pallets);
}

export function buildWarnings(
  pallets: number,
  partialCylinders: number,
  capacity: number,
): CapacityWarning[] {
  const warnings: CapacityWarning[] = [];

  if (pallets === 0) {
    warnings.push({
      severity: "info",
      code: "EMPTY",
      message: "Container is empty.",
    });
  } else if (pallets > capacity) {
    const over = pallets - capacity;
    warnings.push({
      severity: "error",
      code: "OVER_CAPACITY",
      message: `Over capacity by ${over} pallet${over === 1 ? "" : "s"}.`,
    });
  } else if (pallets === capacity) {
    warnings.push({
      severity: "ok",
      code: "AT_CAPACITY",
      message: "Container is fully loaded.",
    });
  } else if (pallets / capacity >= NEAR_FULL_THRESHOLD) {
    warnings.push({
      severity: "warning",
      code: "NEAR_CAPACITY",
      message: `Only ${capacity - pallets} pallet${capacity - pallets === 1 ? "" : "s"} of capacity remaining.`,
    });
  } else if (pallets > 0 && pallets / capacity < HALF_FULL_THRESHOLD) {
    warnings.push({
      severity: "info",
      code: "UNDERFILLED",
      message: "Container is less than half full — consider consolidating.",
    });
  }

  if (partialCylinders > 0) {
    const needed = CYLINDERS_PER_PALLET - partialCylinders;
    warnings.push({
      severity: "warning",
      code: "PARTIAL_PALLET",
      message: `Last pallet has ${partialCylinders}/${CYLINDERS_PER_PALLET} cylinders — ${needed} more would complete it.`,
    });
  }

  return warnings;
}

export function calculateCapacity(
  cylinders: number,
  capacity: number = PALLETS_PER_CONTAINER,
): CapacityBreakdown {
  const safeCylinders = Math.max(0, Math.floor(cylinders));
  const pallets = palletsFromCylinders(safeCylinders);
  const fullPallets = fullPalletsFromCylinders(safeCylinders);
  const partial = partialPalletCylinders(safeCylinders);
  const percent = fillPercent(pallets, capacity);

  return {
    cylinders: safeCylinders,
    fullPallets,
    partialPalletCylinders: partial,
    pallets,
    palletCapacity: capacity,
    remainingPallets: remainingPallets(pallets, capacity),
    remainingCylinders: Math.max(
      0,
      cylindersFromPallets(capacity) - safeCylinders,
    ),
    fillPercent: percent,
    isOver: pallets > capacity,
    isFull: pallets === capacity,
    isEmpty: safeCylinders === 0,
    warnings: buildWarnings(pallets, partial, capacity),
  };
}

export function validateAddition(
  current: number,
  incoming: number,
  capacity: number = PALLETS_PER_CONTAINER,
): {
  ok: boolean;
  resulting: CapacityBreakdown;
  message?: string;
} {
  const total = Math.max(0, current) + Math.max(0, incoming);
  const resulting = calculateCapacity(total, capacity);
  if (resulting.isOver) {
    const overflow =
      total - cylindersFromPallets(capacity);
    return {
      ok: false,
      resulting,
      message: `Adding ${incoming} cylinder${incoming === 1 ? "" : "s"} would exceed container capacity by ${overflow} cylinder${overflow === 1 ? "" : "s"}.`,
    };
  }
  return { ok: true, resulting };
}
