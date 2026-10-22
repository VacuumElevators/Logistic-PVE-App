import type { Database } from "@/types/database";
import type { AccessPayload } from "./auth";

type UserRole = Database["public"]["Enums"]["UserRole"];
type Location = Database["public"]["Enums"]["Location"];

/**
 * Capability matrix.
 *
 * - SUPER_ADMIN  — full access across all locations.
 * - LOCATION_ADMIN — full access within their own location.
 * - MANAGER      — operational actions (orders, POs, containers, parts);
 *                  approves POs, sees users in their location read-only.
 * - STAFF        — create/update orders, read parts & containers.
 * - VIEWER       — read-only across the portal; no writes anywhere.
 */
export type Capability =
  | "users.read"
  | "users.write"
  | "orders.read"
  | "orders.write"
  | "orders.approve"
  | "orders.dispatch"
  | "orders.delete"
  | "containers.read"
  | "containers.write"
  | "po.read"
  | "po.write"
  | "po.approve"
  | "parts.read"
  | "parts.write"
  | "elevator.read"
  | "elevator.write"
  | "backorders.read"
  | "backorders.write"
  | "calendar.read"
  | "calendar.write"
  | "locations.read"
  | "locations.write"
  | "settings.read"
  | "settings.write";

const NONE: readonly Capability[] = [];

// Read-only across the portal: view orders/containers/parts/calendar etc.,
// with no create/edit/approve anywhere and no user management.
const VIEWER_CAPS: readonly Capability[] = [
  "orders.read",
  "containers.read",
  "parts.read",
  "po.read",
  "backorders.read",
  "calendar.read",
  "locations.read",
  "elevator.read",
];

const STAFF_CAPS: readonly Capability[] = [
  "orders.read",
  "orders.write",
  "containers.read",
  "parts.read",
  "po.read",
  "backorders.read",
  "calendar.read",
  "locations.read",
  "elevator.read",
];

const MANAGER_CAPS: readonly Capability[] = [
  ...STAFF_CAPS,
  "users.read",
  "containers.write",
  "parts.write",
  "po.write",
  "po.approve",
  "orders.approve",
  "orders.dispatch",
  "backorders.write",
  "calendar.write",
  "elevator.write",
  "settings.read",
];

const LOCATION_ADMIN_CAPS: readonly Capability[] = [
  ...MANAGER_CAPS,
  "users.write",
  "orders.delete",
  "locations.write",
  "settings.write",
];

const SUPER_ADMIN_CAPS: readonly Capability[] = LOCATION_ADMIN_CAPS;

const ROLE_CAPS: Record<UserRole, readonly Capability[]> = {
  VIEWER: VIEWER_CAPS,
  STAFF: STAFF_CAPS,
  MANAGER: MANAGER_CAPS,
  LOCATION_ADMIN: LOCATION_ADMIN_CAPS,
  SUPER_ADMIN: SUPER_ADMIN_CAPS,
};

const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  LOCATION_ADMIN: "Location Admin",
  MANAGER: "Manager",
  STAFF: "Staff",
  VIEWER: "Viewer",
};

export function roleLabel(role: UserRole): string {
  return ROLE_LABEL[role] ?? role;
}

export function can(
  session: Pick<AccessPayload, "role">,
  capability: Capability,
): boolean {
  return (ROLE_CAPS[session.role] ?? NONE).includes(capability);
}

export function requireCapability(
  session: Pick<AccessPayload, "role">,
  capability: Capability,
): void {
  if (!can(session, capability)) {
    throw new ForbiddenError(capability);
  }
}

/**
 * A SUPER_ADMIN can act on any location. Other roles can only act on
 * resources in their own location.
 */
export function canActOnLocation(
  session: Pick<AccessPayload, "role" | "location">,
  resourceLocation: Location,
): boolean {
  if (session.role === "SUPER_ADMIN") return true;
  return session.location === resourceLocation;
}

/**
 * Only the receiving (destination) region can transition an order's status
 * (approve / accept / decline / dispatch / deliver). The origin region
 * places the order but cannot modify it once submitted. SUPER_ADMIN bypasses.
 */
export function canActOnOrderAsReceiver(
  session: Pick<AccessPayload, "role" | "location">,
  order: { destLocation: Location },
): boolean {
  if (session.role === "SUPER_ADMIN") return true;
  return session.location === order.destLocation;
}

/**
 * The originating region placed the order. They can request a modification
 * against an APPROVED / ACCEPTED order (which reopens it as a DRAFT for
 * item + notes edits). SUPER_ADMIN bypasses.
 */
export function canActOnOrderAsOrigin(
  session: Pick<AccessPayload, "role" | "location">,
  order: { originLocation: Location },
): boolean {
  if (session.role === "SUPER_ADMIN") return true;
  return session.location === order.originLocation;
}

export class ForbiddenError extends Error {
  constructor(public readonly capability: Capability) {
    super(`Forbidden: missing capability ${capability}`);
    this.name = "ForbiddenError";
  }
}

export const ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "LOCATION_ADMIN",
  "MANAGER",
  "STAFF",
  "VIEWER",
];

/**
 * Returns true if the session can manage (create / edit / delete) a target
 * user with the given role and location.
 *
 * Rules:
 * - SUPER_ADMIN can manage anyone except self-delete (callers enforce that).
 * - LOCATION_ADMIN can manage users in their own location, but never a
 *   SUPER_ADMIN and never users in other locations.
 * - Anyone else cannot manage users.
 */
export function canManageUser(
  session: Pick<AccessPayload, "role" | "location" | "sub">,
  target: { role: UserRole; locationId: Location; id?: string },
): boolean {
  if (!can(session, "users.write")) return false;
  if (session.role === "SUPER_ADMIN") return true;
  if (session.role === "LOCATION_ADMIN") {
    if (target.role === "SUPER_ADMIN") return false;
    return target.locationId === session.location;
  }
  return false;
}

/**
 * Which roles a session is allowed to *assign* when creating or editing.
 * LOCATION_ADMIN cannot grant SUPER_ADMIN.
 */
export function assignableRoles(
  session: Pick<AccessPayload, "role">,
): UserRole[] {
  if (session.role === "SUPER_ADMIN") return ROLES;
  if (session.role === "LOCATION_ADMIN") {
    return ROLES.filter((r) => r !== "SUPER_ADMIN");
  }
  return [];
}

/**
 * Which locations a session is allowed to assign. LOCATION_ADMIN is
 * scoped to its own location.
 */
export function assignableLocations(
  session: Pick<AccessPayload, "role" | "location">,
): Location[] {
  const all: Location[] = ["ARGENTINA", "USA", "SPAIN", "INDIA"];
  if (session.role === "SUPER_ADMIN") return all;
  if (session.role === "LOCATION_ADMIN") return [session.location];
  return [];
}
