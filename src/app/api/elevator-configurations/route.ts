import { z } from "zod";
import { sb } from "@/lib/sb";
import {
  apiError,
  apiOk,
  parseJson,
  requireApiSession,
  requireCap,
} from "@/lib/api";
import {
  ELEVATOR_MODEL_CODES,
  STOP_OPTIONS,
  allowedPositions,
  type ElevatorModelCode,
} from "@/lib/constants";

const CONFIG_SELECT =
  "id, name, modelId, elevatorKind, engine, color, stops, stopsConfig, quantity, notes, isActive, createdAt, updatedAt, model:ElevatorModel(id, modelCode, name, stops), createdBy:User!ElevatorConfiguration_createdById_fkey(id, name)";

const ELEVATOR_KIND_VALUES = ["CYLINDER", "CUBE"] as const;
const ENGINE_VALUES = ["NONE", "SPLIT", "HEAD_UNIT"] as const;

const stopConfigItemSchema = z.object({
  stop: z.number().int().min(0),
  door: z.enum(["LEFT", "RIGHT"]),
  position: z.number().int(),
});

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "elevator.read");
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const modelCode = url.searchParams.get("modelCode") ?? undefined;
  const elevatorKind = url.searchParams.get("elevatorKind") ?? undefined;
  const engine = url.searchParams.get("engine") ?? undefined;
  const stops = url.searchParams.get("stops") ?? undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const pageSize = 20;
  const client = sb();

  // Resolve modelCode → modelId (if filtering by modelCode).
  let modelIds: string[] | null = null;
  if (modelCode) {
    const { data: models, error: modelsErr } = await client
      .from("ElevatorModel")
      .select("id")
      .eq("modelCode", modelCode);
    if (modelsErr) return apiError(modelsErr.message, 500);
    modelIds = (models ?? []).map((m) => m.id);
    if (modelIds.length === 0) {
      return apiOk({
        configurations: [],
        page,
        pageSize,
        total: 0,
        totalPages: 1,
      });
    }
  }

  let baseQ = client
    .from("ElevatorConfiguration")
    .select(CONFIG_SELECT, { count: "exact" })
    .eq("isActive", true);
  if (modelIds) baseQ = baseQ.in("modelId", modelIds);
  if (elevatorKind && (ELEVATOR_KIND_VALUES as readonly string[]).includes(elevatorKind)) {
    baseQ = baseQ.eq(
      "elevatorKind",
      elevatorKind as (typeof ELEVATOR_KIND_VALUES)[number],
    );
  }
  if (engine && (ENGINE_VALUES as readonly string[]).includes(engine)) {
    baseQ = baseQ.eq("engine", engine as (typeof ENGINE_VALUES)[number]);
  }
  if (stops && (STOP_OPTIONS as readonly number[]).includes(Number(stops))) {
    baseQ = baseQ.eq("stops", Number(stops));
  }
  if (search) {
    baseQ = baseQ.or(`name.ilike.%${search}%,color.ilike.%${search}%`);
  }

  const skip = (page - 1) * pageSize;
  const { data: configurations, count, error } = await baseQ
    .order("createdAt", { ascending: false })
    .range(skip, skip + pageSize - 1);
  if (error) return apiError(error.message, 500);
  const total = count ?? 0;

  return apiOk({
    configurations: configurations ?? [],
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

const createSchema = z.object({
  name: z.string().min(2).max(120),
  modelId: z.string().min(1),
  elevatorKind: z.enum(ELEVATOR_KIND_VALUES),
  engine: z.enum(ENGINE_VALUES),
  color: z.string().min(1).max(40),
  stops: z.number().int(),
  stopsConfig: z.array(stopConfigItemSchema),
  quantity: z.number().int().min(1).max(99).default(1),
  notes: z.string().max(500).optional(),
});

function validateStopsConfig(
  stopsConfig: z.infer<typeof stopConfigItemSchema>[],
  modelCode: string,
  stops: number,
): string | null {
  if (stopsConfig.length !== stops) {
    return `stopsConfig length (${stopsConfig.length}) must equal stops (${stops}).`;
  }
  const stopSet = new Set(stopsConfig.map((s) => s.stop));
  if (stopSet.size !== stops) {
    return "stopsConfig must contain each stop index exactly once.";
  }
  if (!(ELEVATOR_MODEL_CODES as readonly string[]).includes(modelCode)) {
    return `Model code ${modelCode} is not supported.`;
  }
  for (const row of stopsConfig) {
    if (row.stop < 0 || row.stop >= stops) {
      return `Stop index ${row.stop} out of range [0, ${stops}).`;
    }
    const allowed = allowedPositions(modelCode as ElevatorModelCode, row.stop);
    if (!allowed.includes(row.position)) {
      return `Position ${row.position}° is not allowed for stop P${row.stop} on ${modelCode}.`;
    }
  }
  return null;
}

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "elevator.write");
  if (forbidden) return forbidden;

  const parsed = await parseJson(request, createSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  if (!(STOP_OPTIONS as readonly number[]).includes(body.stops)) {
    return apiError("Stops must be 2, 3, 4 or 5", 400);
  }

  const client = sb();
  const { data: model, error: modelErr } = await client
    .from("ElevatorModel")
    .select("*")
    .eq("id", body.modelId)
    .maybeSingle();
  if (modelErr) return apiError(modelErr.message, 500);
  if (!model || !model.isActive) {
    return apiError("Selected model is not available", 400);
  }
  if (body.stops > model.stops) {
    return apiError(
      `${model.name} supports up to ${model.stops} stops`,
      400,
    );
  }

  const stopsErr = validateStopsConfig(
    body.stopsConfig,
    model.modelCode,
    body.stops,
  );
  if (stopsErr) return apiError(stopsErr, 400);

  const { data: created, error: createErr } = await client
    .from("ElevatorConfiguration")
    .insert({
      name: body.name.trim(),
      modelId: model.id,
      elevatorKind: body.elevatorKind,
      engine: body.engine,
      color: body.color,
      stops: body.stops,
      stopsConfig: body.stopsConfig as never,
      quantity: body.quantity,
      notes: body.notes,
      createdById: auth.session.sub,
    })
    .select(CONFIG_SELECT)
    .single();
  if (createErr) return apiError(createErr.message, 500);

  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: "CREATE",
    entity: "ElevatorConfiguration",
    entityId: (created as { id: string }).id,
  });
  if (auditErr) return apiError(auditErr.message, 500);

  return apiOk(created, { status: 201 });
}
