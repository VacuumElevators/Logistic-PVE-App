import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { sb } from "@/lib/sb";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { NewOrderForm } from "./new-order-form";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session, "orders.write")) {
    return (
      <>
        <PageHeader title="New Order" />
        <Card className="p-10 text-center text-sm text-slate-500">
          You don't have access to create orders.
        </Card>
      </>
    );
  }

  const client = sb();
  const [customersRes, modelsRes, partsRes] = await Promise.all([
    client.from("Customer").select("*").order("name", { ascending: true }),
    client
      .from("ElevatorModel")
      .select("*")
      .eq("isActive", true)
      .order("modelCode", { ascending: true }),
    client
      .from("Part")
      .select("*")
      .order("sku", { ascending: true })
      .limit(2000),
  ]);
  if (customersRes.error) throw customersRes.error;
  if (modelsRes.error) throw modelsRes.error;
  if (partsRes.error) throw partsRes.error;

  const customers = customersRes.data ?? [];
  const elevatorModels = modelsRes.data ?? [];
  const parts = partsRes.data ?? [];

  return (
    <>
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" /> Back to orders
      </Link>
      <PageHeader
        title="New Order"
        description="Build line items, then save as draft or submit for approval."
      />
      <NewOrderForm
        customers={customers.map((c) => ({
          id: c.id,
          name: c.name,
          location: c.location,
        }))}
        elevatorModels={elevatorModels.map((m) => ({
          id: m.id,
          modelCode: m.modelCode,
          name: m.name,
          stops: m.stops,
        }))}
        parts={parts.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
        }))}
        defaultOrigin={session.location}
      />
    </>
  );
}
