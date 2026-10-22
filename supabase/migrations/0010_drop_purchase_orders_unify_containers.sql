-- rls-exempt: drops PurchaseOrder/POItem/Container tables, restructures ContainerSlot/Order columns. No new tables; RLS posture inherited from 0007 + 0008 (verified rowsecurity=true on all surviving tables).
-- Phase 1: drop PurchaseOrder, unify Slot+Container, switch to per-route C-numbering.
-- ContainerSlot.id is TEXT (per 0001_init), so Order.slotId is TEXT.

DROP TABLE IF EXISTS "POItem" CASCADE;
DROP TABLE IF EXISTS "PurchaseOrder" CASCADE;
DROP TYPE IF EXISTS "PurchaseOrderStatus";

CREATE TYPE "OrderType_new" AS ENUM ('CONTAINER');
UPDATE "Order" SET "type" = 'CONTAINER' WHERE "type"::text = 'PURCHASE';
ALTER TABLE "Order" ALTER COLUMN "type" TYPE "OrderType_new" USING ("type"::text::"OrderType_new");
DROP TYPE "OrderType";
ALTER TYPE "OrderType_new" RENAME TO "OrderType";

ALTER TABLE "ContainerSlot"
  ADD COLUMN "containerNumber" TEXT,
  ADD COLUMN "routeCounter" INTEGER,
  ADD COLUMN "vessel" TEXT,
  ADD COLUMN "bookingRef" TEXT,
  ADD COLUMN "etd" TIMESTAMP(3),
  ADD COLUMN "eta" TIMESTAMP(3),
  ADD COLUMN "departedAt" TIMESTAMP(3),
  ADD COLUMN "arrivedAt" TIMESTAMP(3),
  ADD COLUMN "fillPercent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "size" "ContainerSize";

UPDATE "ContainerSlot" cs
SET
  "containerNumber" = c."containerNumber",
  "vessel" = c."vessel",
  "bookingRef" = c."bookingRef",
  "etd" = c."etd",
  "eta" = c."eta",
  "departedAt" = c."departedAt",
  "arrivedAt" = c."arrivedAt",
  "fillPercent" = c."fillPercent",
  "size" = c."size"
FROM "Container" c
WHERE cs."containerId" = c.id;

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_containerId_fkey";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "containerId";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "containerNumber";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "poNumber";

ALTER TABLE "Order" ADD COLUMN "slotId" TEXT REFERENCES "ContainerSlot"(id) ON DELETE SET NULL;
CREATE INDEX "Order_slotId_idx" ON "Order"("slotId");

ALTER TABLE "ContainerSlot" DROP CONSTRAINT IF EXISTS "ContainerSlot_orderId_fkey";
ALTER TABLE "ContainerSlot" DROP COLUMN IF EXISTS "orderId";

ALTER TABLE "ContainerSlot" DROP CONSTRAINT IF EXISTS "ContainerSlot_containerId_fkey";
ALTER TABLE "ContainerSlot" DROP COLUMN IF EXISTS "containerId";

DROP INDEX IF EXISTS "ContainerSlot_destLocation_year_month_monthCounter_key";
DROP INDEX IF EXISTS "ContainerSlot_year_month_idx";
ALTER TABLE "ContainerSlot" DROP COLUMN IF EXISTS "slotNumber";
ALTER TABLE "ContainerSlot" DROP COLUMN IF EXISTS "monthCounter";
ALTER TABLE "ContainerSlot" DROP COLUMN IF EXISTS "year";
ALTER TABLE "ContainerSlot" DROP COLUMN IF EXISTS "month";

UPDATE "ContainerSlot" SET "routeCounter" = 1 WHERE "routeCounter" IS NULL;
ALTER TABLE "ContainerSlot" ALTER COLUMN "routeCounter" SET NOT NULL;
ALTER TABLE "ContainerSlot" ADD CONSTRAINT "ContainerSlot_route_counter_key" UNIQUE ("originLocation","destLocation","routeCounter");

DROP TABLE IF EXISTS "Container" CASCADE;
DROP TYPE IF EXISTS "ContainerStatus";

CREATE INDEX IF NOT EXISTS "ContainerSlot_containerNumber_idx" ON "ContainerSlot"("containerNumber");
