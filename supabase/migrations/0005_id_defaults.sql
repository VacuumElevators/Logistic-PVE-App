-- rls-exempt: column-default tweak on existing tables (RLS already on); no new tables.
-- Give every public table whose primary key is "id" TEXT a server-side
-- default of gen_random_uuid()::text so callers don't have to generate ids
-- explicitly. Prisma's @default(cuid()) is gone; this is the replacement.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.key_column_usage k
      ON k.table_schema = c.table_schema
     AND k.table_name = c.table_name
     AND k.column_name = c.column_name
    JOIN information_schema.table_constraints tc
      ON tc.constraint_name = k.constraint_name
     AND tc.table_schema = k.table_schema
     AND tc.constraint_type = 'PRIMARY KEY'
    WHERE c.table_schema = 'public'
      AND c.column_name = 'id'
      AND c.data_type = 'text'
      AND c.column_default IS NULL
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;',
      r.table_name
    );
  END LOOP;
END
$$;
