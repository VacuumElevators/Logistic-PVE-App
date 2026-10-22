import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type UserRole = Database["public"]["Enums"]["UserRole"];
type Location = Database["public"]["Enums"]["Location"];
type UserRow = Database["public"]["Tables"]["User"]["Row"];

// Mirrors the shape callers got from the old JWT-based auth so we don't have
// to touch 26 dependent files. `sub` is the auth.users id (uuid string).
export interface AccessPayload {
  sub: string;
  email: string;
  role: UserRole;
  location: Location;
}

/**
 * Resolve the current session: validates the Supabase access cookie, then
 * reads role + location from JWT custom claims if the access-token hook is
 * enabled, otherwise falls back to a public.User lookup.
 */
export async function getSession(): Promise<AccessPayload | null> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return null;
  const authUser = userData.user;

  const appMeta = (authUser.app_metadata ?? {}) as {
    role?: UserRole;
    location?: Location;
  };

  let role: UserRole | undefined = appMeta.role;
  let location: Location | undefined = appMeta.location;

  if (!role || !location) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("User")
      .select("role, locationId, status")
      .eq("id", authUser.id)
      .maybeSingle();
    if (!profile) return null;
    if (profile.status !== "ACTIVE") return null;
    role = profile.role;
    location = profile.locationId;
  }

  return {
    sub: authUser.id,
    email: authUser.email ?? "",
    role,
    location,
  };
}

export async function requireSession(): Promise<AccessPayload> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

/**
 * Returns the full public.User row for the current session, or null if not
 * signed in. Uses the admin client to bypass RLS — same effective access as
 * the previous Prisma-based implementation.
 */
export async function getCurrentUser(): Promise<UserRow | null> {
  const session = await getSession();
  if (!session) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("User")
    .select("*")
    .eq("id", session.sub)
    .maybeSingle();
  if (error) return null;
  return data;
}
