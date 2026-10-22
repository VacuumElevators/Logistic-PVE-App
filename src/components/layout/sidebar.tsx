"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  AlertCircle,
  CalendarDays,
  Users,
  Boxes,
  Globe2,
  Settings,
  Lightbulb,
  BookOpen,
  X,
} from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { SidebarLink } from "@/components/layout/sidebar-link";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Hide from sidebar but keep route accessible by URL. */
  hidden?: boolean;
}

// Items marked `hidden: true` are kept in code so the routes still work and
// can be re-enabled by removing the flag.
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, hidden: true },
      { href: "/guide", label: "Guide", icon: BookOpen },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Orders & Shipping",
    items: [
      { href: "/orders", label: "Orders", icon: ShoppingCart },
      { href: "/backorders", label: "Backorders", icon: AlertCircle, hidden: true },
    ],
  },
  {
    label: "Procurement",
    items: [
      { href: "/parts", label: "Parts Catalog", icon: Package },
      { href: "/elevators", label: "Elevator Configurator", icon: Boxes, hidden: true },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/users", label: "Users", icon: Users },
      { href: "/locations", label: "Locations", icon: Globe2, hidden: true },
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/suggestions", label: "Suggestions", icon: Lightbulb },
    ],
  },
];

// Visible-only navigation, with empty groups dropped.
const VISIBLE_NAV_GROUPS = NAV_GROUPS.map((g) => ({
  ...g,
  items: g.items.filter((i) => !i.hidden),
})).filter((g) => g.items.length > 0);

function NavContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {VISIBLE_NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <SidebarLink
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      active={active}
                      onNavigate={onNavigate}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 px-4 py-3">
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <p className="font-medium text-slate-700">v1.0.0</p>
          <p>Enterprise build</p>
        </div>
      </div>
    </>
  );
}

function LogoBlock() {
  return (
    <div className="flex h-16 shrink-0 items-center gap-2 px-5 border-b border-slate-200">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden shadow-sm bg-white border border-slate-100">
        <Image src="/pve-logo.webp" width={36} height={36} alt="PVE" className="object-contain" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-slate-900">PVE Portal</p>
        <p className="text-[11px] text-slate-500">Logistics & Ordering</p>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  const close = () => setSidebarOpen(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-30 border-r border-slate-200 bg-white">
        <LogoBlock />
        <NavContent pathname={pathname} />
      </aside>

      {/* Mobile / tablet drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/30"
            onClick={close}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden shadow-sm bg-white border border-slate-100">
                  <Image src="/pve-logo.webp" width={36} height={36} alt="PVE" className="object-contain" />
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-slate-900">PVE Portal</p>
                  <p className="text-[11px] text-slate-500">Logistics & Ordering</p>
                </div>
              </div>
              <button
                onClick={close}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavContent pathname={pathname} onNavigate={close} />
          </aside>
        </div>
      )}
    </>
  );
}
