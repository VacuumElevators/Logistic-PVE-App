import {
  ShoppingCart,
  LogIn,
  Container as ContainerIcon,
  Package,
  AlertCircle,
  Activity,
  Calendar as CalendarIcon,
} from "lucide-react";
import type { ActivityEntry } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

const ENTITY_ICON: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; accent: string }
> = {
  Order: { icon: ShoppingCart, accent: "bg-brand-50 text-brand-600" },
  Container: { icon: ContainerIcon, accent: "bg-sky-50 text-sky-600" },
  Part: { icon: Package, accent: "bg-violet-50 text-violet-600" },
  Backorder: { icon: AlertCircle, accent: "bg-rose-50 text-rose-600" },
  User: { icon: LogIn, accent: "bg-emerald-50 text-emerald-600" },
  CalendarEvent: { icon: CalendarIcon, accent: "bg-amber-50 text-amber-600" },
};

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function describeAction(entry: ActivityEntry): string {
  const who = entry.userName ?? "System";
  switch (`${entry.action}:${entry.entity}`) {
    case "CREATE:Order":
      return `${who} created a new order`;
    case "UPDATE:Order":
      return `${who} updated an order`;
    case "LOGIN:User":
      return `${who} signed in`;
    case "DISPATCH:Order":
      return `${who} dispatched an order`;
    default: {
      const verb = entry.action.toLowerCase().replace(/_/g, " ");
      return `${who} ${verb}d ${entry.entity.toLowerCase()}`;
    }
  }
}

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="px-6 pb-8 pt-2 text-sm text-slate-400 text-center">
        No recent activity yet.
      </div>
    );
  }

  return (
    <ol className="relative px-6 pb-6">
      <span
        aria-hidden
        className="absolute left-[34px] top-2 bottom-2 w-px bg-slate-100"
      />
      {entries.map((entry) => {
        const meta = ENTITY_ICON[entry.entity] ?? {
          icon: Activity,
          accent: "bg-slate-100 text-slate-600",
        };
        const Icon = meta.icon;
        return (
          <li
            key={entry.id}
            className="relative flex gap-3 py-2.5 first:pt-1 last:pb-0"
          >
            <span
              className={cn(
                "relative z-10 flex h-9 w-9 flex-none items-center justify-center rounded-full ring-4 ring-white",
                meta.accent,
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-700 truncate">
                {describeAction(entry)}
              </p>
              <p className="text-xs text-slate-400">
                {timeAgo(entry.createdAt)}
                {entry.entityId ? ` · ${entry.entityId.slice(-6)}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
