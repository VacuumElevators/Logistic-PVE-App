"use client";

import * as React from "react";
import { useAuthStore, type AuthUser } from "@/store/auth-store";

/**
 * Server-rendered layouts pass the current user down to the client so the
 * auth store is populated on first paint — no flash of unauthenticated UI.
 */
export function AuthBootstrap({ user }: { user: AuthUser | null }) {
  const setUser = useAuthStore((s) => s.setUser);
  React.useEffect(() => {
    setUser(user);
  }, [user, setUser]);
  return null;
}
