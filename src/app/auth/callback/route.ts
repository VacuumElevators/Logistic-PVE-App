import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the redirect target for password-reset and magic-link emails.
// Supabase puts a `code` query param on the URL; exchange it for a session,
// then send the user on to the page they were headed to.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/reset-password";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
