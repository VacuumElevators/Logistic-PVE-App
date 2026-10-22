"use client";

import * as React from "react";
import { useAuthStore } from "@/store/auth-store";
import type { Database } from "@/types/database";

type UserRole = Database["public"]["Enums"]["UserRole"];

/**
 * Renders children only if the current user has one of the allowed roles.
 * Use for hiding nav items, action buttons, etc. on the client.
 *
 * NOTE: This is a UX helper, NOT a security boundary. Always re-check
 * authorization on the server in the corresponding API route.
 */
export function RoleGuard({
  allow,
  fallback = null,
  children,
}: {
  allow: UserRole[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  if (!user || !allow.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
}
