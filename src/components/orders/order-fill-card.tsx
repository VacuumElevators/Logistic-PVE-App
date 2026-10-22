"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { apiFetch } from "@/lib/api-fetch";

const FILL_OPTIONS = [0, 10, 25, 50, 75, 90, 100];

interface Props {
  orderId: string;
  fillPercent: number | null;
  /** Whether the current viewer may update the fill % (non-viewer origin/receiver). */
  canEdit: boolean;
}

export function OrderFillCard({ orderId, fillPercent, canEdit }: Props) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function update(value: string) {
    if (value === "") return;
    setSaving(true);
    setError(null);
    const res = await apiFetch(`/api/orders/${orderId}/fill`, {
      method: "PATCH",
      body: JSON.stringify({ fillPercent: Number(value) }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(json?.error ?? "Failed to update fill %.");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Container fill</CardTitle>
      </CardHeader>
      <div className="px-6 pb-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${fillPercent ?? 0}%` }}
            />
          </div>
          <span className="w-12 text-right text-sm font-semibold tabular-nums text-slate-900">
            {fillPercent == null ? "—" : `${fillPercent}%`}
          </span>
        </div>

        {canEdit ? (
          <>
            <Combobox
              aria-label="Container fill percentage"
              value={fillPercent == null ? "" : String(fillPercent)}
              onChange={update}
              className="h-9"
              placeholder="Set fill %"
              options={FILL_OPTIONS.map((n) => ({
                value: String(n),
                label: `${n}%`,
              }))}
            />
            {saving && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
              </div>
            )}
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <p className="text-[11px] text-slate-400">
              How full the container is — lets the team track progress and flag
              partially-complete orders.
            </p>
          </>
        ) : (
          fillPercent == null && (
            <p className="text-xs text-slate-500">Not set yet.</p>
          )
        )}
      </div>
    </Card>
  );
}
