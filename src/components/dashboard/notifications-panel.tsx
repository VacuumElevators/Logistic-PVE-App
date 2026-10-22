"use client";

import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Container as ContainerIcon,
  FileText,
  ShoppingCart,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
  type Notification,
} from "@/hooks/use-notifications";

const TYPE_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; accent: string }
> = {
  ORDER_UPDATE: { icon: ShoppingCart, accent: "bg-brand-50 text-brand-600" },
  CONTAINER_UPDATE: { icon: ContainerIcon, accent: "bg-sky-50 text-sky-600" },
  PO_APPROVAL: { icon: FileText, accent: "bg-amber-50 text-amber-600" },
  BACKORDER_ALERT: { icon: AlertCircle, accent: "bg-rose-50 text-rose-600" },
  SYSTEM: { icon: Bell, accent: "bg-slate-100 text-slate-600" },
};

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NotificationsPanel() {
  const { data, isLoading } = useNotifications();
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllRead();
  const list: Notification[] = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-slate-900">
            Notifications
          </h3>
          {unread > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-rose-500 text-white text-[10px] font-semibold px-1.5">
              {unread}
            </span>
          )}
        </div>
        <button
          onClick={() => markAll.mutate()}
          disabled={unread === 0 || markAll.isPending}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:text-slate-300 disabled:cursor-not-allowed"
        >
          <CheckCheck className="h-3.5 w-3.5" /> Mark all read
        </button>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[420px]">
        {isLoading && (
          <div className="px-6 py-8 text-sm text-slate-400 text-center">
            Loading…
          </div>
        )}
        {!isLoading && list.length === 0 && (
          <div className="px-6 py-12 text-sm text-slate-400 text-center">
            You're all caught up.
          </div>
        )}
        <ul className="divide-y divide-slate-100">
          {list.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.SYSTEM;
            const Icon = meta.icon;
            const Wrapper = n.link ? Link : "div";
            return (
              <li key={n.id}>
                <Wrapper
                  href={n.link ?? "#"}
                  className={cn(
                    "flex gap-3 px-6 py-3 transition-colors",
                    n.isRead ? "bg-white" : "bg-brand-50/40",
                    "hover:bg-slate-50",
                  )}
                  onClick={() => !n.isRead && markOne.mutate(n.id)}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 flex-none items-center justify-center rounded-full",
                      meta.accent,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {n.title}
                      </p>
                      <span className="text-[11px] text-slate-400 flex-none">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {n.message}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span
                      aria-hidden
                      className="self-center h-2 w-2 rounded-full bg-brand-500 flex-none"
                    />
                  )}
                </Wrapper>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
