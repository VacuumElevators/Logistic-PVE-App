import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/api/auth/login",
  "/api/auth/logout",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always create a response we can mutate cookies on. @supabase/ssr writes
  // refreshed session cookies onto this response when the access token is
  // about to expire — that's the whole point of running it in proxy.
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT: getUser() validates against Supabase's auth server and is
  // what triggers a token refresh if the access cookie has expired. Do not
  // replace with getSession() — that only reads the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname === "/";

  if (!user && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user) {
    // Forward identity to downstream handlers via request headers. Read from
    // JWT custom claims if the custom_access_token_hook is enabled, fall back
    // to the user record otherwise.
    const appMeta = (user.app_metadata ?? {}) as {
      role?: string;
      location?: string;
    };
    response.headers.set("x-user-id", user.id);
    if (appMeta.role) response.headers.set("x-user-role", appMeta.role);
    if (appMeta.location)
      response.headers.set("x-user-location", appMeta.location);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static assets, image optimizer, favicon, anything with a file
    // extension. Run on everything else so the session cookie gets refreshed.
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
