-- rls-exempt: defines RLS helper functions (get_user_role, get_user_location, is_super_admin); no tables.
-- RLS helper functions. Stub for now — actual per-table policies are
-- intentionally deferred until role/permission design is finalized. These
-- helpers let future policies look like:
--   USING (public.is_super_admin() OR location_id = public.get_user_location())

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_location()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'location'),
    NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.get_user_role() = 'SUPER_ADMIN';
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_location() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;
