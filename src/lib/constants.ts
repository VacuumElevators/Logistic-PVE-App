export const LOCATIONS = ["ARGENTINA", "USA", "SPAIN", "INDIA"] as const;
export type LocationKey = (typeof LOCATIONS)[number];

/**
 * Locations selectable in order details (customer/origin/destination).
 * PVE Argentina is temporarily hidden per client request (2026-06-26).
 * To restore it, set this back to `LOCATIONS`.
 */
export const ORDER_LOCATIONS = LOCATIONS.filter(
  (l) => l !== "ARGENTINA",
) as LocationKey[];

export const LOCATION_META: Record<
  LocationKey,
  { label: string; flag: string; currency: string }
> = {
  ARGENTINA: { label: "Argentina", flag: "🇦🇷", currency: "USD" },
  USA: { label: "USA", flag: "🇺🇸", currency: "USD" },
  SPAIN: { label: "Spain", flag: "🇪🇸", currency: "EUR" },
  INDIA: { label: "India", flag: "🇮🇳", currency: "USD" },
};

export const ORDER_STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  IN_PROCESS: "bg-blue-50 text-blue-700",
  APPROVED: "bg-indigo-50 text-indigo-700",
  ACCEPTED: "bg-brand-50 text-brand-700",
  DECLINED: "bg-rose-50 text-rose-700",
  DISPATCHED: "bg-sky-50 text-sky-700",
  DELIVERED: "bg-emerald-50 text-emerald-700",
};

/**
 * Container slots reuse the SlotStatus enum (PLANNED/LOCKED/APPROVED/
 * DISPATCHED/DELIVERED/CANCELLED). This map drives the StatusBadge "container"
 * variant used in the /containers list.
 */
export const CONTAINER_STATUS_COLOR: Record<string, string> = {
  PLANNED: "bg-slate-100 text-slate-700",
  LOCKED: "bg-amber-50 text-amber-700",
  APPROVED: "bg-sky-50 text-sky-700",
  DISPATCHED: "bg-indigo-50 text-indigo-700",
  DELIVERED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-rose-50 text-rose-700",
};

export const BACKORDER_STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-rose-50 text-rose-700",
  PARTIALLY_FULFILLED: "bg-amber-50 text-amber-700",
  FULFILLED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-700",
};

// --- Elevator configurator ---

export const STOP_OPTIONS = [2, 3, 4, 5] as const;

export const DOOR_OPTIONS = ["LEFT", "RIGHT"] as const;
export type DoorKey = (typeof DOOR_OPTIONS)[number];

export const DOOR_META: Record<DoorKey, { label: string; short: string }> = {
  LEFT: { label: "Left", short: "L" },
  RIGHT: { label: "Right", short: "R" },
};

export interface ColorPreset {
  name: string;
  hex: string;
}

export const ELEVATOR_COLORS: ColorPreset[] = [
  { name: "Black", hex: "#0f172a" },
  { name: "White", hex: "#f8fafc" },
  { name: "Silver", hex: "#c0c0c0" },
  { name: "Taupe", hex: "#b8a99a" },
  { name: "Dark Gray", hex: "#4b5563" },
  { name: "Light Gray", hex: "#d1d5db" },
  { name: "Primed", hex: "#c2b280" },
  { name: "Naked", hex: "#a8a29e" },
  { name: "Custom", hex: "#ffffff" },
];

export const ELEVATOR_MODEL_CODES = ["PVE30", "PVE37", "PVE52", "CUBE"] as const;
export type ElevatorModelCode = (typeof ELEVATOR_MODEL_CODES)[number];

/**
 * Position degrees allowed per stop, per model. Indexed by stop number (0..4).
 * Source: STP server options.xlsx · "Elevators" sheet.
 */
export const POSITION_OPTIONS_BY_MODEL: Record<
  ElevatorModelCode,
  readonly (readonly number[])[]
> = {
  PVE37: [[0], [0, 90, 180, 270], [0, 90, 180, 270], [0, 90, 180, 270], [0, 90, 180, 270]],
  CUBE: [[0], [0, 90, 180, 270], [0, 90, 180, 270], [0, 90, 180, 270], [0, 90, 180, 270]],
  PVE52: [[0], [0, 180], [0, 180], [0, 180], [0, 180]],
  PVE30: [[0], [0], [0], [0], [0]],
};

export function allowedPositions(
  model: ElevatorModelCode,
  stopIndex: number,
): readonly number[] {
  return POSITION_OPTIONS_BY_MODEL[model]?.[stopIndex] ?? [0];
}

export const ENGINE_OPTIONS = [
  { value: "NONE", label: "No engine required" },
  { value: "SPLIT", label: "Split" },
  { value: "HEAD_UNIT", label: "Head unit" },
] as const;
export type EngineKey = (typeof ENGINE_OPTIONS)[number]["value"];

export const ELEVATOR_KIND_OPTIONS = [
  { value: "CYLINDER", label: "Cylinder" },
  { value: "CUBE", label: "Cube" },
] as const;
export type ElevatorKindKey = (typeof ELEVATOR_KIND_OPTIONS)[number]["value"];

export interface StopConfig {
  stop: number;
  door: DoorKey;
  position: number;
}

// --- Parts catalog ---

export const PART_CATEGORIES = [
  "PVE30 Parts",
  "PVE37 Parts",
  "PVE52 Parts",
  "CUBE36 Parts",
  "SQ200 Parts",
  "CY200 Parts",
  "CY300 Parts",
  "General Parts",
] as const;
export type PartCategory = (typeof PART_CATEGORIES)[number];

export const PART_CATEGORY_COLOR: Record<PartCategory, string> = {
  "PVE30 Parts": "bg-brand-50 text-brand-700",
  "PVE37 Parts": "bg-sky-50 text-sky-700",
  "PVE52 Parts": "bg-emerald-50 text-emerald-700",
  "CUBE36 Parts": "bg-fuchsia-50 text-fuchsia-700",
  "SQ200 Parts": "bg-amber-50 text-amber-700",
  "CY200 Parts": "bg-rose-50 text-rose-700",
  "CY300 Parts": "bg-orange-50 text-orange-700",
  "General Parts": "bg-slate-100 text-slate-700",
};

/**
 * Single source of truth for cylinder-classified part categories.
 * Consumed by container-capacity (for the /containers list view). The
 * order-creation form no longer pre-counts cylinders — capacity calc was
 * dropped per the 2026-05-28 PVE call.
 * Flip a single entry if John decides SQ200 is panel work, not cylinder.
 */
export const CYLINDER_PART_CATEGORIES = new Set<string>([
  "CY200 Parts",
  "CY300 Parts",
  "SQ200 Parts",
]);
