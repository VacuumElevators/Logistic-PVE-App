import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiOk, parseJson } from "@/lib/api";
import { roleLabel } from "@/lib/permissions";

const schema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const parsed = await parseJson(request, schema);
  if ("error" in parsed) return parsed.error;
  const { email, password } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    return apiError("Invalid email or password", 401);
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("User")
    .select("id, email, name, role, locationId, status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return apiError("Account not provisioned in app database", 403);
  }
  if (profile.status !== "ACTIVE") {
    await supabase.auth.signOut();
    return apiError(
      profile.status === "SUSPENDED"
        ? "Account suspended. Contact an administrator."
        : "Account inactive.",
      403,
    );
  }

  // Best-effort housekeeping. Failure here must not break login.
  await admin
    .from("User")
    .update({ lastLoginAt: new Date().toISOString() })
    .eq("id", profile.id);
  await admin.from("AuditLog").insert({
    id: crypto.randomUUID(),
    userId: profile.id,
    action: "LOGIN",
    entity: "User",
    entityId: profile.id,
  });

  return apiOk({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    roleLabel: roleLabel(profile.role),
    locationId: profile.locationId,
    status: profile.status,
  });
}
