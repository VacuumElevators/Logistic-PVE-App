-- rls-exempt: adds an enum value only. No table created, no RLS surface.
-- Mirrors 0013_add_viewer_role (standalone ADD VALUE). The new value is used
-- NOWHERE in this file on purpose: Postgres forbids using a freshly added enum
-- value in the same transaction that adds it, and the Supabase runner wraps each
-- migration file in one transaction. Column/constraint work lives in 0018.
ALTER TYPE "OrderType" ADD VALUE IF NOT EXISTS 'AIRFREIGHT';
