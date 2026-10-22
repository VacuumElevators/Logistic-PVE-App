"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-fetch";

export function SuggestionForm() {
  const router = useRouter();
  const [message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function submit() {
    if (message.trim().length < 3) {
      setError("Please write a little more.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await apiFetch("/api/suggestions", {
      method: "POST",
      body: JSON.stringify({ message: message.trim() }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json?.error ?? "Failed to submit. Try again.");
      return;
    }
    setMessage("");
    setDone(true);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share a suggestion</CardTitle>
      </CardHeader>
      <div className="px-6 pb-6 space-y-3">
        {done && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-none" />
            <p className="text-xs text-emerald-800">
              Thanks — your suggestion was submitted.
            </p>
          </div>
        )}
        <Textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (done) setDone(false);
          }}
          placeholder="What would make the portal better? Report an issue, request a feature, or share an idea."
          className="min-h-[120px]"
          maxLength={2000}
        />
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <div className="flex justify-end">
          <Button onClick={submit} disabled={loading || message.trim().length < 3}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Submit
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
