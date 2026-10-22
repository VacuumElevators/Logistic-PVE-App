"use client";

import * as React from "react";
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowRight,
  Building2,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Tone = "slate" | "amber" | "blue" | "indigo" | "violet" | "emerald";

interface Stage {
  status: string;
  side: "origin" | "dest";
  name: string;
  who: string;
  role: string;
  tone: Tone;
  action: string;
  button: string;
  result: string;
  canDecline?: boolean;
}

const STAGES: Stage[] = [
  {
    status: "DRAFT", side: "origin", name: "Create the order",
    who: "Ordering location", role: "Staff and up", tone: "slate",
    action:
      "Someone on the ordering side builds the order — the customer, the ordering-to-fulfilling route, elevators and parts, and any notes. Each order is exactly one container.",
    button: "Save as draft",
    result: "A draft order, ready to send. Nothing is visible to the other side yet.",
  },
  {
    status: "IN_PROCESS", side: "origin", name: "Submit for approval",
    who: "Ordering location", role: "Staff and up", tone: "amber",
    action:
      "They submit the order. It's automatically given its container number (C01, C02 … per route), and this is the hand-over point — responsibility now passes to the fulfilling location.",
    button: "Submit for approval",
    result: "The fulfilling location's whole team is notified that a new order has arrived.",
  },
  {
    status: "APPROVED", side: "dest", name: "Review & approve",
    who: "Fulfilling location", role: "Staff and up", tone: "blue", canDecline: true,
    action:
      "The fulfilling team reviews the order and confirms they can fulfil it. If they can't, they decline it with a reason instead.",
    button: "Approve",
    result: "The order is committed for fulfilment and moves forward.",
  },
  {
    status: "ACCEPTED", side: "dest", name: "Accept & set dates",
    who: "Fulfilling location", role: "Staff and up", tone: "indigo", canDecline: true,
    action:
      "They commit the shipment: set the estimated ship and arrival dates for the container.",
    button: "Accept & set dates",
    result: "The order is locked, and the ship & arrival dates now show on the ordering side.",
  },
  {
    status: "DISPATCHED", side: "dest", name: "Dispatch",
    who: "Fulfilling location", role: "Staff and up", tone: "violet",
    action:
      "When the container leaves, they mark it dispatched.",
    button: "Dispatch",
    result: "The order is on its way; the ordering side is notified it has shipped.",
  },
  {
    status: "DELIVERED", side: "dest", name: "Deliver",
    who: "Fulfilling location", role: "Staff and up", tone: "emerald",
    action: "On arrival, they mark the order delivered. That closes the loop.",
    button: "Mark delivered",
    result: "Order complete. The full history stays on record for both sides.",
  },
];

// All class strings are literal so Tailwind's compiler keeps them.
const TONE: Record<Tone, { pill: string; btn: string; dot: string; line: string }> = {
  slate: { pill: "bg-slate-100 text-slate-600", btn: "bg-slate-600", dot: "bg-slate-400", line: "bg-slate-400" },
  amber: { pill: "bg-amber-100 text-amber-700", btn: "bg-amber-500", dot: "bg-amber-500", line: "bg-amber-500" },
  blue: { pill: "bg-blue-100 text-blue-700", btn: "bg-blue-600", dot: "bg-blue-500", line: "bg-blue-500" },
  indigo: { pill: "bg-indigo-100 text-indigo-700", btn: "bg-indigo-600", dot: "bg-indigo-500", line: "bg-indigo-500" },
  violet: { pill: "bg-violet-100 text-violet-700", btn: "bg-violet-600", dot: "bg-violet-500", line: "bg-violet-500" },
  emerald: { pill: "bg-emerald-100 text-emerald-700", btn: "bg-emerald-600", dot: "bg-emerald-500", line: "bg-emerald-500" },
};

const SIDE = {
  origin: { label: "Ordering side", chip: "bg-amber-50 text-amber-800 border-amber-200" },
  dest: { label: "Fulfilling side", chip: "bg-brand-50 text-brand-700 border-brand-100" },
};

