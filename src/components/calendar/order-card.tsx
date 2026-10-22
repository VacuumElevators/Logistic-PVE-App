"use client";

import {
  FileEdit,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  PackageCheck,
  XCircle,
} from "lucide-react";
import type { CalendarOrder } from "./types";
import { LOCATION_META, ORDER_STATUS_COLOR, type LocationKey } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  DRAFT: FileEdit,
  IN_PROCESS: Clock,
  APPROVED: CheckCircle2,
  ACCEPTED: Package,
  DISPATCHED: Truck,
  DELIVERED: PackageCheck,
  DECLINED: XCircle,
};

export function OrderCard({
  order,
  onClick,
}: {
  order: CalendarOrder;
  onClick: () => void;
}) {
  const origin = LOCATION_META[order.originLocation as LocationKey];
  const dest = LOCATION_META[order.destLocation as LocationKey];
  const Icon = STATUS_ICON[order.status] ?? FileEdit;
  const shipmentNumber =
    order.type === "AIRFREIGHT"
      ? (order.airNumber ?? "—")
      : (order.containerNumber ?? "—");
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group block w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-left text-[11px] leading-tight transition-all",
        "hover:border-slate-300 hover:shadow-sm",
        order.status === "DECLINED" && "opacity-60",
      )}
      title={`${shipmentNumber} · ${order.orderNumber}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-sm leading-none">{origin?.flag ?? "📍"}</span>
        <span className="text-[10px] text-slate-400">→</span>
        <span className="text-sm leading-none">{dest?.flag ?? "📍"}</span>
        <span className="truncate font-mono text-[10px] font-semibold text-slate-700">
          {shipmentNumber}
        </span>
        <Icon className="h-3 w-3 flex-none ml-auto text-slate-400" />
      </div>
      <div
        className={cn(
          "mt-0.5 inline-flex rounded px-1 text-[9px] font-medium",
          ORDER_STATUS_COLOR[order.status] ?? "bg-slate-100 text-slate-700",
        )}
      >
        {order.status.replace("_", " ")}
      </div>
      {order.fillPercent != null && (
        <span className="ml-1 text-[9px] text-slate-400">{order.fillPercent}%</span>
      )}
    </button>
  );
}
