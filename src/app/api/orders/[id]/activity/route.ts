import { sb } from "@/lib/sb";
import { apiError, apiOk, requireApiSession, requireCap } from "@/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "orders.read");
  if (forbidden) return forbidden;
  const { id } = await params;

  const { data: logs, error } = await sb()
    .from("AuditLog")
    .select("*, user:User(id, name)")
    .eq("entity", "Order")
    .eq("entityId", id)
    .order("createdAt", { ascending: false });
  if (error) return apiError(error.message, 500);
  return apiOk(logs ?? []);
}
