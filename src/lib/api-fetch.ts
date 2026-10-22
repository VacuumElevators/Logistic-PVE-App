"use client";

/**
 * Client fetch helper. Session refresh is handled transparently by the
 * Supabase proxy on every request, so a 401 here means the user really is
 * unauthorized — send them to the login page.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const opts: RequestInit = {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  };

  const res = await fetch(input, opts);
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
  }
  return res;
}
