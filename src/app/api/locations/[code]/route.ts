import { z } from "zod";
import { sb } from "@/lib/sb";
import {
  apiError,
  apiOk,
  parseJson,
  requireApiSession,
  requireCap,
} from "@/lib/api";
import { LOCATIONS } from "@/lib/constants";
import type { Database } from "@/types/database";

type Location = Database["public"]["Enums"]["Location"];

function isLocationCode(value: string): value is Location {
  return (LOCATIONS as readonly string[]).includes(value);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "locations.read");
  if (forbidden) return forbidden;
  const { code } = await params;
  if (!isLocationCode(code)) return apiError("Invalid location code", 400);

  const { data: location, error } = await sb()
    .from("LocationProfile")
    .select(
      "*, manager:User!LocationProfile_managerId_fkey(id, name, email)",
    )
    .eq("code", code)
    .maybeSingle();
  if (error) return apiError(error.message, 500);
  if (!location) return apiError("Not found", 404);
  return apiOk(location);
}

const updateSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    country: z.string().min(2).max(80).optional(),
    city: z.string().max(80).nullable().optional(),
    address: z.string().max(200).nullable().optional(),
    phone: z.string().max(40).nullable().optional(),
    email: z.string().email().nullable().optional(),
    currency: z.string().length(3).optional(),
    timezone: z.string().max(64).nullable().optional(),
    flag: z.string().max(8).nullable().optional(),
    isEnabled: z.boolean().optional(),
    managerId: z.string().nullable().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "No fields to update",
  });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "locations.write");
  if (forbidden) return forbidden;
  const { code } = await params;
  if (!isLocationCode(code)) return apiError("Invalid location code", 400);

  // Location admins can only edit their own location.
  if (
    auth.session.role === "LOCATION_ADMIN" &&
    auth.session.location !== code
  ) {
    return apiError("You can only edit your own location", 403);
  }

  const client = sb();
  const { data: target, error: targetErr } = await client
    .from("LocationProfile")
    .select("code")
    .eq("code", code)
    .maybeSingle();
  if (targetErr) return apiError(targetErr.message, 500);
  if (!target) return apiError("Not found", 404);

  const parsed = await parseJson(request, updateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  if (body.managerId) {
    const { data: candidate, error: candErr } = await client
      .from("User")
      .select("id, locationId")
      .eq("id", body.managerId)
      .maybeSingle();
    if (candErr) return apiError(candErr.message, 500);
    if (!candidate || candidate.locationId !== code) {
      return apiError(
        "Manager must be an active user assigned to this location",
        400,
      );
    }
  }

  // LOCATION_ADMIN cannot toggle isEnabled (it has cross-location impact).
  if (
    body.isEnabled !== undefined &&
    auth.session.role !== "SUPER_ADMIN"
  ) {
    return apiError(
      "Only Super Admins can enable or disable locations",
      403,
    );
  }

  const { data: updated, error: updateErr } = await client
    .from("LocationProfile")
    .update(body as never)
    .eq("code", code)
    .select(
      "*, manager:User!LocationProfile_managerId_fkey(id, name, email)",
    )
    .single();
  if (updateErr) return apiError(updateErr.message, 500);

  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: "UPDATE",
    entity: "Location",
    entityId: code,
    metadata: { changes: Object.keys(body) },
  });
  if (auditErr) return apiError(auditErr.message, 500);

  return apiOk(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "locations.write");
  if (forbidden) return forbidden;
  if (auth.session.role !== "SUPER_ADMIN") {
    return apiError("Only Super Admins can delete locations", 403);
  }
  const { code } = await params;
  if (!isLocationCode(code)) return apiError("Invalid location code", 400);

  // Refuse if anything still references this location.
  const client = sb();
  const [usersRes, ordersRes] = await Promise.all([
    client
      .from("User")
      .select("id", { count: "exact", head: true })
      .eq("locationId", code),
    client
      .from("Order")
      .select("id", { count: "exact", head: true })
      .or(`originLocation.eq.${code},destLocation.eq.${code}`),
  ]);
  if (usersRes.error) return apiError(usersRes.error.message, 500);
  if (ordersRes.error) return apiError(ordersRes.error.message, 500);
  const users = usersRes.count ?? 0;
  const orders = ordersRes.count ?? 0;
  if (users > 0 || orders > 0) {
    return apiError(
      `Cannot delete — ${users} user(s) and ${orders} order(s) reference this location. Disable it instead.`,
      409,
    );
  }

  const { error: delErr } = await client
    .from("LocationProfile")
    .delete()
    .eq("code", code);
  if (delErr) return apiError(delErr.message, 500);

  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: "DELETE",
    entity: "Location",
    entityId: code,
  });
  if (auditErr) return apiError(auditErr.message, 500);
  return apiOk({ ok: true });
}
