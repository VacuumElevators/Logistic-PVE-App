"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, RotateCcw } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-fetch";
import { formatDateTime } from "@/lib/utils";

export interface SuggestionRow {
  id: string;
  message: string;
  status: string;
  createdAt: string;
  createdBy: { name: string } | null;
  resolvedBy: { name: string } | null;
}

export function SuggestionList({
  suggestions,
}: {
  suggestions: SuggestionRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function setStatus(id: string, status: "OPEN" | "RESOLVED") {
    setBusy(id);
    await apiFetch(`/api/suggestions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All suggestions</CardTitle>
      </CardHeader>
      <div className="px-6 pb-6">
        {suggestions.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            No suggestions yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {suggestions.map((s) => {
              const resolved = s.status === "RESOLVED";
              return (
                <li key={s.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="whitespace-pre-wrap text-sm text-slate-800">
                        {s.message}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {s.createdBy?.name ?? "Someone"} ·{" "}
                        {formatDateTime(s.createdAt)}
                        {resolved && s.resolvedBy
                          ? ` · resolved by ${s.resolvedBy.name}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-none items-center gap-2">
                      <Badge
                        className={
                          resolved
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }
                      >
                        {resolved ? "Resolved" : "Open"}
                      </Badge>
                      <button
                        type="button"
                        disabled={busy === s.id}
                        onClick={() =>
                          setStatus(s.id, resolved ? "OPEN" : "RESOLVED")
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {busy === s.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : resolved ? (
                          <>
                            <RotateCcw className="h-3 w-3" /> Reopen
                          </>
                        ) : (
                          <>
                            <Check className="h-3 w-3" /> Resolve
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
