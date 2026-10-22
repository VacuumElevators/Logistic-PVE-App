import { Badge } from "./badge";
import {
  BACKORDER_STATUS_COLOR,
  CONTAINER_STATUS_COLOR,
  ORDER_STATUS_COLOR,
} from "@/lib/constants";
import { statusLabel } from "@/lib/utils";

type Kind = "order" | "container" | "backorder";

const MAPS: Record<Kind, Record<string, string>> = {
  order: ORDER_STATUS_COLOR,
  container: CONTAINER_STATUS_COLOR,
  backorder: BACKORDER_STATUS_COLOR,
};

export function StatusBadge({ kind, status }: { kind: Kind; status: string }) {
  const color = MAPS[kind][status] ?? "bg-slate-100 text-slate-700";
  return <Badge className={color}>{statusLabel(status)}</Badge>;
}
