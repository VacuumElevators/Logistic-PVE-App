import { sb } from "@/lib/sb";
import { apiError, apiOk, requireApiSession } from "@/lib/api";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const client = sb();

  const [notifRes, unreadRes] = await Promise.all([
    client
      .from("Notification")
      .select("*")
      .eq("userId", auth.session.sub)
      .order("createdAt", { ascending: false })
      .limit(20),
    client
      .from("Notification")
      .select("id", { count: "exact", head: true })
      .eq("userId", auth.session.sub)
      .eq("isRead", false),
  ]);
  if (notifRes.error) return apiError(notifRes.error.message, 500);
  if (unreadRes.error) return apiError(unreadRes.error.message, 500);
  return apiOk({
    notifications: notifRes.data ?? [],
    unreadCount: unreadRes.count ?? 0,
  });
}

export async function PATCH() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const { error } = await sb()
    .from("Notification")
    .update({ isRead: true })
    .eq("userId", auth.session.sub)
    .eq("isRead", false);
  if (error) return apiError(error.message, 500);
  return apiOk({ ok: true });
}
