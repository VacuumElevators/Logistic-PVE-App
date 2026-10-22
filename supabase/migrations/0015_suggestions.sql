-- Internal "suggestions box" (per the 2026-07-09 PVE call): any signed-in user
-- can submit feedback; admins review and resolve.
create table "Suggestion" (
  id text primary key default (gen_random_uuid())::text,
  "createdById" uuid not null references "User"(id),
  message text not null,
  status text not null default 'OPEN',
  "createdAt" timestamp without time zone not null default now(),
  "resolvedAt" timestamp without time zone,
  "resolvedById" uuid references "User"(id)
);

create index "Suggestion_status_createdAt_idx"
  on "Suggestion" (status, "createdAt" desc);

-- The app reaches this table exclusively through the service-role client (which
-- bypasses RLS), matching every other table. Enable RLS with no policy so the
-- table is not reachable via the anon / authenticated data API.
alter table "Suggestion" enable row level security;
