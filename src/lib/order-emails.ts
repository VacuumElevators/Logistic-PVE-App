import { sb } from "./sb";
import { sendEmail } from "./email";
import type { Database } from "@/types/database";

type OrderStatus = Database["public"]["Enums"]["OrderStatus"];

interface OrderForEmail {
  id: string;
  orderNumber: string;
  type: string;
  destLocation: string;
  declineReason: string | null;
  containerNumber: string | null;
  airNumber: string | null;
}

const STATUS_TITLE: Record<OrderStatus, string> = {
  DRAFT: "is a draft",
  IN_PROCESS: "is in process",
  APPROVED: "has been approved",
  ACCEPTED: "has been accepted",
  DECLINED: "has been declined",
  DISPATCHED: "has been dispatched",
  DELIVERED: "has been delivered",
};

function renderHtml(opts: {
  order: OrderForEmail;
  status: OrderStatus;
  recipientName: string;
  actorName: string;
}) {
  const { order, status, recipientName, actorName } = opts;
  const ref = `Order ${order.orderNumber}`;
  const extra: string[] = [];
  if (status === "DISPATCHED") {
    const isAir = order.type === "AIRFREIGHT";
    const shipmentNumber = isAir ? order.airNumber : order.containerNumber;
    if (shipmentNumber) {
      const shipmentLabel = isAir ? "Air shipment" : "Container";
      extra.push(`<p>${shipmentLabel}: <strong>${shipmentNumber}</strong></p>`);
    }
  }
  if (status === "DECLINED" && order.declineReason) {
    extra.push(
      `<p><strong>Reason:</strong><br>${order.declineReason.replace(/</g, "&lt;")}</p>`,
    );
  }
  return `
    <div style="font-family:Inter,sans-serif;color:#111;max-width:560px;">
      <h2 style="margin-bottom:4px;">${ref} ${STATUS_TITLE[status]}</h2>
      <p style="color:#475569;margin-top:0;">Hi ${recipientName},</p>
      <p>
        ${actorName} just updated the status to
        <strong>${status}</strong>.
      </p>
      ${extra.join("")}
      <p style="margin-top:24px;">
        Open in PVE Portal: <code>/orders/${order.id}</code>
      </p>
      <p style="color:#94a3b8;font-size:12px;">— PVE Logistics</p>
    </div>
  `;
}

async function recipientsFor(
  order: { id: string; createdById: string; destLocation: string },
  status: OrderStatus,
) {
  const client = sb();
  const { data: creator, error: creatorErr } = await client
    .from("User")
    .select("id, email, name")
    .eq("id", order.createdById)
    .maybeSingle();
  if (creatorErr) throw creatorErr;

  if (status === "IN_PROCESS") {
    // Notify the whole destination-location team (any ACTIVE user there) — under
    // the current workflow they are the ones who accept/progress the order.
    // Previously limited to MANAGER+, so all-STAFF destination teams (e.g. India)
    // were never told an order had arrived.
    const { data: recipients, error: recipientsErr } = await client
      .from("User")
      .select("id, email, name")
      .eq("locationId", order.destLocation as Database["public"]["Enums"]["Location"])
      .eq("status", "ACTIVE");
    if (recipientsErr) throw recipientsErr;
    return recipients ?? [];
  }

  return creator ? [creator] : [];
}

export async function sendOrderStatusEmail(opts: {
  orderId: string;
  status: OrderStatus;
  actorId: string;
}) {
  const client = sb();
  const { data: order, error: orderErr } = await client
    .from("Order")
    .select(
      "id, orderNumber, type, destLocation, declineReason, createdById, containerNumber, airNumber",
    )
    .eq("id", opts.orderId)
    .maybeSingle();
  if (orderErr) throw orderErr;
  if (!order) return;

  const { data: actor, error: actorErr } = await client
    .from("User")
    .select("name")
    .eq("id", opts.actorId)
    .maybeSingle();
  if (actorErr) throw actorErr;

  const typedOrder = order as unknown as OrderForEmail & { createdById: string };
  const recipients = await recipientsFor(typedOrder, opts.status);
  const toEmail = recipients.filter((r) => r.id !== opts.actorId);
  if (toEmail.length === 0) return;

  await Promise.all(
    toEmail.map((r) =>
      sendEmail({
        to: r.email,
        subject: `Order ${typedOrder.orderNumber} ${STATUS_TITLE[opts.status]}`,
        html: renderHtml({
          order: typedOrder,
          status: opts.status,
          recipientName: r.name,
          actorName: actor?.name ?? "System",
        }),
      }),
    ),
  );

  const { error: notifErr } = await client.from("Notification").insert(
    toEmail.map((r) => ({
      userId: r.id,
      type: "ORDER_UPDATE" as const,
      title: `Order ${typedOrder.orderNumber} ${STATUS_TITLE[opts.status]}`,
      message:
        opts.status === "DECLINED" && typedOrder.declineReason
          ? typedOrder.declineReason
          : `${actor?.name ?? "System"} updated the status to ${opts.status}.`,
      link: `/orders/${typedOrder.id}`,
    })),
  );
  if (notifErr) throw notifErr;
}
