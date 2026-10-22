import type { Database } from "@/types/database";

type Location = Database["public"]["Enums"]["Location"];
type OrderStatus = Database["public"]["Enums"]["OrderStatus"];

/**
 * One order = one container. The planning calendar plots container orders on
 * their ship date (estimatedShipDate, set by the receiver at acceptance; falls
 * back to requestedDate). It's a read-only overview — every action lives on the
 * order's own detail page.
 */
export interface CalendarOrder {
  id: string;
  orderNumber: string;
  type: string;
  containerNumber: string | null;
  airNumber: string | null;
  originLocation: Location;
  destLocation: Location;
  status: OrderStatus;
  /** Computed plot date — estimatedShipDate ?? requestedDate. Always present. */
  shipDate: string;
  arrivalDate: string | null;
  fillPercent: number | null;
  customerName: string | null;
}
