"use client";

import { Search, Bell, ChevronDown, LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { LOCATION_META, type LocationKey } from "@/lib/constants";
import { useAuthStore } from "@/store/auth-store";
import { useNotifications } from "@/hooks/use-notifications";
import { useUIStore } from "@/store/ui-store";

interface HeaderProps {
  user: {
    name: string;
    email: string;
    roleLabel: string;
    location: LocationKey;
  };
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const clear = useAuthStore((s) => s.clear);
  const loc = LOCATION_META[user.location];
  const { data: notifData } = useNotifications();
  const unread = notifData?.unreadCount ?? 0;
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    clear();
    router.replace("/login");
    router.refresh();
  }

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-6 backdrop-blur">
      <div className="flex flex-1 items-center gap-3 max-w-xl">
        {/* Hamburger — only visible below lg */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden -ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            placeholder="Search orders…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 h-9 text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 h-9 text-sm">
          <span className="text-base leading-none">{loc.flag}</span>
          <span className="font-medium text-slate-700">{loc.label}</span>
        </div>

        <button
          aria-label="Notifications"
          onClick={() => router.push("/dashboard#notifications")}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] inline-flex items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white pl-1 pr-3 h-9 text-sm"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-100 text-xs font-semibold text-brand-700">
              {initials}
            </span>
            <span className="hidden sm:flex flex-col leading-tight text-left">
              <span className="font-medium text-slate-900">{user.name}</span>
              <span className="text-[11px] text-slate-500">
                {user.roleLabel}
              </span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 w-56 rounded-xl border border-slate-200 bg-white shadow-lg animate-fade-in">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-b-xl"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
