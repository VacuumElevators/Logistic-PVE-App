import { apiOk, requireApiSession, requireCap } from "@/lib/api";
import { listElevatorModels } from "@/lib/elevators";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const forbidden = requireCap(auth.session, "elevator.read");
  if (forbidden) return forbidden;
  return apiOk(await listElevatorModels());
}
