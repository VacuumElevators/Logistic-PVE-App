-- rls-exempt: additive columns + constraint/index on the existing "Order" table
-- (RLS already enabled on it since 0007/0008). No new tables, no policy change,
-- no existing rows touched. Airfreight orders reuse the entire Order lifecycle;
-- these mirror the container routeCounter/containerNumber pattern from 0016 with
-- a DEDICATED per-route air sequence so air numbers (A01, A02 …) can never
-- collide with container numbers (C01, C02 …) on the same route.
alter table "Order" add column "airNumber" text;
alter table "Order" add column "airRouteCounter" integer;

-- Per-route uniqueness for the air counter, mirroring Order_route_counter_key
-- (0016). Container rows always leave airRouteCounter NULL, and NULLs are
-- distinct in a UNIQUE constraint, so they never collide here; the air number is
-- only claimed at submit, so never-submitted air drafts (NULL) don't collide
-- either.
alter table "Order"
  add constraint "Order_air_route_counter_key"
  unique ("originLocation", "destLocation", "airRouteCounter");

create index "Order_airNumber_idx" on "Order" ("airNumber");
