"use client";

import { create } from "zustand";
import type { LocationKey } from "@/lib/constants";

interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  /** Optional global filter — lets each module respect a "viewing as location" toggle. */
  activeLocation: LocationKey | "ALL";
  setActiveLocation: (loc: LocationKey | "ALL") => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  activeLocation: "ALL",
  setActiveLocation: (loc) => set({ activeLocation: loc }),
}));
