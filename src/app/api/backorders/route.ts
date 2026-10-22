import { sb } from "@/lib/sb";
import { apiError, apiOk, requireApiSession } from "@/lib/api";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const { data, error } = await sb()
    .from("Backorder")
    .select("*, order:Order(*), part:Part(*)")
    .order("createdAt", { ascending: false });
  if (error) return apiError(error.message, 500);
  return apiOk(data ?? []);
}
