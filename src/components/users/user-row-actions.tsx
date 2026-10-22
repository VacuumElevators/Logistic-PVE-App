"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";

interface UserRowActionsProps {
  user: {
    id: string;
    name: string;
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  };
  isSelf: boolean;
  canManage: boolean;
}

export function UserRowActions({ user, isSelf, canManage }: UserRowActionsProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [confirm, setConfirm] = React.useState<
    null | { kind: "delete" | "toggle"; busy: boolean }
  >(null);

  if (!canManage) {
    return <span className="text-xs text-slate-300">—</span>;
  }

  const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  async function performToggle() {
    setConfirm((c) => (c ? { ...c, busy: true } : c));
    const res = await apiFetch(`/api/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    setConfirm(null);
    if (res.ok) router.refresh();
  }

  async function performDelete() {
    setConfirm((c) => (c ? { ...c, busy: true } : c));
    const res = await apiFetch(`/api/users/${user.id}`, { method: "DELETE" });
    setConfirm(null);
    if (res.ok) router.refresh();
  }

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-slate-900"
        aria-haspopup="menu"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white shadow-lg animate-fade-in"
          >
            <Link
              href={`/users/${user.id}`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-t-lg"
              onClick={() => setOpen(false)}
            >
              <Pencil className="h-3.5 w-3.5" /> Edit user
            </Link>
            <button
              type="button"
              disabled={isSelf}
              onClick={() => {
                setOpen(false);
                setConfirm({ kind: "toggle", busy: false });
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50",
                isSelf && "opacity-40 cursor-not-allowed",
              )}
            >
              <Power className="h-3.5 w-3.5" />
              {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </button>
            <button
              type="button"
              disabled={isSelf}
              onClick={() => {
                setOpen(false);
                setConfirm({ kind: "delete", busy: false });
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-b-lg",
                isSelf && "opacity-40 cursor-not-allowed",
              )}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirm?.kind === "toggle"}
        title={
          user.status === "ACTIVE"
            ? `Deactivate ${user.name}?`
            : `Activate ${user.name}?`
        }
        description={
          user.status === "ACTIVE"
            ? "The user won't be able to sign in and active sessions will be revoked."
            : "The user will regain access to the portal."
        }
        confirmLabel={user.status === "ACTIVE" ? "Deactivate" : "Activate"}
        variant={user.status === "ACTIVE" ? "danger" : "primary"}
        loading={!!confirm?.busy}
        onCancel={() => setConfirm(null)}
        onConfirm={performToggle}
      />

      <ConfirmDialog
        open={confirm?.kind === "delete"}
        title={`Delete ${user.name}?`}
        description={
          <>
            <p>
              If the user has created orders or POs, the account is archived
              instead of permanently deleted to preserve audit history.
            </p>
            <p className="mt-2">Active sessions are always revoked.</p>
          </>
        }
        confirmLabel="Delete user"
        variant="danger"
        loading={!!confirm?.busy}
        onCancel={() => setConfirm(null)}
        onConfirm={performDelete}
      />
    </div>
  );
}
