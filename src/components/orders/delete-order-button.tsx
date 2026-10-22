"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiFetch } from "@/lib/api-fetch";

interface Props {
  orderId: string;
  /** A never-submitted draft is hard-deleted; anything else is archived. */
  isDraft: boolean;
}

export function DeleteOrderButton({ orderId, isDraft }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    const res = await apiFetch(`/api/orders/${orderId}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      setError(json?.error ?? "Failed to delete order.");
      return;
    }
    router.push("/orders");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
      {open && (
        <ConfirmDialog
          open
          title={isDraft ? "Delete this draft?" : "Delete this order?"}
          description={
            isDraft
              ? "This draft will be permanently removed."
              : "The order will be removed from the list. Its history is kept for the audit trail."
          }
          confirmLabel="Delete"
          variant="danger"
          loading={loading}
          onCancel={() => setOpen(false)}
          onConfirm={run}
        />
      )}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </>
  );
}
