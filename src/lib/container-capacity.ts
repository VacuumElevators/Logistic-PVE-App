import { sb } from "./sb";
import { calculateCapacity, type CapacityBreakdown } from "./capacity";
import { CYLINDER_PART_CATEGORIES } from "./constants";

export interface CylinderCountableItem {
  partId: string | null;
  elevatorModelId: string | null;
  description: string;
  quantity: number;
  configJson: unknown;
}

export function isCylinderPart(part: {
  category?: string | null;
  sku?: string | null;
}): boolean {
  return CYLINDER_PART_CATEGORIES.has(part.category ?? "");
}

function readConfigCylinders(configJson: unknown): number | null {
  if (!configJson || typeof configJson !== "object") return null;
  const c = configJson as Record<string, unknown>;
  const candidate =
    c.cylinders ??
    c.cylinderCount ??
    (c.config && typeof c.config === "object"
      ? (c.config as Record<string, unknown>).cylinders
      : undefined);
  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return Math.max(0, Math.floor(candidate));
  }
  return null;
}

function readConfigKind(configJson: unknown): string | null {
  if (!configJson || typeof configJson !== "object") return null;
  const c = configJson as Record<string, unknown>;
  if (typeof c.elevatorKind === "string") return c.elevatorKind;
  return null;
}

function readStopsConfigLength(configJson: unknown): number | null {
  if (!configJson || typeof configJson !== "object") return null;
  const c = configJson as Record<string, unknown>;
  if (Array.isArray(c.stopsConfig)) return c.stopsConfig.length;
  return null;
}

export function cylindersForOrderItem(
  item: CylinderCountableItem,
  context?: {
    part?: { category?: string | null; sku?: string | null } | null;
  },
): number {
  const fromConfig = readConfigCylinders(item.configJson);
  if (fromConfig !== null) return fromConfig * item.quantity;

  // CUBE elevators don't carry cylinders.
  if (readConfigKind(item.configJson) === "CUBE") return 0;

  // Per-stop configured elevators bill one cylinder per stop.
  const stopsLen = readStopsConfigLength(item.configJson);
  if (stopsLen !== null && item.elevatorModelId) {
    return stopsLen * item.quantity;
  }

  // Legacy / no-config elevators: count as one cylinder per unit.
  if (item.elevatorModelId) {
    return item.quantity;
  }

  if (item.partId && context?.part && isCylinderPart(context.part)) {
    return item.quantity;
  }

  // General Parts and any other non-cylinder part contribute 0.
  // Until John provides per-SKU pallet dimensions, the UI surfaces a warning.
  return 0;
}

export interface OrderCapacitySummary extends CapacityBreakdown {
  orderId: string;
  orderNumber: string;
  containerNumber: string | null;
}

/**
 * One order = one container. Summarize a single order's container fill from its
 * line items (cylinders → pallets → % of a container). Drives the loading visual
 * on the order detail page.
 */
export async function summarizeOrderCapacity(
  orderId: string,
): Promise<OrderCapacitySummary | null> {
  const client = sb();
  const { data: order, error } = await client
    .from("Order")
    .select(
      "id, orderNumber, containerNumber, items:OrderItem(partId, elevatorModelId, description, quantity, configJson, part:Part(category, sku))",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!order) return null;

  type OrderWithItems = {
    id: string;
    orderNumber: string;
    containerNumber: string | null;
    items: Array<{
      partId: string | null;
      elevatorModelId: string | null;
      description: string;
      quantity: number;
      configJson: unknown;
      part: { category: string | null; sku: string | null } | null;
    }>;
  };
  const o = order as unknown as OrderWithItems;

  const cylinders = (o.items ?? []).reduce(
    (sum, item) =>
      sum +
      cylindersForOrderItem(
        {
          partId: item.partId,
          elevatorModelId: item.elevatorModelId,
          description: item.description,
          quantity: item.quantity,
          configJson: item.configJson,
        },
        { part: item.part },
      ),
    0,
  );

  return {
    ...calculateCapacity(cylinders),
    orderId: o.id,
    orderNumber: o.orderNumber,
    containerNumber: o.containerNumber,
  };
}
