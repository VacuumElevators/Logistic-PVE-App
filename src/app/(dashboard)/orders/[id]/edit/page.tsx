import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { sb } from "@/lib/sb";
import { getSession } from "@/lib/auth";
import { can, canActOnOrderAsOrigin } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import type { Database } from "@/types/database";
import { EditOrderForm, type ExistingItem } from "./edit-order-form";

export const dynamic = "force-dynamic";

type Location = Database["public"]["Enums"]["Location"];

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session, "orders.write")) {
    return (
      <Card className="p-10 text-center text-sm text-slate-500">
        You don't have access to edit orders.
      </Card>
    );
  }

  const { id } = await params;
  const client = sb();

  const { data: order, error } = await client
    .from("Order")
    .select(
      "id, orderNumber, type, status, submittedAt, originLocation, destLocation, notes, containerNumber, airNumber, customer:Customer(id, name), items:OrderItem(id, elevatorModelId, partId, description, quantity, configJson)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!order) notFound();

  // Only DRAFT is editable. Origin region only (never receiver).
  if (order.status !== "DRAFT") {
    redirect(`/orders/${id}`);
  }
  if (!canActOnOrderAsOrigin(session, { originLocation: order.originLocation as Location })) {
    redirect(`/orders/${id}`);
  }

  const isModification = order.submittedAt !== null;

  const [modelsRes, partsRes] = await Promise.all([
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
  if (modelsRes.error) throw modelsRes.error;
  if (partsRes.error) throw partsRes.error;

  const existingItems: ExistingItem[] = (order.items ?? []).map((it) => {
    const kind: "ELEVATOR" | "PART" | "GENERAL" = it.elevatorModelId
      ? "ELEVATOR"
      : it.partId
        ? "PART"
        : "GENERAL";
    return {
      kind,
      refId: it.elevatorModelId ?? it.partId ?? "",
      description: it.description,
      quantity: it.quantity,
      configJson: it.configJson,
    };
  });

  const customer = (order as unknown as { customer: { id: string; name: string } | null }).customer;
  const containerNumber = (order as unknown as { containerNumber: string | null }).containerNumber;
  const orderType = (order as unknown as { type: string }).type;
  const airNumber = (order as unknown as { airNumber: string | null }).airNumber;

  return (
    <>
      <Link
        href={`/orders/${id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" /> Back to order
      </Link>
      <PageHeader
        title={`Edit ${order.orderNumber}`}
        description={
          isModification
            ? "Editing a modification — items and notes only. Route, customer, and container are locked."
            : "Editing draft order."
        }
      />
      <EditOrderForm
        orderId={order.id}
        isModification={isModification}
        header={{
          orderNumber: order.orderNumber,
          origin: order.originLocation,
          dest: order.destLocation,
          customerName: customer?.name ?? null,
          type: orderType,
          containerNumber: containerNumber ?? null,
          airNumber: airNumber ?? null,
        }}
        initialNotes={order.notes ?? ""}
        initialItems={existingItems}
        elevatorModels={(modelsRes.data ?? []).map((m) => ({
          id: m.id,
          modelCode: m.modelCode,
          name: m.name,
          stops: m.stops,
        }))}
        parts={(partsRes.data ?? []).map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
        }))}
      />
    </>
  );
}
