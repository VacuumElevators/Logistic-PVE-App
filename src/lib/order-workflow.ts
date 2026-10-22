import type { Database } from "@/types/database";

type OrderStatus = Database["public"]["Enums"]["OrderStatus"];
import { can } from "./permissions";
import type { AccessPayload } from "./auth";

/**
 * Order workflow (3-state approval, per the 2026-05-14 client decision):
 *   DRAFT → IN_PROCESS → APPROVED → ACCEPTED → DISPATCHED → DELIVERED
 *                     ↘         ↘
 *                      DECLINED   DECLINED   (terminal from either IN_PROCESS or APPROVED)
 *
 * - IN_PROCESS: receiver is verifying quantities, may negotiate.
 * - APPROVED:   receiver commits to fulfilling.
 * - ACCEPTED:   receiver supplies estimated ship + arrival dates; order is locked.
 *
 * No backwards transitions. Drafts can be deleted; everything else is
 * append-only (audit-friendly).
 */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["IN_PROCESS"],
  IN_PROCESS: ["APPROVED", "DECLINED"],
  APPROVED: ["ACCEPTED", "DECLINED"],
  ACCEPTED: ["DISPATCHED"],
  DISPATCHED: ["DELIVERED"],
  DELIVERED: [],
  DECLINED: [],
};

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminal(status: OrderStatus): boolean {
  return TRANSITIONS[status]?.length === 0;
}

export interface OrderAction {
  action: "submit" | "approve" | "accept" | "decline" | "dispatch" | "deliver";
  label: string;
  variant: "primary" | "danger" | "secondary";
  requiresReason?: boolean;
  /** "accept" requires estimated ship + arrival dates from the receiving region. */
  requiresShipArrivalDates?: boolean;
}

// Receiving-side actions (approve/accept/decline/dispatch/deliver) are gated on
// `canReceive` — the viewer is at the order's destination location AND is a
// non-viewer operator. This replaces the previous manager-only capability gate
// so location teams (STAFF) can run the workflow for orders sent to them.
const ACTIONS: Record<
  OrderStatus,
  ((canReceive: boolean) => OrderAction[]) | OrderAction[]
> = {
  DRAFT: [
    {
      action: "submit",
      label: "Submit for approval",
      variant: "primary",
    },
  ],
  IN_PROCESS: (canReceive) =>
    canReceive
      ? [
          { action: "approve", label: "Approve", variant: "primary" },
          {
            action: "decline",
            label: "Decline",
            variant: "danger",
            requiresReason: true,
          },
        ]
      : [],
  APPROVED: (canReceive) =>
    canReceive
      ? [
          {
            action: "accept",
            label: "Accept & set dates",
            variant: "primary",
            requiresShipArrivalDates: true,
          },
          {
            action: "decline",
            label: "Decline",
            variant: "danger",
            requiresReason: true,
          },
        ]
      : [],
  ACCEPTED: (canReceive) =>
    canReceive
      ? [
          {
            action: "dispatch",
            label: "Dispatch",
            variant: "primary",
          },
        ]
      : [],
  DISPATCHED: (canReceive) =>
    canReceive
      ? [{ action: "deliver", label: "Mark Delivered", variant: "secondary" }]
      : [],
  DELIVERED: [],
  DECLINED: [],
};

/**
 * Actions the viewer may take on an order in `status`.
 * @param isReceiver whether the viewer is at the order's destination location
 *   (or SUPER_ADMIN) — see canActOnOrderAsReceiver. Receiving-side actions
 *   require this plus orders.write; DRAFT submit only requires orders.write
 *   (the origin submits).
 */
export function availableActions(
  status: OrderStatus,
  session: Pick<AccessPayload, "role">,
  isReceiver: boolean,
): OrderAction[] {
  const canWrite = can(session, "orders.write");
  const entry = ACTIONS[status];
  if (typeof entry === "function") return entry(isReceiver && canWrite);
  // Static entries: DRAFT holds the origin's Submit action (needs orders.write);
  // DELIVERED / DECLINED are empty terminal states.
  return canWrite ? entry : [];
}

/**
 * Map an action verb to the target status it transitions to.
 */
export function statusForAction(
  action: OrderAction["action"],
): OrderStatus | null {
  switch (action) {
    case "submit":
      return "IN_PROCESS";
    case "approve":
      return "APPROVED";
    case "accept":
      return "ACCEPTED";
    case "decline":
      return "DECLINED";
    case "dispatch":
      return "DISPATCHED";
    case "deliver":
      return "DELIVERED";
    default:
      return null;
  }
}
