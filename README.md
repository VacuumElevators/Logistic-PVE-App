# PVE Logistics Portal

A web application for managing global logistics and inter-location ordering for
Pneumatic Vacuum Elevators (PVE). It coordinates product and spare-part orders,
container and air-freight shipments, and an elevator/parts catalogue across four
operating regions: **Argentina, USA, Spain, and India**.

The portal replaces a spreadsheet-and-email workflow with a single system in
which one region places an order on another, the receiving region reviews and
schedules it, and both sides track it through to delivery.

---

## Table of contents

- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Environment variables](#environment-variables)
- [Local setup](#local-setup)
- [Database and migrations](#database-and-migrations)
- [Seed data](#seed-data)
- [Running the app](#running-the-app)
- [Deployment](#deployment)
- [Operations](#operations)
- [Testing](#testing)
- [Project structure](#project-structure)
- [User roles](#user-roles)
- [Further documentation](#further-documentation)
- [Ownership](#ownership)
- [Handover](#handover)

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) with React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL (hosted on Supabase) |
| Authentication | Supabase Auth (email + password) |
| Data access | `@supabase/supabase-js` with `@supabase/ssr` for server-side sessions |
| Client data/state | TanStack Query, Zustand |
| Forms and validation | React Hook Form with Zod |
| Charts | Recharts |
| Icons | lucide-react |
| Email | Nodemailer (SMTP) |

## Prerequisites

- **Node.js 20 or newer** (developed on Node 22; the production deployment runs Node 24.x)
- **npm** (the repository uses `package-lock.json`)
- A **Supabase project** (provides the PostgreSQL database and authentication)

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values. `.env.local` is
git-ignored and must never be committed.

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (Settings → API). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/publishable key. Safe for the browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service-role key. **Server only** — full database access, bypasses Row Level Security. Never expose to the browser. |
| `SMTP_HOST` | No | SMTP server host. If unset, notification emails are logged to the server instead of sent. |
| `SMTP_PORT` | No | SMTP port (default `587`). |
| `SMTP_SECURE` | No | `true` for TLS on connect, otherwise `false`. |
| `SMTP_USER` | No | SMTP username. |
| `SMTP_PASS` | No | SMTP password. |
| `SMTP_FROM` | No | From address for outgoing email. |

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# then edit .env.local with your Supabase project values

# 3. Apply the database schema (see "Database and migrations" below)

# 4. Create the first administrator account (see "Seed data" below)
npm run seed:admin

# 5. Start the development server
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Database and migrations

The database schema is defined as ordered SQL migrations in
[`supabase/migrations/`](supabase/migrations). Apply them to your Supabase
project **in filename order**. The simplest method is to open each file in the
Supabase dashboard's **SQL editor** and run them one by one, oldest first.

Three files share the `0010` prefix; apply them in this order:
`0010_drop_purchase_orders_unify_containers.sql` →
`0010_order_lifecycle_v2.sql` → `0010b_order_dest_write_lock.sql`.

> To use the Supabase CLI (`supabase db push`) instead, first run `supabase init`
> and `supabase link --project-ref <your-project-ref>` in the repo. The CLI is
> optional and not required for a working setup.

The migrations create the full schema: the user and location model, the
elevator and parts catalogue, the order and order-item tables, container slots,
back-orders, the calendar, notifications, suggestions, and the audit log, along
with their enums and access-control helpers. See
[`docs/data-model.md`](docs/data-model.md) for the entity-relationship diagram
and a table-by-table reference.

## Seed data

Seed scripts live in [`scripts/`](scripts) and read their configuration from
`.env.local`:

| Script | Command | Purpose |
| --- | --- | --- |
| `seed-admin.mjs` | `npm run seed:admin` | Creates the bootstrap administrator account. |
| `seed-pve-catalog.mjs` | `node --env-file=.env.local scripts/seed-pve-catalog.mjs` | Seeds the elevator and parts catalogue. |
| `seed-pve-users.mjs` | `node --env-file=.env.local scripts/seed-pve-users.mjs` | Seeds example users across the regions. |

`npm run seed:admin` creates a `SUPER_ADMIN` account with the default
credentials **`admin@pve.com` / `admin123`** (the script also prints them when
it runs). Sign in with these, then **change the password immediately** — do not
keep the default seed credentials in any production environment.

## Running the app

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server with hot reload. |
| `npm run build` | Create a production build. |
| `npm run start` | Serve the production build (run `build` first). |
| `npm run lint` | Run ESLint. |

## Deployment

The application runs in production on **Vercel**, with the database and
authentication on **Supabase**.

1. **Hosting** — Vercel builds and serves the Next.js frontend and API routes.
   Deploys are triggered automatically by pushes to the `main` branch
   (GitHub → Vercel integration); there is no manual deploy step.
2. **Database and auth** — the production Supabase project. Apply any new
   migrations to it as part of a release (see [Operations](#operations)).
3. **Environment variables** — set `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and the optional
   SMTP variables in the **Vercel project settings** (Production and Preview).
   Never commit these values.

## Operations

- **Deploys** — push/merge to `main`; Vercel builds and deploys automatically.
  Roll back from the Vercel dashboard (Deployments → promote a previous build).
- **Database migrations** — to change the schema, add a new numbered SQL file to
  `supabase/migrations/` and apply it to the production Supabase project (SQL
  editor or CLI). Keep the repository and the database in sync.
- **Backups** — the database is on Supabase, which provides automated backups
  per the project's plan; enable Point-in-Time Recovery for finer-grained
  restore if required.
- **Secrets** — application secrets live in the Vercel project's environment
  variables; the Supabase keys are managed in the Supabase dashboard
  (Settings → API). Nothing sensitive is stored in this repository.

## Testing

This project does not include an automated test suite; QA is performed manually
against the running app. Adding end-to-end tests (for example Playwright) for the
core order flow would be a sensible next improvement.

## Project structure

```
src/
  app/
    (dashboard)/        Authenticated screens (see docs/app-flow.md)
      backorders/  calendar/  dashboard/  elevators/  guide/
      locations/   orders/    parts/      settings/    suggestions/  users/
    api/                Route handlers (REST-style endpoints)
      auth/  backorders/  calendar/  dashboard/  elevator-configurations/
      elevator-models/  locations/  notifications/  orders/  parts/
      suggestions/  users/
    login/  forgot-password/  reset-password/  auth/callback/   Public pages
    layout.tsx  page.tsx  globals.css
  components/            UI components grouped by feature area
  lib/                  Server/client helpers: Supabase access (sb.ts,
                        supabase/), permissions.ts, order-workflow.ts,
                        capacity, calendar planning, email, CSV, etc.
  store/                Client state (Zustand)
  types/                Generated Supabase database types
  proxy.ts              Session middleware (auth gate + cookie refresh)
public/                 Static assets
scripts/                Seed scripts
supabase/migrations/    Ordered SQL schema migrations
docs/                   Architecture, app-flow, and data-model documentation
```

## User roles

Access is governed by five roles, defined in
[`src/lib/permissions.ts`](src/lib/permissions.ts). Capabilities are cumulative:
each role includes everything the role below it can do.

| Role | Summary |
| --- | --- |
| `SUPER_ADMIN` | Full access across all regions, including user management. |
| `LOCATION_ADMIN` | Full access within their own region, including managing that region's users. |
| `MANAGER` | Operational actions within their region: orders, parts, containers, calendar, back-orders, and elevator configuration. |
| `STAFF` | Create and update orders, and run the order workflow for orders sent to their region; read parts, containers, and the catalogue. |
| `VIEWER` | Read-only across the portal. |

Order-status changes are gated by region rather than by the manager role: any
operator at an order's **receiving** (destination) region — that is, any
non-`VIEWER` (`STAFF` and above) — can approve, accept, decline, dispatch, and
deliver it. The origin region places the order but cannot change its status
once submitted. See [`docs/app-flow.md`](docs/app-flow.md) for the full order
lifecycle.

## Further documentation

| Document | Contents |
| --- | --- |
| [`docs/architecture.md`](docs/architecture.md) | System overview, request/auth flow, and how the layers fit together. |
| [`docs/app-flow.md`](docs/app-flow.md) | End-to-end user flows: sign-in, the order lifecycle, and each main screen. |
| [`docs/data-model.md`](docs/data-model.md) | Entity-relationship diagram, enums, and a table-by-table reference. |

## Ownership

Proprietary software owned by Pneumatic Vacuum Elevators (PVE). All rights
reserved. Not licensed for redistribution or use outside PVE.

## Handover

This repository is the complete source for the live application. Handed over
alongside it:

- The **Supabase project** (PostgreSQL database + authentication), in PVE's own
  Supabase organization.
- The **Vercel project** that builds and hosts the application.
- **Administrator credentials**, provided separately (never stored in this
  repository).

Any developer experienced with Next.js and Supabase can continue development
from this repository and the [`docs/`](docs) folder.
