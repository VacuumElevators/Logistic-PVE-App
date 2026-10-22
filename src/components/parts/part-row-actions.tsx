"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiFetch } from "@/lib/api-fetch";

interface Props {
  part: { id: string; sku: string; name: string };
  canManage: boolean;
}

export function PartRowActions({ part, canManage }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!canManage) {
    return <span className="text-xs text-slate-300">—</span>;
  }

  async function performDelete() {
    setBusy(true);
    setError(null);
    const res = await apiFetch(`/api/parts/${part.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json?.error ?? "Failed to delete part.");
      return;
    }
    setConfirmDelete(false);
    router.refresh();
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-slate-900"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menuOpen && (
        <>
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-10"
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-slate-200 bg-white shadow-lg animate-fade-in"
          >
            <Link
              href={`/parts/${part.id}`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-t-lg"
              onClick={() => setMenuOpen(false)}
            >
              <Pencil className="h-3.5 w-3.5" /> Edit part
            </Link>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setConfirmDelete(true);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-b-lg"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${part.sku}?`}
        description={
          <>
            <p>
              This permanently removes <strong>{part.name}</strong>.
            </p>
            {error && (
              <p className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs text-rose-700">
                {error}
              </p>
            )}
          </>
        }
        confirmLabel="Delete part"
        variant="danger"
        loading={busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={performDelete}
      />
    </div>
  );
}
