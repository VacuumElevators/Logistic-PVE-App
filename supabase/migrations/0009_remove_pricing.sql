-- rls-exempt: column drops on existing RLS-enabled tables; no new tables, no policy changes.
-- Remove pricing fields entirely. PVE has not provided a price list,
-- the columns were scaffolding only, and the surcharge logic that read
-- them produced fabricated numbers. The portal is purely operational
-- logistics for now; pricing can be re-added via a new migration if
-- requirements change.
--
-- LocationProfile.currency is intentionally left in place — it is a
-- location's display-currency preference, unrelated to order pricing.

ALTER TABLE "ElevatorModel"         DROP COLUMN "basePrice";
ALTER TABLE "ElevatorConfiguration" DROP COLUMN "basePrice";
ALTER TABLE "Part"                  DROP COLUMN "unitPrice";
ALTER TABLE "OrderItem"             DROP COLUMN "unitPrice", DROP COLUMN "lineTotal";
ALTER TABLE "Order"                 DROP COLUMN "totalAmount", DROP COLUMN "currency";
ALTER TABLE "PurchaseOrder"         DROP COLUMN "totalAmount", DROP COLUMN "currency";
ALTER TABLE "POItem"                DROP COLUMN "unitPrice", DROP COLUMN "lineTotal";
