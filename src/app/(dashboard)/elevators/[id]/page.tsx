import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { sb } from "@/lib/sb";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { listElevatorModels } from "@/lib/elevators";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfigurationBuilder } from "@/components/elevators/configuration-builder";
import type {
  ElevatorKindKey,
  EngineKey,
  StopConfig,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

interface ConfigDetail {
  id: string;
  name: string;
  modelId: string;
  elevatorKind: ElevatorKindKey;
  engine: EngineKey;
  color: string;
  stops: number;
  stopsConfig: StopConfig[] | null;
  quantity: number;
  notes: string | null;
  model: { id: string; modelCode: string; name: string };
  createdBy: { id: string; name: string };
}

export default async function ElevatorConfigurationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session, "elevator.read")) {
    return (
      <Card className="p-10 text-center text-sm text-slate-500">
        You don't have access.
      </Card>
    );
  }

  const { id } = await params;
  const [configRes, models] = await Promise.all([
    sb()
      .from("ElevatorConfiguration")
      .select(
        "*, model:ElevatorModel(*), createdBy:User!ElevatorConfiguration_createdById_fkey(id, name)",
      )
      .eq("id", id)
      .maybeSingle(),
    listElevatorModels(),
  ]);
  if (configRes.error) throw configRes.error;
  if (!configRes.data) notFound();
  const config = configRes.data as unknown as ConfigDetail;

  const canWrite = can(session, "elevator.write");

  return (
    <>
      <Link
        href="/elevators"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" /> Back to configurations
      </Link>

      <PageHeader
        title={config.name}
        description={`${config.model.name} · ${config.elevatorKind} · ${config.stops} stops`}
        actions={
          <Badge className="bg-slate-100 text-slate-700">
            {config.model.modelCode}
          </Badge>
        }
      />

      {!canWrite && (
        <Card className="p-4 text-sm text-slate-500">
          You can view this configuration but cannot make changes.
        </Card>
      )}

      <ConfigurationBuilder
        mode="edit"
        configId={config.id}
        canDelete={canWrite}
        models={models.map((m) => ({
          id: m.id,
          modelCode: m.modelCode,
          name: m.name,
          description: m.description,
          capacity: m.capacity,
          stops: m.stops,
        }))}
        initial={{
          id: config.id,
          name: config.name,
          modelId: config.modelId,
          elevatorKind: config.elevatorKind,
          engine: config.engine,
          color: config.color,
          stops: config.stops,
          stopsConfig: config.stopsConfig,
          quantity: config.quantity,
          notes: config.notes,
        }}
      />
    </>
  );
}
