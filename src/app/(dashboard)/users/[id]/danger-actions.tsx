"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiFetch } from "@/lib/api-fetch";
import type { Database } from "@/types/database";

type UserStatus = Database["public"]["Enums"]["UserStatus"];

interface Props {
  userId: string;
  userName: string;
  status: UserStatus;
}

export function DangerActions({ userId, userName, status }: Props) {
  const router = useRouter();
  const [pending, setPending] = React.useState<
    null | { kind: "toggle" | "delete"; busy: boolean }
  >(null);

  const nextStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  async function performToggle() {
    setPending((p) => (p ? { ...p, busy: true } : p));
    const res = await apiFetch(`/api/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    setPending(null);
    if (res.ok) router.refresh();
  }

  async function performDelete() {
    setPending((p) => (p ? { ...p, busy: true } : p));
    const res = await apiFetch(`/api/users/${userId}`, { method: "DELETE" });
    setPending(null);
    if (res.ok) router.push("/users");
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-3">
        <div>
          <p className="font-medium text-slate-900">
            {status === "ACTIVE" ? "Deactivate account" : "Reactivate account"}
          </p>
          <p className="text-xs text-slate-500">
            {status === "ACTIVE"
              ? "Prevents sign-in and revokes all active sessions."
              : "Restores portal access."}
          </p>
        </div>
        <Button
          variant={status === "ACTIVE" ? "danger" : "primary"}
          onClick={() => setPending({ kind: "toggle", busy: false })}
        >
          <Power className="h-3.5 w-3.5" />
          {status === "ACTIVE" ? "Deactivate" : "Activate"}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-rose-100 bg-rose-50/40 p-3">
        <div>
          <p className="font-medium text-rose-700">Delete user</p>
          <p className="text-xs text-rose-600/80">
            Permanently removes the user. If they have orders or POs, the
            account is archived instead.
          </p>
        </div>
        <Button
          variant="danger"
          onClick={() => setPending({ kind: "delete", busy: false })}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>

      <ConfirmDialog
        open={pending?.kind === "toggle"}
        title={
          status === "ACTIVE"
            ? `Deactivate ${userName}?`
            : `Activate ${userName}?`
        }
        description={
          status === "ACTIVE"
            ? "Active sessions will be revoked immediately."
            : "The user will regain access to the portal."
        }
        confirmLabel={status === "ACTIVE" ? "Deactivate" : "Activate"}
        variant={status === "ACTIVE" ? "danger" : "primary"}
        loading={!!pending?.busy}
        onCancel={() => setPending(null)}
        onConfirm={performToggle}
      />

      <ConfirmDialog
        open={pending?.kind === "delete"}
        title={`Delete ${userName}?`}
        description="This cannot be undone."
        confirmLabel="Delete user"
        variant="danger"
        loading={!!pending?.busy}
        onCancel={() => setPending(null)}
        onConfirm={performDelete}
      />
    </div>
  );
}
