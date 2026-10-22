import { sb } from "@/lib/sb";
import { apiError, apiOk, requireApiSession } from "@/lib/api";

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let q = sb()
    .from("CalendarEvent")
    .select("*")
    .order("startDate", { ascending: true });
  if (from) q = q.gte("startDate", new Date(from).toISOString());
  if (to) q = q.lte("startDate", new Date(to).toISOString());
  const { data, error } = await q;
  if (error) return apiError(error.message, 500);
  return apiOk(data ?? []);
}
