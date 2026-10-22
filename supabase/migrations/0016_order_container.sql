-- One order = one container. Fold container identity onto the Order — per the
-- client's confirmed model (a container order fills exactly one container and is
-- never shared; 2026-04-30 requirements call). The container number is per-route
-- (C01, C02 ... per origin->dest), assigned at submit. The ContainerSlot table
-- is retired in a follow-up migration once all readers are cut over.
alter table "Order" add column "containerNumber" text;
alter table "Order" add column "routeCounter" integer;

-- Per-route uniqueness for the counter (mirrors the retired
-- ContainerSlot_route_counter_key). Never-submitted drafts keep a NULL
-- routeCounter, and NULLs are distinct in a UNIQUE constraint, so they never
-- collide — the number is only claimed at submit.
alter table "Order"
  add constraint "Order_route_counter_key"
  unique ("originLocation", "destLocation", "routeCounter");

create index "Order_containerNumber_idx" on "Order" ("containerNumber");
