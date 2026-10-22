import { z } from "zod";
import { sb } from "@/lib/sb";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  apiError,
  apiOk,
  parseJson,
  requireApiSession,
  requireCap,
} from "@/lib/api";
import {
  assignableLocations,
  assignableRoles,
  canManageUser,
} from "@/lib/permissions";
import { LOCATIONS } from "@/lib/constants";
import { ROLES } from "@/lib/permissions";

const USER_SELECT = "id, email, name, role, locationId, status, lastLoginAt, createdAt";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "users.read");
  if (forbidden) return forbidden;

  const { id } = await params;
  const { data: user, error } = await sb()
    .from("User")
    .select(USER_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) return apiError(error.message, 500);
  if (!user) return apiError("Not found", 404);
  if (
    auth.session.role !== "SUPER_ADMIN" &&
    user.locationId !== auth.session.location
  ) {
    return apiError("Forbidden", 403);
  }
  return apiOk(user);
}

const updateSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    email: z
      .string()
      .email()
      .transform((v) => v.toLowerCase().trim())
      .optional(),
    password: z.string().min(8).max(128).optional(),
    role: z.enum(ROLES).optional(),
    locationId: z.enum(LOCATIONS).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "No fields to update",
  });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "users.write");
  if (forbidden) return forbidden;
  const client = sb();

  const { id } = await params;
  const { data: target, error: targetErr } = await client
    .from("User")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (targetErr) return apiError(targetErr.message, 500);
  if (!target) return apiError("Not found", 404);

  if (!canManageUser(auth.session, target)) {
    return apiError("Forbidden", 403);
  }

  const parsed = await parseJson(request, updateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  if (body.role && !assignableRoles(auth.session).includes(body.role)) {
    return apiError("You cannot assign this role", 403);
  }
  if (
    body.locationId &&
    !assignableLocations(auth.session).includes(body.locationId)
  ) {
    return apiError("You cannot move users to this location", 403);
  }

  const isSelf = auth.session.sub === id;
  if (isSelf) {
    if (body.role && body.role !== target.role) {
      return apiError("You cannot change your own role", 400);
    }
    if (body.status && body.status !== "ACTIVE") {
      return apiError("You cannot deactivate your own account", 400);
    }
    if (body.locationId && body.locationId !== target.locationId) {
      return apiError("You cannot move yourself to another location", 400);
    }
  }

  // Email uniqueness if changed.
  if (body.email && body.email !== target.email) {
    const { data: dupe, error: dupeErr } = await client
      .from("User")
      .select("id")
      .eq("email", body.email)
      .maybeSingle();
    if (dupeErr) return apiError(dupeErr.message, 500);
    if (dupe) return apiError("Email already in use", 409);
  }

  // Auth-side updates (password, email) go through the Supabase admin API.
  if (body.password || body.email) {
    const admin = createAdminClient();
    const { error: authErr } = await admin.auth.admin.updateUserById(id, {
      ...(body.email && { email: body.email }),
      ...(body.password && { password: body.password }),
    });
    if (authErr) return apiError(authErr.message, 500);
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.email !== undefined) data.email = body.email;
  if (body.role !== undefined) data.role = body.role;
  if (body.locationId !== undefined) data.locationId = body.locationId;
  if (body.status !== undefined) data.status = body.status;

  const { data: updated, error: updErr } = await client
    .from("User")
    .update(data as never)
    .eq("id", id)
    .select(USER_SELECT)
    .single();
  if (updErr) return apiError(updErr.message, 500);

  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: "UPDATE",
    entity: "User",
    entityId: id,
    metadata: { changes: Object.keys(data) },
  });
  if (auditErr) return apiError(auditErr.message, 500);

  return apiOk(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "users.write");
  if (forbidden) return forbidden;
  const client = sb();

  const { id } = await params;
  if (id === auth.session.sub) {
    return apiError("You cannot delete your own account", 400);
  }
  const { data: target, error: targetErr } = await client
    .from("User")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (targetErr) return apiError(targetErr.message, 500);
  if (!target) return apiError("Not found", 404);
  if (!canManageUser(auth.session, target)) {
    return apiError("Forbidden", 403);
  }

  // If the user is referenced by orders, prefer soft-delete.
  const { count: orderCount, error: orderErr } = await client
    .from("Order")
    .select("id", { count: "exact", head: true })
    .eq("createdById", id);
  if (orderErr) return apiError(orderErr.message, 500);
  const hardDelete = (orderCount ?? 0) === 0;

  if (hardDelete) {
    // Deleting the auth user cascades to public."User" via the FK.
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return apiError(error.message, 500);
  } else {
    const { error: updErr } = await client
      .from("User")
      .update({ status: "INACTIVE", email: `deactivated_${id}@archived.local` })
      .eq("id", id);
    if (updErr) return apiError(updErr.message, 500);
  }

  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: hardDelete ? "DELETE" : "DEACTIVATE",
    entity: "User",
    entityId: id,
  });
  if (auditErr) return apiError(auditErr.message, 500);

  return apiOk({ ok: true, mode: hardDelete ? "deleted" : "deactivated" });
}
