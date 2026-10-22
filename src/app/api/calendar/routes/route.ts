import { sb } from "@/lib/sb";
import { apiError, apiOk, requireApiSession, requireCap } from "@/lib/api";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "calendar.read");
  if (forbidden) return forbidden;

  const { data, error } = await sb()
    .from("LocationRoute")
    .select("*")
    .eq("isActive", true)
    .order("originLocation", { ascending: true })
    .order("destLocation", { ascending: true });
  if (error) return apiError(error.message, 500);
  return apiOk(data ?? []);
}
