import { redirect } from "next/navigation";
import {
  Building2,
  Ship,
  ArrowRight,
  Check,
  Ban,
  PencilLine,
  Gauge,
  Trash2,
  Lightbulb,
  MessageSquare,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { OrderJourney } from "@/components/guide/order-journey";

export const dynamic = "force-dynamic";

type Cell = "yes" | "own" | "no";

const MATRIX: {
  action: string;
  sub: string;
  cells: Cell[]; // Super Admin, Location Admin, Manager, Staff, Viewer
  highlight?: boolean;
}[] = [
  { action: "Create & submit orders", sub: "Start a container order for a location", cells: ["yes", "own", "own", "own", "no"] },
  { action: "Receive & progress orders sent to them", sub: "Approve, accept, dispatch & deliver", cells: ["yes", "own", "own", "own", "no"], highlight: true },
  { action: "Set container fill %", sub: "Track how full a container is", cells: ["yes", "own", "own", "own", "no"] },
  { action: "Delete / archive orders", sub: "Clean up drafts & retired orders", cells: ["yes", "own", "no", "no", "no"] },
  { action: "Manage users", sub: "Add people & set their roles", cells: ["yes", "own", "no", "no", "no"] },
  { action: "View everything", sub: "See orders and the shipping calendar", cells: ["yes", "yes", "yes", "yes", "yes"] },
];

const ROLES = [
  { name: "Super Admin", scope: "all locations" },
  { name: "Location Admin", scope: "own location" },
  { name: "Manager", scope: "own location" },
  { name: "Staff", scope: "own location" },
  { name: "Viewer", scope: "read-only" },
];

function CellMark({ v }: { v: Cell }) {
  if (v === "yes") return <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="Yes" />;
  if (v === "own") return <span className="text-xs font-semibold text-blue-600">Own</span>;
  return <span className="text-slate-300" aria-label="Not allowed">&mdash;</span>;
}

const PATHS = [
  { icon: Ban, title: "Decline", desc: "If the fulfilling side can't take an order, they decline it with a reason. The ordering side sees exactly why.", by: "Fulfilling side, at review or accept" },
  { icon: PencilLine, title: "Request a change", desc: "After approval, the ordering side can reopen an order to edit items or notes. It then re-runs through review.", by: "Ordering side, after approved" },
  { icon: Gauge, title: "Container fill %", desc: "Anyone working an order can set how full its container is (0-100%), so both sides see real-time progress.", by: "Either side, anytime" },
  { icon: Trash2, title: "Delete & clean up", desc: "Admins tidy the system. Unsent drafts are removed outright; real orders are archived — hidden from the list but kept for records.", by: "Admins only" },
  { icon: Lightbulb, title: "Suggestions box", desc: "Anyone can drop an idea or report an issue right inside the app. Managers review and mark them resolved.", by: "Everyone, reviewed by managers" },
];

export default async function GuidePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <PageHeader
        title="Guide"
        description="How an order moves through the portal, from creation to delivery — and who does what."
      />

      {/* Mental model */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          Two sides: one orders, the other fulfils
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          An order is created at one location and sent to another. The moment it&apos;s submitted, responsibility
          hands over &mdash; everything after that is the fulfilling location&apos;s to run.
        </p>
        <div className="mt-4 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-2xl border border-slate-200/70 border-t-4 border-t-amber-400 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-700">
                <Building2 className="h-4 w-4" />
              </span>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-amber-700">Ordering side</div>
                <div className="text-sm font-semibold text-slate-900">Places the order</div>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />Builds the order &amp; line items</li>
              <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />Submits it for the other side to fulfil</li>
              <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />Can later request a change, or track progress</li>
            </ul>
          </div>

          <div className="flex items-center justify-center md:flex-col">
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Hands over at</span>
              <span className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">Submit</span>
              <ArrowRight className="mt-1 h-5 w-5 text-slate-300 md:rotate-90" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 border-t-4 border-t-brand-500 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700">
                <Ship className="h-4 w-4" />
              </span>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-brand-700">Fulfilling side</div>
                <div className="text-sm font-semibold text-slate-900">Ships the order</div>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />Approves &amp; accepts (or declines)</li>
              <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />Commits the ship &amp; arrival dates</li>
              <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />Dispatches, then marks delivered</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Interactive journey */}
      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight text-slate-900">
          The full journey, step by step
        </h2>
        <OrderJourney />
      </section>

      {/* Role matrix */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Who can do what</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Everyone is tied to a location. Most actions are scoped to your own location; a Super Admin works across
          all of them.
        </p>
        <div className="mt-4">
          <Table>
            <THead>
              <tr>
                <TH className="min-w-[220px]">Action</TH>
                {ROLES.map((r) => (
                  <TH key={r.name} className="text-center">
                    <span className="block normal-case text-slate-700">{r.name}</span>
                    <span className="block text-[10px] font-normal normal-case text-slate-400">{r.scope}</span>
                  </TH>
                ))}
              </tr>
            </THead>
            <TBody>
              {MATRIX.map((row) => (
                <TR key={row.action} className={row.highlight ? "bg-amber-50/60" : undefined}>
                  <TD>
                    <div className="font-medium text-slate-900">{row.action}</div>
                    <div className="text-xs text-slate-400">{row.sub}</div>
                  </TD>
                  {row.cells.map((c, i) => (
                    <TD key={i} className="text-center">
                      <CellMark v={c} />
                    </TD>
                  ))}
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> full access</span>
          <span className="inline-flex items-center gap-1.5"><b className="font-semibold text-blue-600">Own</b> their own location only</span>
          <span className="inline-flex items-center gap-1.5"><span className="text-slate-300">&mdash;</span> not allowed</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-300" /> recently changed &mdash; Staff can now run the receiving side</span>
        </div>
      </section>

      {/* Other paths */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Other things that can happen</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PATHS.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]"
            >
              <span className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
                <p.icon className="h-[18px] w-[18px]" />
              </span>
              <h3 className="text-sm font-semibold text-slate-900">{p.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{p.desc}</p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-brand-700">{p.by}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feedback */}
      <section>
        <div className="flex flex-wrap items-start gap-5 rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
            <MessageSquare className="h-5 w-5" />
          </span>
          <div className="min-w-[280px] flex-1">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">This is how it works today</h2>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
              Nothing here is set in stone. If you&apos;d like a step to work differently &mdash; a different person
              approving, whether Staff should handle shipping, who&apos;s allowed to delete, an extra confirmation
              anywhere &mdash; just tell us and we&apos;ll adjust the portal to match how your team actually works.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Who approves & accepts?", "Should Staff run shipping?", "Who can delete orders?", "Any step to add or remove?"].map((q) => (
                <span key={q} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
                  {q}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
