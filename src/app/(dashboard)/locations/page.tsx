import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Container as ContainerIcon,
  Users,
  MapPin,
  Pencil,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { listLocationsWithStats } from "@/lib/locations";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session, "locations.read")) {
    return (
      <>
        <PageHeader title="Locations" />
        <Card className="p-10 text-center text-sm text-slate-500">
          You don't have access to locations.
        </Card>
      </>
    );
  }

  const locations = await listLocationsWithStats();
  const canEdit = can(session, "locations.write");

  return (
    <>
      <PageHeader
        title="Locations"
        description="Global PVE offices. Manage settings, managers and order flow."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {locations.map((loc) => {
          const editable =
            canEdit &&
            (session.role === "SUPER_ADMIN" ||
              session.location === loc.code);
          return (
            <Card
              key={loc.code}
              className={cn(
                "p-5 space-y-4 transition-shadow hover:shadow-md",
                !loc.isEnabled && "opacity-70",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-2xl">
                    {loc.flag ?? <MapPin className="h-5 w-5 text-slate-400" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">
                        {loc.name}
                      </h3>
                      {!loc.isEnabled && (
                        <Badge className="bg-rose-50 text-rose-700">
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {loc.city ? `${loc.city}, ` : ""}
                      {loc.country} · {loc.code}
                    </p>
                  </div>
                </div>
                {editable && (
                  <Link
                    href={`/locations/${loc.code}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Manage
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric
                  label="Incoming"
                  value={loc.stats.incomingOrders}
                  icon={<ArrowDownToLine className="h-4 w-4" />}
                  accent="text-brand-600 bg-brand-50"
                />
                <Metric
                  label="Outgoing"
                  value={loc.stats.outgoingOrders}
                  icon={<ArrowUpFromLine className="h-4 w-4" />}
                  accent="text-sky-600 bg-sky-50"
                />
                <Metric
                  label="In Transit"
                  value={loc.stats.inTransitContainers}
                  icon={<ContainerIcon className="h-4 w-4" />}
                  accent="text-emerald-600 bg-emerald-50"
                />
                <Metric
                  label="Active Users"
                  value={loc.stats.userCount}
                  icon={<Users className="h-4 w-4" />}
                  accent="text-violet-600 bg-violet-50"
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <div className="text-slate-500">
                  <span className="font-medium text-slate-700">Manager:</span>{" "}
                  {loc.manager ? loc.manager.name : "Unassigned"}
                </div>
                <div className="text-slate-500">
                  <span className="font-medium text-slate-700">Currency:</span>{" "}
                  {loc.currency}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <span
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-md",
            accent,
          )}
        >
          {icon}
        </span>
      </div>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
