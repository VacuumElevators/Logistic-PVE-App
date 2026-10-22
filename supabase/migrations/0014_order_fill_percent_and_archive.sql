-- Manual container "fill percentage" (0-100) on an order, set by whoever is
-- fulfilling it to show real-time progress and flag partially-complete orders
-- (per the 2026-07-09 PVE call). Distinct from the auto-computed
-- ContainerSlot.fillPercent.
alter table "Order" add column "fillPercent" integer;

alter table "Order"
  add constraint "Order_fillPercent_range"
  check ("fillPercent" is null or ("fillPercent" between 0 and 100));

-- Soft-delete marker for admin order deletion. Submitted/real orders are
-- archived (row + AuditLog preserved, hidden from lists) rather than hard-
-- deleted, so the audit trail survives. Never-submitted DRAFTs are still hard-
-- deleted by the delete route.
alter table "Order" add column "archivedAt" timestamp without time zone;
