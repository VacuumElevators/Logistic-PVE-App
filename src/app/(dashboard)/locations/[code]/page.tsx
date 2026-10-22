import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { sb } from "@/lib/sb";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  getLocation,
  getLocationStats,
  listManagerCandidates,
} from "@/lib/locations";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  EmptyRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { LocationEditForm } from "./location-edit-form";
import { formatDate, locationLabel } from "@/lib/utils";
import { LOCATIONS } from "@/lib/constants";
import type { Database } from "@/types/database";

type Location = Database["public"]["Enums"]["Location"];

export const dynamic = "force-dynamic";

interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  originLocation: string;
  destLocation: string;
  customer: { name: string } | null;
}

function isLocationCode(value: string): value is Location {
  return (LOCATIONS as readonly string[]).includes(value);
}

export default async function LocationDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session, "locations.read")) {
    return (
      <Card className="p-10 text-center text-sm text-slate-500">
        You don't have access.
      </Card>
    );
  }
  const { code } = await params;
  if (!isLocationCode(code)) notFound();

  const location = await getLocation(code);
  if (!location) notFound();

  const canWrite =
    can(session, "locations.write") &&
    (session.role === "SUPER_ADMIN" || session.location === code);
  const canToggleEnable = session.role === "SUPER_ADMIN";
  const client = sb();

  const [stats, candidates, incomingRes, outgoingRes] = await Promise.all([
    getLocationStats(code),
    listManagerCandidates(code),
    client
      .from("Order")
      .select("id, orderNumber, status, originLocation, destLocation, customer:Customer(name)")
      .eq("destLocation", code)
      .order("createdAt", { ascending: false })
      .limit(8),
    client
      .from("Order")
      .select("id, orderNumber, status, originLocation, destLocation, customer:Customer(name)")
      .eq("originLocation", code)
      .order("createdAt", { ascending: false })
      .limit(8),
  ]);
  if (incomingRes.error) throw incomingRes.error;
  if (outgoingRes.error) throw outgoingRes.error;
  const incoming = (incomingRes.data ?? []) as unknown as OrderRow[];
  const outgoing = (outgoingRes.data ?? []) as unknown as OrderRow[];

  return (
    <>
      <Link
        href="/locations"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" /> Back to locations
      </Link>

      <PageHeader
        title={`${location.flag ?? ""} ${location.name}`.trim()}
        description={`${location.city ? `${location.city}, ` : ""}${location.country} · ${location.code}`}
        actions={
          location.isEnabled ? (
            <Badge className="bg-emerald-50 text-emerald-700">Enabled</Badge>
          ) : (
            <Badge className="bg-rose-50 text-rose-700">Disabled</Badge>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat label="Incoming Orders" value={stats.incomingOrders} />
        <SummaryStat label="Outgoing Orders" value={stats.outgoingOrders} />
        <SummaryStat
          label="Containers In Transit"
          value={stats.inTransitContainers}
        />
        <SummaryStat label="Active Users" value={stats.userCount} />
      </div>

      <LocationEditForm
        code={code}
        canWrite={canWrite}
        canToggleEnable={canToggleEnable}
        initial={{
          name: location.name,
          country: location.country,
          city: location.city ?? "",
          address: location.address ?? "",
          phone: location.phone ?? "",
          email: location.email ?? "",
          currency: location.currency,
          timezone: location.timezone ?? "",
          flag: location.flag ?? "",
          isEnabled: location.isEnabled,
          managerId: location.managerId ?? "",
        }}
        managerCandidates={candidates}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Incoming Orders</CardTitle>
            <p className="text-xs text-slate-500">
              Most recent orders shipping <em>to</em> {location.name}
            </p>
          </CardHeader>
          <Table>
            <THead>
              <tr>
                <TH>Order #</TH>
                <TH>Customer</TH>
                <TH>From</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {incoming.length === 0 && <EmptyRow colSpan={4} />}
              {incoming.map((o) => (
                <TR key={o.id}>
                  <TD>
                    <Link
                      href={`/orders/${o.id}`}
                      className="font-medium text-slate-900 hover:text-brand-600"
                    >
                      {o.orderNumber}
                    </Link>
                  </TD>
                  <TD>{o.customer?.name ?? "—"}</TD>
                  <TD className="text-xs text-slate-500">
                    {locationLabel(o.originLocation)}
                  </TD>
                  <TD>
                    <StatusBadge kind="order" status={o.status} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outgoing Orders</CardTitle>
            <p className="text-xs text-slate-500">
              Most recent orders shipping <em>from</em> {location.name}
            </p>
          </CardHeader>
          <Table>
            <THead>
              <tr>
                <TH>Order #</TH>
                <TH>Customer</TH>
                <TH>To</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {outgoing.length === 0 && <EmptyRow colSpan={4} />}
              {outgoing.map((o) => (
                <TR key={o.id}>
                  <TD>
                    <Link
                      href={`/orders/${o.id}`}
                      className="font-medium text-slate-900 hover:text-brand-600"
                    >
                      {o.orderNumber}
                    </Link>
                  </TD>
                  <TD>{o.customer?.name ?? "—"}</TD>
                  <TD className="text-xs text-slate-500">
                    {locationLabel(o.destLocation)}
                  </TD>
                  <TD>
                    <StatusBadge kind="order" status={o.status} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <div className="px-6 pb-6 text-sm space-y-1.5 text-slate-700">
            <p>{location.address || "—"}</p>
            <p className="text-slate-500">
              {location.phone ? `📞 ${location.phone}` : ""}
            </p>
            <p className="text-slate-500">
              {location.email ? `✉ ${location.email}` : ""}
            </p>
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Provisioning</CardTitle>
          </CardHeader>
          <div className="px-6 pb-6 text-sm space-y-2 text-slate-700">
            <Row label="Code" value={location.code} />
            <Row label="Timezone" value={location.timezone ?? "—"} />
            <Row label="Currency" value={location.currency} />
            <Row label="Created" value={formatDate(location.createdAt)} />
            <Row label="Last updated" value={formatDate(location.updatedAt)} />
          </div>
        </Card>
      </div>
    </>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 last:border-0 py-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
