-- rls-exempt: function hardening (ALTER FUNCTION ... SET search_path); no tables touched.
-- Lock down search_path on every SECURITY-sensitive function we own.
-- Supabase advisor flags mutable search_path as a privilege-escalation surface.

ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_role() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_location() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_super_admin() SET search_path = public, pg_temp;
