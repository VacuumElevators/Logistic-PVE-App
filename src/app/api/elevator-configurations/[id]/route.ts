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
  "*, model:ElevatorModel(*), createdBy:User!ElevatorConfiguration_createdById_fkey(id, name)";

const stopConfigItemSchema = z.object({
  stop: z.number().int().min(0),
  door: z.enum(["LEFT", "RIGHT"]),
  position: z.number().int(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "elevator.read");
  if (forbidden) return forbidden;
  const { id } = await params;
  const { data: config, error } = await sb()
    .from("ElevatorConfiguration")
    .select(CONFIG_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) return apiError(error.message, 500);
  if (!config) return apiError("Not found", 404);
  return apiOk(config);
}

const updateSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    modelId: z.string().min(1).optional(),
    elevatorKind: z.enum(["CYLINDER", "CUBE"]).optional(),
    engine: z.enum(["NONE", "SPLIT", "HEAD_UNIT"]).optional(),
    color: z.string().min(1).max(40).optional(),
    stops: z.number().int().optional(),
    stopsConfig: z.array(stopConfigItemSchema).optional(),
    quantity: z.number().int().min(1).max(99).optional(),
    notes: z.string().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "No fields to update",
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "elevator.write");
  if (forbidden) return forbidden;
  const { id } = await params;
  const client = sb();

  const { data: target, error: targetErr } = await client
    .from("ElevatorConfiguration")
    .select("*, model:ElevatorModel(*)")
    .eq("id", id)
    .maybeSingle();
  if (targetErr) return apiError(targetErr.message, 500);
  if (!target) return apiError("Not found", 404);

  const parsed = await parseJson(request, updateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  type ModelLite = {
    id: string;
    isActive: boolean;
    name: string;
    stops: number;
    modelCode: string;
  };
  // Resolve the model that will be in effect after the patch.
  let model: ModelLite = (target as unknown as { model: ModelLite }).model;
  if (body.modelId && body.modelId !== target.modelId) {
    const { data: next, error: nextErr } = await client
      .from("ElevatorModel")
      .select("*")
      .eq("id", body.modelId)
      .maybeSingle();
    if (nextErr) return apiError(nextErr.message, 500);
    if (!next || !next.isActive) {
      return apiError("Selected model is not available", 400);
    }
    model = next as ModelLite;
  }

  const nextStops = body.stops ?? target.stops;
  if (!(STOP_OPTIONS as readonly number[]).includes(nextStops)) {
    return apiError("Stops must be 2, 3, 4 or 5", 400);
  }
  if (nextStops > model.stops) {
    return apiError(`${model.name} supports up to ${model.stops} stops`, 400);
  }

  // Re-validate stopsConfig if model, stops, or stopsConfig itself changed.
  if (body.stopsConfig !== undefined) {
    const err = validateStopsConfig(body.stopsConfig, model.modelCode, nextStops);
    if (err) return apiError(err, 400);
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.modelId !== undefined) data.modelId = body.modelId;
  if (body.elevatorKind !== undefined) data.elevatorKind = body.elevatorKind;
  if (body.engine !== undefined) data.engine = body.engine;
  if (body.color !== undefined) data.color = body.color;
  if (body.stops !== undefined) data.stops = body.stops;
  if (body.stopsConfig !== undefined) data.stopsConfig = body.stopsConfig;
  if (body.quantity !== undefined) data.quantity = body.quantity;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const { data: updated, error: updateErr } = await client
    .from("ElevatorConfiguration")
    .update(data as never)
    .eq("id", id)
    .select(CONFIG_SELECT)
    .single();
  if (updateErr) return apiError(updateErr.message, 500);

  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: "UPDATE",
    entity: "ElevatorConfiguration",
    entityId: id,
    metadata: { changes: Object.keys(body) },
  });
  if (auditErr) return apiError(auditErr.message, 500);

  return apiOk(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "elevator.write");
  if (forbidden) return forbidden;
  const { id } = await params;
  const client = sb();

  const { data: target, error: targetErr } = await client
    .from("ElevatorConfiguration")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (targetErr) return apiError(targetErr.message, 500);
  if (!target) return apiError("Not found", 404);

  const { error: delErr } = await client
    .from("ElevatorConfiguration")
    .delete()
    .eq("id", id);
  if (delErr) return apiError(delErr.message, 500);

  const { error: auditErr } = await client.from("AuditLog").insert({
    userId: auth.session.sub,
    action: "DELETE",
    entity: "ElevatorConfiguration",
    entityId: id,
  });
  if (auditErr) return apiError(auditErr.message, 500);
  return apiOk({ ok: true });
}
