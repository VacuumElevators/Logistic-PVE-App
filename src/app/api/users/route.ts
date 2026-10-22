import { z } from "zod";
import { sb } from "@/lib/sb";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiOk, parseJson, requireApiSession, requireCap } from "@/lib/api";
import {
  assignableLocations,
  assignableRoles,
} from "@/lib/permissions";
import { LOCATIONS } from "@/lib/constants";
import { ROLES } from "@/lib/permissions";

const USER_SELECT = "id, email, name, role, locationId, status, lastLoginAt, createdAt";

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "users.read");
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const role = url.searchParams.get("role") ?? undefined;
  const location = url.searchParams.get("location") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(
    100,
    Math.max(5, Number(url.searchParams.get("pageSize") ?? 20) || 20),
  );
  const client = sb();

  let q = client
    .from("User")
    .select(USER_SELECT, { count: "exact" })
    .order("createdAt", { ascending: false });

  if (auth.session.role !== "SUPER_ADMIN") {
    q = q.eq("locationId", auth.session.location);
  } else if (location && (LOCATIONS as readonly string[]).includes(location)) {
    q = q.eq("locationId", location as (typeof LOCATIONS)[number]);
  }
  if (role && (ROLES as readonly string[]).includes(role)) {
    q = q.eq("role", role as (typeof ROLES)[number]);
  }
  if (status && ["ACTIVE", "INACTIVE", "SUSPENDED"].includes(status)) {
    q = q.eq("status", status as "ACTIVE" | "INACTIVE" | "SUSPENDED");
  }
  if (search) {
    q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const skip = (page - 1) * pageSize;
  const { data: users, count, error } = await q.range(skip, skip + pageSize - 1);
  if (error) return apiError(error.message, 500);
  const total = count ?? 0;

  return apiOk({
    users: users ?? [],
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

const createSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8).max(128),
  role: z.enum(ROLES),
  locationId: z.enum(LOCATIONS),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE"),
});

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "users.write");
  if (forbidden) return forbidden;

  const parsed = await parseJson(request, createSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;
  const client = sb();

  if (!assignableRoles(auth.session).includes(body.role)) {
    return apiError("You cannot assign this role", 403);
  }
  if (!assignableLocations(auth.session).includes(body.locationId)) {
    return apiError("You cannot assign users to this location", 403);
  }

  const { data: existing, error: existingErr } = await client
    .from("User")
    .select("id")
    .eq("email", body.email)
    .maybeSingle();
  if (existingErr) return apiError(existingErr.message, 500);
  if (existing) return apiError("Email already in use", 409);

  // Create the auth identity first, then the public profile. If the profile
  // insert fails we roll the auth user back to keep the two in sync.
  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser(
    {
      email: body.email,
      password: body.password,
      email_confirm: true,
    },
  );
  if (createErr || !created.user) {
    return apiError(createErr?.message ?? "Failed to create auth user", 500);
  }

  const { data: user, error: profileErr } = await client
    .from("User")
    .insert({
      id: created.user.id,
      name: body.name,
      email: body.email,
      role: body.role,
      locationId: body.locationId,
      status: body.status,
    })
    .select(USER_SELECT)
    .single();
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return apiError(profileErr.message, 500);
  }

  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: "CREATE",
    entity: "User",
    entityId: (user as { id: string }).id,
    metadata: { role: (user as { role: string }).role, locationId: (user as { locationId: string }).locationId },
  });
  if (auditErr) return apiError(auditErr.message, 500);

  return apiOk(user, { status: 201 });
}
