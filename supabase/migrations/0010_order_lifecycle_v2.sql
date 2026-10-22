-- rls-exempt: schema-only changes on existing "Order" table (RLS already on since 0007/0008); enum swap + new columns inherit the existing policy posture.
-- Phase 2: 3-state order lifecycle (IN_PROCESS → APPROVED → ACCEPTED).
-- Add estimated ship + arrival date columns. Add approvedAt/approvedById.

CREATE TYPE "OrderStatus_new" AS ENUM (
  'DRAFT',
  'IN_PROCESS',
  'APPROVED',
  'ACCEPTED',
  'DECLINED',
  'DISPATCHED',
  'DELIVERED'
);

-- Drop default to allow the column type swap.
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;

-- Cast existing values: SUBMITTED → IN_PROCESS, everything else stays the same.
ALTER TABLE "Order"
  ALTER COLUMN "status" TYPE "OrderStatus_new"
  USING (
    CASE "status"::text
      WHEN 'SUBMITTED' THEN 'IN_PROCESS'
      ELSE "status"::text
    END::"OrderStatus_new"
  );

ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"OrderStatus_new";

DROP TYPE "OrderStatus";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";

ALTER TABLE "Order"
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedById" UUID REFERENCES "User"(id) ON DELETE SET NULL,
  ADD COLUMN "estimatedShipDate" TIMESTAMP(3),
  ADD COLUMN "estimatedArrivalDate" TIMESTAMP(3);
