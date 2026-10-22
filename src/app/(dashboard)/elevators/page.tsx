import Link from "next/link";
import { redirect } from "next/navigation";
import { sb } from "@/lib/sb";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Pagination } from "@/components/ui/pagination";
import { ConfigFilterBar } from "@/components/elevators/config-filter-bar";
import { formatStopsConfigShort } from "@/components/elevators/stop-config-grid";
import { STOP_OPTIONS, type StopConfig } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ELEVATOR_KIND_VALUES = ["CYLINDER", "CUBE"] as const;
const ENGINE_VALUES = ["NONE", "SPLIT", "HEAD_UNIT"] as const;

interface ConfigRow {
  id: string;
  name: string;
  color: string;
  elevatorKind: "CYLINDER" | "CUBE";
  engine: "NONE" | "SPLIT" | "HEAD_UNIT";
  stopsConfig: StopConfig[] | null;
  stops: number;
  quantity: number;
  notes: string | null;
  createdAt: string;
  model: { id: string; modelCode: string; name: string };
  createdBy: { id: string; name: string };
}

export default async function ElevatorsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    modelCode?: string;
    elevatorKind?: string;
    engine?: string;
    stops?: string;
    page?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session, "elevator.read")) {
    return (
      <>
        <PageHeader title="Elevators" />
        <Card className="p-10 text-center text-sm text-slate-500">
          You don't have access.
        </Card>
      </>
    );
  }

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pageSize = 20;
  const client = sb();

  const { data: modelsData, error: modelsErr } = await client
    .from("ElevatorModel")
    .select("*")
    .eq("isActive", true)
    .order("modelCode", { ascending: true });
  if (modelsErr) throw modelsErr;
  const models = modelsData ?? [];

  // Resolve modelCode → modelId(s) (if filtering).
  let modelIds: string[] | null = null;
  if (sp.modelCode) {
    const matched = models.filter((m) => m.modelCode === sp.modelCode);
    modelIds = matched.map((m) => m.id);
    if (modelIds.length === 0) {
      return (
        <>
          <PageHeader title="Elevator Configurations" />
          <Card className="p-6 text-sm text-slate-500">No models match this filter.</Card>
        </>
      );
    }
  }

  let q = client
    .from("ElevatorConfiguration")
    .select(
      "*, model:ElevatorModel(*), createdBy:User!ElevatorConfiguration_createdById_fkey(id, name)",
      { count: "exact" },
    )
    .eq("isActive", true)
    .order("createdAt", { ascending: false });
  if (modelIds) q = q.in("modelId", modelIds);
  if (
    sp.elevatorKind &&
    (ELEVATOR_KIND_VALUES as readonly string[]).includes(sp.elevatorKind)
  ) {
    q = q.eq(
      "elevatorKind",
      sp.elevatorKind as (typeof ELEVATOR_KIND_VALUES)[number],
    );
  }
  if (sp.engine && (ENGINE_VALUES as readonly string[]).includes(sp.engine)) {
    q = q.eq("engine", sp.engine as (typeof ENGINE_VALUES)[number]);
  }
  if (sp.stops && (STOP_OPTIONS as readonly number[]).includes(Number(sp.stops))) {
    q = q.eq("stops", Number(sp.stops));
  }
  if (sp.search) {
    q = q.or(`name.ilike.%${sp.search}%,color.ilike.%${sp.search}%`);
  }

  const skip = (page - 1) * pageSize;
  const { data: configsData, count, error: configsErr } = await q.range(
    skip,
    skip + pageSize - 1,
  );
  if (configsErr) throw configsErr;
  const total = count ?? 0;
  const configurations = (configsData ?? []) as unknown as ConfigRow[];

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canWrite = can(session, "elevator.write");

  return (
    <>
      <PageHeader
        title="Elevator Configurations"
        description="Configure pneumatic vacuum elevators and save reusable templates."
        actions={
          canWrite ? (
            <Link href="/elevators/new">
              <Button>+ New Configuration</Button>
            </Link>
          ) : undefined
        }
      />

      <Card>
        <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Product Catalog
            </h3>
            <p className="text-xs text-slate-500">
              {models.length} configurable product
              {models.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {models.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-slate-100 p-4 transition-shadow hover:shadow-sm"
            >
              <div className="flex h-16 items-center justify-center rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 text-2xl font-semibold text-slate-400">
                {m.modelCode}
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">
                {m.name}
              </p>
              {m.description && (
                <p className="text-xs text-slate-500 line-clamp-2">
                  {m.description}
                </p>
              )}
              <div className="mt-3 text-xs">
                <span className="text-slate-500">
                  Up to {m.stops} stops · {m.capacity} pax
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <ConfigFilterBar
        modelOptions={models.map((m) => ({ code: m.modelCode, name: m.name }))}
      />

      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Name</TH>
              <TH>Model</TH>
              <TH>Kind</TH>
              <TH>Engine</TH>
              <TH>Config</TH>
              <TH>Color</TH>
              <TH className="text-right">Stops</TH>
              <TH className="text-right">Qty</TH>
              <TH>Created</TH>
            </tr>
          </THead>
          <TBody>
            {configurations.length === 0 && (
              <EmptyRow
                colSpan={9}
                message="No configurations match these filters."
              />
            )}
            {configurations.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium text-slate-900">
                  {canWrite ? (
                    <Link
                      href={`/elevators/${c.id}`}
                      className="hover:text-brand-600"
                    >
                      {c.name}
                    </Link>
                  ) : (
                    c.name
                  )}
                  {c.notes && (
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {c.notes}
                    </p>
                  )}
                </TD>
                <TD>
                  <Badge className="bg-slate-100 text-slate-700">
                    {c.model.modelCode}
                  </Badge>
                </TD>
                <TD className="text-xs text-slate-600">{c.elevatorKind}</TD>
                <TD className="text-xs text-slate-600">{c.engine}</TD>
                <TD className="text-xs font-mono text-slate-600">
                  {formatStopsConfigShort(c.stopsConfig)}
                </TD>
                <TD className="text-xs text-slate-600">{c.color}</TD>
                <TD className="text-right">{c.stops}</TD>
                <TD className="text-right">{c.quantity}</TD>
                <TD className="text-xs text-slate-500">
                  {formatDate(c.createdAt)}
                  <br />
                  <span className="text-slate-400">
                    by {c.createdBy.name}
                  </span>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
        />
      </Card>
    </>
  );
}
