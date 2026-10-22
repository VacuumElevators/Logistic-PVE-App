import { apiOk, requireApiSession } from "@/lib/api";
import {
  getDashboardStats,
  getMonthlyShipmentSeries,
  getRecentActivity,
  getRecentOrders,
} from "@/lib/dashboard";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const [stats, monthly, activity, recentOrders] = await Promise.all([
    getDashboardStats(),
    getMonthlyShipmentSeries(6),
    getRecentActivity(12),
    getRecentOrders(6),
  ]);

  return apiOk({ stats, monthly, activity, recentOrders });
}
