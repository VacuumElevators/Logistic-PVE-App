import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { listElevatorModels } from "@/lib/elevators";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ConfigurationBuilder } from "@/components/elevators/configuration-builder";

export const dynamic = "force-dynamic";

export default async function NewElevatorConfigurationPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session, "elevator.write")) {
    return (
      <>
        <PageHeader title="New Configuration" />
        <Card className="p-10 text-center text-sm text-slate-500">
          You don't have access to create configurations.
        </Card>
      </>
    );
  }

  const models = await listElevatorModels();

  return (
    <>
      <Link
        href="/elevators"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" /> Back to configurations
      </Link>
      <PageHeader
        title="New Configuration"
        description="Build a reusable elevator configuration. Pricing updates live as you change options."
      />
      <ConfigurationBuilder
        mode="create"
        models={models.map((m) => ({
          id: m.id,
          modelCode: m.modelCode,
          name: m.name,
          description: m.description,
          capacity: m.capacity,
          stops: m.stops,
        }))}
      />
    </>
  );
}
