"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-fetch";

export function RequestModificationButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onClick() {
    const ok = window.confirm(
      "This will reopen the order for editing and notify the receiving region when you re-submit. Continue?",
    );
    if (!ok) return;
    setError(null);
    setLoading(true);
    const res = await apiFetch(`/api/orders/${orderId}/request-modification`, {
      method: "POST",
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json?.error ?? "Failed to start modification.");
      return;
    }
    router.push(`/orders/${orderId}/edit`);
    router.refresh();
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClick}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reopening…
          </>
        ) : (
          <>
            <RotateCcw className="h-3.5 w-3.5" /> Request modification
          </>
        )}
      </Button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
