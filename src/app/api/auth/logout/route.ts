import { createClient } from "@/lib/supabase/server";
import { apiOk } from "@/lib/api";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return apiOk({ ok: true });
}
