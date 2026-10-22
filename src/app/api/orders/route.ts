import { z } from "zod";
import { sb } from "@/lib/sb";
import {
  apiError,
  apiOk,
  parseJson,
  requireApiSession,
  requireCap,
} from "@/lib/api";
import { generateRef } from "@/lib/utils";
import { assignContainerNumber, assignAirNumber } from "@/lib/calendar-planning";
import { LOCATIONS } from "@/lib/constants";

const itemSchema = z
  .object({
    kind: z.enum(["ELEVATOR", "PART", "GENERAL"]),
    refId: z.string().min(1).optional(),
    description: z.string().min(1),
    quantity: z.number().int().positive(),
    configJson: z
      .unknown()
      .nullable()
      .optional()
      .refine(
        (v) => v == null || JSON.stringify(v).length < 5000,
        { message: "configJson too large (>5KB)" },
      ),
  })
  .refine((v) => v.kind === "GENERAL" || !!v.refId, {
    message: "refId required for ELEVATOR / PART items",
    path: ["refId"],
  });

const baseSchema = z.object({
  type: z.enum(["CONTAINER", "AIRFREIGHT"]).default("CONTAINER"),
  originLocation: z.enum(LOCATIONS),
  destLocation: z.enum(LOCATIONS),
  customerId: z.string().min(1, "Customer is required"),
  notes: z.string().max(1000).optional(),
  items: z.array(itemSchema).min(1),
  saveAsDraft: z.boolean().optional(),
  fillPercent: z.number().int().min(0).max(100).nullable().optional(),
});

const ORDER_SELECT =
  "*, customer:Customer(*), items:OrderItem(*)";

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "orders.read");
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const location = url.searchParams.get("location") ?? undefined;
  const search = (url.searchParams.get("search") ?? "").trim();
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const pageSize = 20;
  const client = sb();

  let q = client
    .from("Order")
    .select(ORDER_SELECT, { count: "exact" })
    .is("archivedAt", null)
    .order("createdAt", { ascending: false });

  if (
    status &&
    ["DRAFT", "IN_PROCESS", "APPROVED", "ACCEPTED", "DECLINED", "DISPATCHED", "DELIVERED"].includes(status)
  ) {
    q = q.eq(
      "status",
      status as
        | "DRAFT"
        | "IN_PROCESS"
        | "APPROVED"
        | "ACCEPTED"
        | "DECLINED"
        | "DISPATCHED"
        | "DELIVERED",
    );
  }

  // Location and search are independent constraints: each is its own group so
  // PostgREST ANDs them together. Folding both into one .or() made the location
  // disjunct (which matches every order at that location) swallow the search.
  if (location && (LOCATIONS as readonly string[]).includes(location)) {
    q = q.or(`originLocation.eq.${location},destLocation.eq.${location}`);
  }
  if (search) {
    q = q.ilike("orderNumber", `%${search}%`);
  }

  if (auth.session.role !== "SUPER_ADMIN") {
    q = q.or(
      `originLocation.eq.${auth.session.location},destLocation.eq.${auth.session.location}`,
    );
  }

  const skip = (page - 1) * pageSize;
  const { data: orders, count, error } = await q.range(skip, skip + pageSize - 1);
  if (error) return apiError(error.message, 500);
  const total = count ?? 0;

  return apiOk({
    orders: orders ?? [],
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "orders.write");
  if (forbidden) return forbidden;

  const parsed = await parseJson(request, baseSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;
  const client = sb();

  const status = body.saveAsDraft ? "DRAFT" : "IN_PROCESS";

  const { data: created, error: createErr } = await client
    .from("Order")
    .insert({
      orderNumber: generateRef("ORD"),
      type: body.type,
      status,
      customerId: body.customerId,
      originLocation: body.originLocation,
      destLocation: body.destLocation,
      notes: body.notes,
      createdById: auth.session.sub,
      submittedAt: status === "IN_PROCESS" ? new Date().toISOString() : null,
      fillPercent: body.fillPercent ?? null,
    })
    .select()
    .single();
  if (createErr) return apiError(createErr.message, 500);

  const orderId = created.id;

  const { error: itemsErr } = await client.from("OrderItem").insert(
    body.items.map((i) => ({
      orderId,
      elevatorModelId: i.kind === "ELEVATOR" ? i.refId ?? null : null,
      partId: i.kind === "PART" ? i.refId ?? null : null,
      description: i.description,
      quantity: i.quantity,
      configJson: (i.configJson ?? null) as never,
    })),
  );
  if (itemsErr) {
    await client.from("Order").delete().eq("id", orderId);
    return apiError(itemsErr.message, 500);
  }

  // A non-draft order claims its per-route number now; drafts stay unnumbered
  // until submit. Container orders get a C-number, airfreight orders an A-number
  // — dedicated sequences, so they never collide on a route.
  if (status === "IN_PROCESS") {
    try {
      if (body.type === "AIRFREIGHT") {
        await assignAirNumber(client, {
          id: orderId,
          originLocation: body.originLocation,
          destLocation: body.destLocation,
          airNumber: null,
        });
      } else {
        await assignContainerNumber(client, {
          id: orderId,
          originLocation: body.originLocation,
          destLocation: body.destLocation,
          containerNumber: null,
        });
      }
    } catch (e) {
      return apiError(
        e instanceof Error ? e.message : "Could not assign a shipment number.",
        500,
      );
    }
  }

  const { data: order, error: readErr } = await client
    .from("Order")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .single();
  if (readErr) return apiError(readErr.message, 500);

  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: "CREATE",
    entity: "Order",
    entityId: orderId,
    metadata: { status },
  });
  if (auditErr) return apiError(auditErr.message, 500);

  if (status === "IN_PROCESS") {
    const { sendOrderStatusEmail } = await import("@/lib/order-emails");
    await sendOrderStatusEmail({
      orderId,
      status: "IN_PROCESS",
      actorId: auth.session.sub,
    });
  }

  return apiOk(order, { status: 201 });
}
