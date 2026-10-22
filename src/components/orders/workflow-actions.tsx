"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiFetch } from "@/lib/api-fetch";
import type { OrderAction } from "@/lib/order-workflow";

interface Props {
  orderId: string;
  actions: OrderAction[];
  status: string;
}

export function WorkflowActions({ orderId, actions, status }: Props) {
  const router = useRouter();
  const [pending, setPending] = React.useState<OrderAction | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");
  const [shipDate, setShipDate] = React.useState("");
  const [arrivalDate, setArrivalDate] = React.useState("");

  async function runAction(action: OrderAction) {
    setError(null);
    setLoading(true);
    const body: Record<string, unknown> = {};
    if (action.action === "decline") body.reason = reason.trim();
    if (action.action === "accept") {
      body.estimatedShipDate = shipDate;
      body.estimatedArrivalDate = arrivalDate;
    }
    const res = await apiFetch(`/api/orders/${orderId}/${action.action}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json?.error ?? "Action failed.");
      return;
    }
    setPending(null);
    setReason("");
    setShipDate("");
    setArrivalDate("");
    router.refresh();
  }

  function start(action: OrderAction) {
    setReason("");
    setShipDate("");
    setArrivalDate("");
    setError(null);
    setPending(action);
  }

  const isTerminal = status === "DELIVERED" || status === "DECLINED";

  if (actions.length === 0) {
    // Only show a note when the order is genuinely finished. When it's mid-flow
    // but the viewer simply isn't the acting party (origin waiting on the
    // destination team, or a read-only viewer), show nothing rather than the
    // misleading "terminal state" copy.
    if (isTerminal) {
      return (
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          This order is complete. No further actions available.
        </div>
      );
    }
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((a) => (
          <Button key={a.action} variant={a.variant} onClick={() => start(a)}>
            {a.label}
          </Button>
        ))}
      </div>

      {pending && pending.requiresReason && (
        <ReasonDialog
          title={pending.label}
          reason={reason}
          setReason={setReason}
          loading={loading}
          error={error}
          onCancel={() => setPending(null)}
          onConfirm={() => runAction(pending)}
        />
      )}

      {pending && pending.requiresShipArrivalDates && (
        <AcceptDialog
          shipDate={shipDate}
          arrivalDate={arrivalDate}
          setShipDate={setShipDate}
          setArrivalDate={setArrivalDate}
          loading={loading}
          error={error}
          onCancel={() => setPending(null)}
          onConfirm={() => runAction(pending)}
        />
      )}

      {pending &&
        !pending.requiresReason &&
        !pending.requiresShipArrivalDates && (
          <ConfirmDialog
            open
            title={`${pending.label}?`}
            description="This action cannot be undone."
            confirmLabel={pending.label}
            variant={pending.variant === "danger" ? "danger" : "primary"}
            loading={loading}
            onCancel={() => setPending(null)}
            onConfirm={() => runAction(pending)}
          />
        )}
    </>
  );
}

function ReasonDialog({
  title,
  reason,
  setReason,
  loading,
  error,
  onCancel,
  onConfirm,
}: {
  title: string;
  reason: string;
  setReason: (v: string) => void;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/30"
        onClick={() => !loading && onCancel()}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 animate-fade-in">
        <div className="px-6 pt-5 pb-3 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Provide a reason. The submitter will see this in their notification.
          </p>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Quantities exceed Q4 budget."
              autoFocus
              maxLength={500}
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={loading || reason.trim().length < 3}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Declining…
              </>
            ) : (
              "Decline"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AcceptDialog({
  shipDate,
  arrivalDate,
  setShipDate,
  setArrivalDate,
  loading,
  error,
  onCancel,
  onConfirm,
}: {
  shipDate: string;
  arrivalDate: string;
  setShipDate: (v: string) => void;
  setArrivalDate: (v: string) => void;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const valid =
    !!shipDate &&
    !!arrivalDate &&
    new Date(arrivalDate) >= new Date(shipDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/30"
        onClick={() => !loading && onCancel()}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 animate-fade-in">
        <div className="px-6 pt-5 pb-3 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">
            Accept order & commit shipping dates
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Once accepted, the order is locked. The submitter will see these
            estimates in their tracking view.
          </p>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="shipDate">Estimated ship date</Label>
            <DatePicker
              id="shipDate"
              value={shipDate}
              onChange={setShipDate}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="arrivalDate">Estimated arrival date</Label>
            <DatePicker
              id="arrivalDate"
              value={arrivalDate}
              onChange={setArrivalDate}
            />
          </div>
          {shipDate && arrivalDate && !valid && (
            <p className="text-xs text-rose-600">
              Arrival date must be on or after ship date.
            </p>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading || !valid}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Accepting…
              </>
            ) : (
              "Accept order"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
