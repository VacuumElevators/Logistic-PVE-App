import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { sb } from "@/lib/sb";
import { getSession } from "@/lib/auth";
import {
  can,
  canActOnOrderAsOrigin,
  canActOnOrderAsReceiver,
} from "@/lib/permissions";
import { availableActions } from "@/lib/order-workflow";
import { summarizeOrderCapacity } from "@/lib/container-capacity";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { WorkflowActions } from "@/components/orders/workflow-actions";
import { OrderActivityFeed } from "@/components/orders/order-activity-feed";
import { OrderFillCard } from "@/components/orders/order-fill-card";
import { ContainerVisual } from "@/components/capacity/container-visual";
import { DeleteOrderButton } from "@/components/orders/delete-order-button";
import { RequestModificationButton } from "@/components/orders/request-modification-button";
import { formatDate, formatDateTime, locationLabel } from "@/lib/utils";
import type { Database } from "@/types/database";

type Location = Database["public"]["Enums"]["Location"];

export const dynamic = "force-dynamic";

/**
 * Per-elevator free-text comments live in the item's configJson blob (see the
 * Add/Edit Elevator dialog). The blob is unvalidated on the server, so read it
 * defensively.
 */
function itemComments(configJson: unknown): string | null {
  if (!configJson || typeof configJson !== "object") return null;
  const raw = (configJson as Record<string, unknown>).comments;
  return typeof raw === "string" && raw.trim() ? raw : null;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  declineReason: string | null;
  notes: string | null;
  estimatedShipDate: string | null;
  estimatedArrivalDate: string | null;
  fillPercent: number | null;
  archivedAt: string | null;
  originLocation: string;
  destLocation: string;
  customer: {
    name: string;
    contactName: string | null;
    email: string | null;
    city: string | null;
    country: string;
  } | null;
  createdBy: { id: string; name: string; email: string };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    configJson: unknown;
    elevatorModel: { modelCode: string } | null;
    part: { sku: string } | null;
  }>;
  containerNumber: string | null;
  airNumber: string | null;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session, "orders.read")) {
    return (
      <Card className="p-10 text-center text-sm text-slate-500">
        You don't have access.
      </Card>
    );
  }

  const { id } = await params;
  const client = sb();
  const { data, error } = await client
    .from("Order")
    .select(
      "*, customer:Customer(*), createdBy:User!Order_createdById_fkey(id, name, email), items:OrderItem(*, elevatorModel:ElevatorModel(*), part:Part(*))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  const order = data as unknown as OrderDetail;

  if (
    session.role !== "SUPER_ADMIN" &&
    order.originLocation !== session.location &&
    order.destLocation !== session.location
  ) {
    return (
      <Card className="p-10 text-center text-sm text-slate-500">
        Order not found.
      </Card>
    );
  }

  const { data: activityData, error: activityErr } = await client
    .from("AuditLog")
    .select("*, user:User(id, name)")
    .eq("entity", "Order")
    .eq("entityId", order.id)
    .order("createdAt", { ascending: false });
  if (activityErr) throw activityErr;
  const activity = activityData ?? [];

  const isOrigin = canActOnOrderAsOrigin(session, {
    originLocation: order.originLocation as Location,
  });
  const isReceiver = canActOnOrderAsReceiver(session, {
    destLocation: order.destLocation as Location,
  });
  const actions = availableActions(
    order.status as Parameters<typeof availableActions>[0],
    session,
    isReceiver,
  );
  // Container loading estimate from this order's line items (drives the loading
  // visual below). Airfreight orders have no container, so skip it entirely.
  const capacity =
    order.type === "AIRFREIGHT" ? null : await summarizeOrderCapacity(order.id);

  const canRequestModification =
    isOrigin && (order.status === "APPROVED" || order.status === "ACCEPTED");
  const isPostModificationDraft =
    isOrigin && order.status === "DRAFT" && order.submittedAt !== null;
  // Whoever is working the order (origin or receiver, non-viewer) can set fill %.
  const canEditFill = (isOrigin || isReceiver) && can(session, "orders.write");
  const canDelete = can(session, "orders.delete");

  // Modification banner is visible while the most-recent REQUEST_MODIFICATION
  // is still in flight (i.e. there is no ACCEPT row newer than it). After the
  // receiver re-accepts, the latest ACCEPT supersedes the modification and the
  // banner hides.
  const latestModification = activity.find(
    (a) => a.action === "REQUEST_MODIFICATION",
  );
  const latestAccept = activity.find((a) => a.action === "ACCEPT");
  const modPending = latestModification
    ? !latestAccept ||
      new Date(latestModification.createdAt) > new Date(latestAccept.createdAt)
    : false;

  return (
    <>
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" /> Back to orders
      </Link>

      <PageHeader
        title={order.orderNumber}
        description={`Created by ${order.createdBy.name} · ${formatDate(order.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            {order.archivedAt && (
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                Archived
              </span>
            )}
            <StatusBadge kind="order" status={order.status} />
          </div>
        }
      />

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Workflow
          </h3>
          {canRequestModification && (
            <RequestModificationButton orderId={order.id} />
          )}
          {isPostModificationDraft && (
            <Link
              href={`/orders/${order.id}/edit`}
              className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit items & notes
            </Link>
          )}
          {canDelete && (
            <DeleteOrderButton
              orderId={order.id}
              isDraft={order.status === "DRAFT" && order.submittedAt === null}
            />
          )}
        </div>
        <WorkflowActions
          orderId={order.id}
          actions={actions}
          status={order.status}
        />
        {order.status === "DECLINED" && order.declineReason && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50/60 px-3 py-2 text-sm text-rose-800">
            <p className="font-medium">Decline reason</p>
            <p className="text-rose-700">{order.declineReason}</p>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <Table>
            <THead>
              <tr>
                <TH>Item</TH>
                <TH>Description</TH>
                <TH className="text-right">Qty</TH>
              </tr>
            </THead>
            <TBody>
              {order.items.map((item) => {
                const comments = itemComments(item.configJson);
                return (
                  <TR key={item.id}>
                    <TD className="font-mono text-xs font-medium text-slate-900">
                      {item.elevatorModel?.modelCode ?? item.part?.sku ?? "—"}
                    </TD>
                    <TD className="text-slate-600">
                      {item.description}
                      {comments && (
                        <span className="mt-0.5 block whitespace-pre-line text-xs text-slate-400">
                          {comments}
                        </span>
                      )}
                    </TD>
                    <TD className="text-right">{item.quantity}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>

        {capacity && (
          <Card className="p-5 space-y-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Container loading (estimate)
              </h3>
              <p className="text-xs text-slate-500">
                Top-down floor plan · 20 pallet slots · doors on the right.
                Auto-estimated from line items; the manual fill % is the source
                of truth until packing configs are finalized.
              </p>
            </div>
            <ContainerVisual
              breakdown={capacity}
              containerNumber={order.containerNumber ?? "—"}
              sizeLabel="Container"
              status={order.status}
            />
          </Card>
        )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <div className="px-6 pb-6 space-y-1 text-sm text-slate-700">
              <p className="font-medium text-slate-900">
                {order.customer?.name ?? "—"}
              </p>
              <p>{order.customer?.contactName ?? "—"}</p>
              <p>{order.customer?.email ?? "—"}</p>
              <p className="text-xs text-slate-500">
                {order.customer?.city ?? ""}, {order.customer?.country ?? ""}
              </p>
            </div>
          </Card>

          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <div className="px-6 pb-6 text-sm text-slate-700 whitespace-pre-wrap">
                {order.notes}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Workflow timestamps</CardTitle>
            </CardHeader>
            <div className="px-6 pb-6 space-y-2 text-sm">
              <Row label="Origin" value={locationLabel(order.originLocation)} />
              <Row
                label="Destination"
                value={locationLabel(order.destLocation)}
              />
              <Row label="Submitted" value={formatDate(order.submittedAt)} />
              <Row label="Approved" value={formatDate(order.approvedAt)} />
              <Row label="Accepted" value={formatDate(order.acceptedAt)} />
              <Row label="Declined" value={formatDate(order.declinedAt)} />
              <Row label="Est. ship" value={formatDate(order.estimatedShipDate)} />
              <Row label="Est. arrival" value={formatDate(order.estimatedArrivalDate)} />
              <Row label="Dispatched" value={formatDate(order.dispatchedAt)} />
              <Row label="Delivered" value={formatDate(order.deliveredAt)} />
              <Row
                label={order.type === "AIRFREIGHT" ? "Air #" : "Container #"}
                value={
                  order.type === "AIRFREIGHT"
                    ? (order.airNumber ?? "—")
                    : (order.containerNumber ?? "—")
                }
                mono
              />
            </div>
          </Card>

          {order.type !== "AIRFREIGHT" && (
            <OrderFillCard
              orderId={order.id}
              fillPercent={order.fillPercent}
              canEdit={canEditFill}
            />
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        {modPending && latestModification && (
          <div className="mx-6 mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-xs text-amber-800">
              <span className="font-semibold">
                {latestModification.user?.name ?? "Someone"}
              </span>{" "}
              reopened this order for modification on{" "}
              <span className="font-medium">
                {formatDateTime(latestModification.createdAt)}
              </span>
              . Receiver re-approval pending.
            </p>
          </div>
        )}
        <OrderActivityFeed entries={activity} />
      </Card>
    </>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between border-b border-slate-100 last:border-0 py-1.5">
      <span className="text-slate-500">{label}</span>
      <span
        className={`font-medium text-slate-900 ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
