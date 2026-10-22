import { getCurrentUser } from "@/lib/auth";
import { apiError, apiOk } from "@/lib/api";
import { roleLabel } from "@/lib/permissions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthorized", 401);
  return apiOk({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roleLabel: roleLabel(user.role),
    locationId: user.locationId,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
  });
}
