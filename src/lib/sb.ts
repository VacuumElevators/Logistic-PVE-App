// Convenience entry point for server-side data access.
//
// `sb()` returns an admin (service-role) client that bypasses RLS — same
// effective trust level the old Prisma code had. Auth gating happens at the
// app layer via the capability matrix in src/lib/permissions.ts. When RLS
// policies are written later, route handlers that should be RLS-enforced
// can switch to importing { createClient } from "@/lib/supabase/server"
// instead, which honours the session JWT.

import { createAdminClient } from "@/lib/supabase/admin";

export function sb() {
  return createAdminClient();
}

export type { Database } from "@/types/database";
