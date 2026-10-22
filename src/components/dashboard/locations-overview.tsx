import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  LocationStats,
  LocationWithManager,
} from "@/lib/locations";
import { cn } from "@/lib/utils";

interface Props {
  locations: Array<LocationWithManager & { stats: LocationStats }>;
}

export function LocationsOverview({ locations }: Props) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Locations Overview</CardTitle>
        <Link
          href="/locations"
          className="text-xs font-medium text-brand-600 hover:underline"
        >
          Manage →
        </Link>
      </CardHeader>
      <div className="px-6 pb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {locations.map((loc) => (
          <Link
            key={loc.code}
            href={`/locations/${loc.code}`}
            className={cn(
              "rounded-xl border border-slate-100 p-3 transition-shadow hover:shadow-md",
              !loc.isEnabled && "opacity-60",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl leading-none">{loc.flag ?? "📍"}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {loc.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {loc.country}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Metric
                icon={<ArrowDownToLine className="h-3 w-3" />}
                label="In"
                value={loc.stats.incomingOrders}
                color="text-brand-600"
              />
              <Metric
                icon={<ArrowUpFromLine className="h-3 w-3" />}
                label="Out"
                value={loc.stats.outgoingOrders}
                color="text-sky-600"
              />
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function Metric({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1.5">
      <span className={cn("inline-flex items-center gap-1.5 font-medium", color)}>
        {icon}
        {label}
      </span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
