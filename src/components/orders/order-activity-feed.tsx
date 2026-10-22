"use client";

import * as React from "react";
import {
  FilePlus,
  Pencil,
  Send,
  CheckCircle2,
  XCircle,
  Truck,
  PackageCheck,
  Trash2,
  Activity,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Link2,
} from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";

interface ActivityEntry {
  id: string;
  action: string;
  createdAt: string | Date;
  metadata: unknown;
  user: { id: string; name: string } | null;
}

interface ModificationSnapshot {
  previousItems?: Array<{
    id?: string;
    elevatorModelId: string | null;
    partId: string | null;
    description: string;
    quantity: number;
  }>;
  previousStatus?: string;
}

const ICON: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
    label: (m: unknown) => string;
  }
> = {
  CREATE: {
    icon: FilePlus,
    accent: "bg-slate-100 text-slate-600",
    label: () => "created the order",
  },
  UPDATE: {
    icon: Pencil,
    accent: "bg-slate-100 text-slate-600",
    label: () => "updated draft fields",
  },
  SUBMIT: {
    icon: Send,
    accent: "bg-blue-50 text-blue-600",
    label: () => "submitted for approval",
  },
  ACCEPT: {
    icon: CheckCircle2,
    accent: "bg-emerald-50 text-emerald-600",
    label: () => "accepted the order",
  },
  APPROVE: {
    icon: CheckCircle2,
    accent: "bg-emerald-50 text-emerald-600",
    label: () => "approved the order",
  },
  DECLINE: {
    icon: XCircle,
    accent: "bg-rose-50 text-rose-600",
    label: (m) => {
      const reason = (m as { reason?: string } | null)?.reason;
      return reason ? `declined the order: "${reason}"` : "declined the order";
    },
  },
  DISPATCH: {
    icon: Truck,
    accent: "bg-sky-50 text-sky-600",
    label: (m) => {
      const cnum = (m as { containerNumber?: string } | null)?.containerNumber;
      return cnum ? `dispatched (container ${cnum})` : "dispatched the order";
    },
  },
  DELIVER: {
    icon: PackageCheck,
    accent: "bg-emerald-50 text-emerald-600",
    label: () => "marked as delivered",
  },
  DELETE: {
    icon: Trash2,
    accent: "bg-rose-50 text-rose-600",
    label: () => "deleted the order",
  },
  LINK_SLOT: {
    icon: Link2,
    accent: "bg-slate-100 text-slate-600",
    label: () => "linked a container",
  },
  REQUEST_MODIFICATION: {
    icon: RotateCcw,
    accent: "bg-amber-50 text-amber-700",
    label: () => "requested a modification",
  },
};

export function OrderActivityFeed({
  entries,
}: {
  entries: ActivityEntry[];
}) {
  if (entries.length === 0) {
    return (
      <div className="px-6 pb-8 pt-2 text-sm text-slate-400 text-center">
        No activity yet.
      </div>
    );
  }

  return (
    <ol className="relative px-6 pb-6">
      <span
        aria-hidden
        className="absolute left-[34px] top-2 bottom-2 w-px bg-slate-100"
      />
      {entries.map((e) => {
        const meta = ICON[e.action] ?? {
          icon: Activity,
          accent: "bg-slate-100 text-slate-600",
          label: () => e.action.toLowerCase(),
        };
        const Icon = meta.icon;
        const isModification = e.action === "REQUEST_MODIFICATION";
        return (
          <li
            key={e.id}
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
              <p className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">
                  {e.user?.name ?? "System"}
                </span>{" "}
                {meta.label(e.metadata)}
              </p>
              <p className="text-xs text-slate-400">
                {formatDateTime(e.createdAt)}
              </p>
              {isModification && (
                <ModificationSnapshotPanel
                  metadata={e.metadata as ModificationSnapshot | null}
                />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ModificationSnapshotPanel({
  metadata,
}: {
  metadata: ModificationSnapshot | null;
}) {
  const [open, setOpen] = React.useState(false);
  const items = metadata?.previousItems ?? [];
  if (items.length === 0) return null;

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        Previous contents ({items.length} item{items.length === 1 ? "" : "s"})
      </button>
      {open && (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50/40 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-amber-800 bg-amber-100/50">
                <th className="px-2 py-1.5 font-medium">Item</th>
                <th className="px-2 py-1.5 font-medium">Description</th>
                <th className="px-2 py-1.5 font-medium text-right">Qty</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr
                  key={it.id ?? idx}
                  className="border-t border-amber-100 text-slate-700"
                >
                  <td className="px-2 py-1.5 font-mono text-[10px]">
                    {it.elevatorModelId
                      ? "Elevator"
                      : it.partId
                        ? "Part"
                        : "General"}
                  </td>
                  <td className="px-2 py-1.5">{it.description}</td>
                  <td className="px-2 py-1.5 text-right">{it.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
