"use client";

import Link, { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onNavigate?: () => void;
}

export function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: Props) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      prefetch
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-brand-50 text-brand-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      <Icon
        className={cn("h-4 w-4", active ? "text-brand-600" : "text-slate-400")}
      />
      <span className="flex-1">{label}</span>
      <PendingDot />
    </Link>
  );
}

function PendingDot() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "h-1.5 w-1.5 rounded-full bg-brand-500 transition-opacity",
        pending ? "opacity-100 animate-pulse" : "opacity-0",
      )}
    />
  );
}
