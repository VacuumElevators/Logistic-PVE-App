import { sb } from "./sb";
import type { Database } from "@/types/database";

type Location = Database["public"]["Enums"]["Location"];

export interface LocationStats {
  incomingOrders: number;
  outgoingOrders: number;
  inTransitContainers: number;
  userCount: number;
}

export interface LocationWithManager {
  code: Location;
  name: string;
  country: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  timezone: string | null;
  flag: string | null;
  isEnabled: boolean;
  managerId: string | null;
  manager: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

const SELECT =
  "code, name, country, city, address, phone, email, currency, timezone, flag, isEnabled, managerId, createdAt, updatedAt, manager:User!LocationProfile_managerId_fkey(id, name, email)";

export async function listLocations(): Promise<LocationWithManager[]> {
  const { data, error } = await sb()
    .from("LocationProfile")
    .select(SELECT)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as LocationWithManager[];
}

export async function getLocation(
  code: Location,
): Promise<LocationWithManager | null> {
  const { data, error } = await sb()
    .from("LocationProfile")
    .select(SELECT)
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as LocationWithManager | null;
}

export async function getLocationStats(
  code: Location,
): Promise<LocationStats> {
  const client = sb();
  const [incoming, outgoing, transit, users] = await Promise.all([
    client
      .from("Order")
      .select("id", { count: "exact", head: true })
      .eq("destLocation", code)
      .not("status", "in", "(DELIVERED,DECLINED)"),
    client
      .from("Order")
      .select("id", { count: "exact", head: true })
      .eq("originLocation", code)
      .not("status", "in", "(DELIVERED,DECLINED)"),
    client
      .from("Order")
      .select("id", { count: "exact", head: true })
      .eq("status", "DISPATCHED")
      .is("archivedAt", null)
      .or(`originLocation.eq.${code},destLocation.eq.${code}`),
    client
      .from("User")
      .select("id", { count: "exact", head: true })
      .eq("locationId", code)
      .eq("status", "ACTIVE"),
  ]);
  return {
    incomingOrders: incoming.count ?? 0,
    outgoingOrders: outgoing.count ?? 0,
    inTransitContainers: transit.count ?? 0,
    userCount: users.count ?? 0,
  };
}

export async function listLocationsWithStats(): Promise<
  Array<LocationWithManager & { stats: LocationStats }>
> {
  const locations = await listLocations();
  const withStats = await Promise.all(
    locations.map(async (loc) => ({
      ...loc,
      stats: await getLocationStats(loc.code),
    })),
  );
  return withStats;
}

export async function listManagerCandidates(code: Location) {
  const { data, error } = await sb()
    .from("User")
    .select("id, name, email, role")
    .eq("locationId", code)
    .eq("status", "ACTIVE")
    .in("role", ["MANAGER", "LOCATION_ADMIN", "SUPER_ADMIN"])
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
