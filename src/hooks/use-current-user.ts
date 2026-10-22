"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore, type AuthUser } from "@/store/auth-store";
import { apiFetch } from "@/lib/api-fetch";

async function fetchMe(): Promise<AuthUser | null> {
  const res = await apiFetch("/api/auth/me");
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to load user");
  const json = await res.json();
  return json.data as AuthUser;
}

/**
 * Hydrates the auth store from /api/auth/me and exposes the current user.
 * Components that only need to *read* the user should use `useAuthUser` instead.
 */
export function useCurrentUser() {
  const setUser = useAuthStore((s) => s.setUser);
  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
    staleTime: 60_000,
  });

  React.useEffect(() => {
    if (query.data !== undefined) {
      setUser(query.data);
    }
  }, [query.data, setUser]);

  return query;
}

export function useAuthUser() {
  return useAuthStore((s) => s.user);
}
