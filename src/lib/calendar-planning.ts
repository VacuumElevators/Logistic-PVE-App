import { sb } from "./sb";
import type { Database } from "@/types/database";
import { formatContainerNumber, formatAirNumber } from "./calendar-planning-pure";

type Location = Database["public"]["Enums"]["Location"];

export {
  formatContainerNumber,
  formatAirNumber,
  planningWindow,
  buildMonthGrid,
  type DayCell,
} from "./calendar-planning-pure";

/**
 * One order = one container. Assign a per-route container number (C01, C02 …
 * per origin→dest) to an order at submit time, reading the counter from Order.
 * Idempotent — an order that already has a number (e.g. a modification
 * re-submit) keeps it. Retries on the unique-constraint race (23505,
 * Order_route_counter_key).
 */
export async function assignContainerNumber(
  client: ReturnType<typeof sb>,
  order: {
    id: string;
    originLocation: Location;
    destLocation: Location;
    containerNumber: string | null;
  },
): Promise<string | null> {
  if (order.containerNumber) return order.containerNumber;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error: readErr } = await client
      .from("Order")
      .select("routeCounter")
      .eq("originLocation", order.originLocation)
      .eq("destLocation", order.destLocation)
      .not("routeCounter", "is", null)
      .order("routeCounter", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (readErr) throw readErr;
    const counter = (data?.routeCounter ?? 0) + 1;
    const containerNumber = formatContainerNumber(counter);
    const { error: updErr } = await client
      .from("Order")
      .update({ routeCounter: counter, containerNumber })
      .eq("id", order.id);
    if (!updErr) return containerNumber;
    // Another order on this route grabbed the counter first — recompute + retry.
    if ((updErr as { code?: string }).code === "23505" && attempt < 2) continue;
    throw updErr;
  }
  return null;
}

/**
 * Airfreight sibling of assignContainerNumber. Assigns a per-route air number
 * (A01, A02 … per origin→dest) to an AIRFREIGHT order at submit time, reading
 * the counter from Order.airRouteCounter — a dedicated sequence, separate from
 * the container routeCounter, so air and container numbers never collide on a
 * route. Idempotent — an order that already has an airNumber keeps it. Retries
 * on the unique-constraint race (23505, Order_air_route_counter_key).
 */
export async function assignAirNumber(
  client: ReturnType<typeof sb>,
  order: {
    id: string;
    originLocation: Location;
    destLocation: Location;
    airNumber: string | null;
  },
): Promise<string | null> {
  if (order.airNumber) return order.airNumber;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error: readErr } = await client
      .from("Order")
      .select("airRouteCounter")
      .eq("originLocation", order.originLocation)
      .eq("destLocation", order.destLocation)
      .not("airRouteCounter", "is", null)
      .order("airRouteCounter", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (readErr) throw readErr;
    const counter = (data?.airRouteCounter ?? 0) + 1;
    const airNumber = formatAirNumber(counter);
    const { error: updErr } = await client
      .from("Order")
      .update({ airRouteCounter: counter, airNumber })
      .eq("id", order.id);
    if (!updErr) return airNumber;
    // Another air order on this route grabbed the counter first — recompute + retry.
    if ((updErr as { code?: string }).code === "23505" && attempt < 2) continue;
    throw updErr;
  }
  return null;
}
