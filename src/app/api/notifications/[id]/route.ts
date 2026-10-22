import { sb } from "@/lib/sb";
import { apiError, apiOk, requireApiSession } from "@/lib/api";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const client = sb();

  const { data: notif, error: lookupErr } = await client
    .from("Notification")
    .select("id, userId")
    .eq("id", id)
    .maybeSingle();
  if (lookupErr) return apiError(lookupErr.message, 500);
  if (!notif || notif.userId !== auth.session.sub) {
    return apiError("Not found", 404);
  }
  const { data: updated, error } = await client
    .from("Notification")
    .update({ isRead: true })
    .eq("id", id)
    .select()
    .single();
  if (error) return apiError(error.message, 500);
  return apiOk(updated);
}