export function OrderJourney() {
  const [active, setActive] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = React.useCallback(() => {
    setPlaying(false);
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const go = React.useCallback((i: number) => {
    setActive(Math.max(0, Math.min(STAGES.length - 1, i)));
  }, []);

  function play() {
    setPlaying(true);
    setActive((a) => (a >= STAGES.length - 1 ? 0 : a));
    timer.current = setInterval(() => {
      setActive((a) => {
        if (a >= STAGES.length - 1) {
          if (timer.current) clearInterval(timer.current);
          timer.current = null;
          setPlaying(false);
          return a;
        }
        return a + 1;
      });
    }, 1900);
  }

  React.useEffect(() => () => stop(), [stop]);

  const s = STAGES[active];
  const tone = TONE[s.tone];
  const side = SIDE[s.side];

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] sm:p-6">
      {/* controls */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-slate-900">
            An order&apos;s six stops
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">
            Press Play to watch it move, or click any stop.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => { stop(); go(active - 1); }} disabled={active === 0} aria-label="Previous step">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="primary" size="sm" onClick={() => (playing ? stop() : play())}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? "Pause" : "Play"}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => { stop(); go(active + 1); }} disabled={active === STAGES.length - 1} aria-label="Next step">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        {/* rail */}
        <ol className="flex flex-col">
          {STAGES.map((stage, i) => {
            const done = i < active;
            const isActive = i === active;
            return (
              <li key={stage.status} className="flex items-stretch">
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => { stop(); go(i); }}
                    aria-current={isActive ? "step" : undefined}
                    aria-label={"Step " + (i + 1) + ": " + stage.name}
                    className={
                      "z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 font-mono text-xs font-semibold transition-all " +
                      (done
                        ? "border-brand-600 bg-brand-600 text-white"
                        : isActive
                        ? "border-brand-yellow bg-brand-yellow text-slate-900 ring-4 ring-brand-yellow-50 scale-110"
                        : "border-slate-300 bg-white text-slate-400 hover:border-slate-400")
                    }
                  >
                    {done ? <Check className="h-4 w-4" /> : String(i + 1).padStart(2, "0")}
                  </button>
                  {i < STAGES.length - 1 && (
                    <span className={"my-0.5 w-0.5 grow rounded " + (i < active ? "bg-brand-500" : "bg-slate-200")} />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { stop(); go(i); }}
                  className="group -mt-0.5 flex-1 rounded-lg px-3 pb-4 pt-1 text-left hover:bg-slate-50"
                >
                  <div className={"text-sm font-semibold tracking-tight " + (isActive ? "text-brand-700" : "text-slate-800")}>
                    {stage.name}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
                    {SIDE[stage.side].label}
                  </div>
                </button>
              </li>
            );
          })}
        </ol>

        {/* detail */}
        <div key={active} className="animate-fade-in rounded-xl border border-slate-200/70 bg-slate-50/40 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className={"inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-xs font-semibold " + tone.pill}>
              <span className={"h-2 w-2 rounded-full " + tone.dot} />
              {s.status}
            </span>
            <span className="font-mono text-xs text-slate-400">Step {active + 1} / {STAGES.length}</span>
          </div>

          <h4 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">{s.name}</h4>

          <div className="mt-3">
            <span className={"inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium " + side.chip}>
              <Building2 className="h-4 w-4" />
              {s.who}
              <span className="font-mono text-[11px] opacity-80">{s.role}</span>
            </span>
          </div>

          <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-slate-700">{s.action}</p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">In the app they press</span>
            <span className={"inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm " + tone.btn}>
              {s.button}
            </span>
            {s.canDecline && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600">
                <Ban className="h-3.5 w-3.5" /> or Decline
              </span>
            )}
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-lg border border-slate-200/70 bg-white px-4 py-3">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">What happens next</div>
              <p className="mt-0.5 text-sm text-slate-600">{s.result}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
