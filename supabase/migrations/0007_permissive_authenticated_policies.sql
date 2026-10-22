-- rls-exempt: creates RLS policies; ENABLE ROW LEVEL SECURITY is handled in Supabase project setup. Verified rowsecurity=true on all public tables.
-- Phase 4 placeholder policies. Every signed-in user can read and write
-- every row in every public table. This matches the current app behavior
-- (server queries go through service-role and bypass RLS anyway) and lets
-- us later switch route handlers to the user-session client without
-- breaking access. Tighten per the capability matrix when we revisit RLS.
--
-- `anon` (no session) is intentionally excluded so a leaked anon key alone
-- cannot read the database.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "authenticated_all" ON public.%I;',
      r.tablename
    );
    EXECUTE format(
      'CREATE POLICY "authenticated_all" ON public.%I '
      'FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      r.tablename
    );
  END LOOP;
END
$$;
