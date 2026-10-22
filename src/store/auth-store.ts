"use client";

import { create } from "zustand";
import type { Database } from "@/types/database";

type UserRole = Database["public"]["Enums"]["UserRole"];
type Location = Database["public"]["Enums"]["Location"];
type UserStatus = Database["public"]["Enums"]["UserStatus"];

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  locationId: Location;
  status: UserStatus;
}

interface AuthState {
  user: AuthUser | null;
  isHydrated: boolean;
  setUser: (user: AuthUser | null) => void;
  clear: () => void;
  markHydrated: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isHydrated: false,
  setUser: (user) => set({ user, isHydrated: true }),
  clear: () => set({ user: null, isHydrated: true }),
  markHydrated: () => set({ isHydrated: true }),
}));

export const useIsAuthenticated = () =>
  useAuthStore((s) => s.user !== null);

export const useHasRole = (...roles: UserRole[]) =>
  useAuthStore((s) => (s.user ? roles.includes(s.user.role) : false));
