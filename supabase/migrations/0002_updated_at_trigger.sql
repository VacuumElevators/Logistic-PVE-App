-- rls-exempt: trigger function only, no tables created or modified.
-- Auto-set "updatedAt" to NOW() on every UPDATE.
-- Replaces Prisma's @updatedAt behavior in the database, so Supabase-client
-- callers do not need to set it manually on every update.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Attach the trigger to every public table that has an "updatedAt" column.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name = 'updatedAt'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I; '
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I '
      'FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      r.table_name, r.table_name
    );
  END LOOP;
END
$$;

-- Also default updatedAt on INSERT so callers that omit the column don't fail
-- the NOT NULL constraint.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name = 'updatedAt'
      AND c.column_default IS NULL
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;',
      r.table_name
    );
  END LOOP;
END
$$;
