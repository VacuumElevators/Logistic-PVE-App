-- rls-exempt: Auth JWT hook function; runs in service-role context. No tables.
-- custom_access_token_hook: inject the user's role and location into every
-- Supabase Auth JWT under "app_metadata.role" / "app_metadata.location".
--
-- After this is applied:
--   1. Enable it in Supabase Dashboard → Authentication → Hooks → "Custom
--      Access Token". Pick this function (public.custom_access_token_hook).
--   2. Newly issued tokens will carry the claims. RLS policies can read them
--      with auth.jwt() -> 'app_metadata' ->> 'role'.
--
-- The hook function MUST be SECURITY DEFINER, MUST live in `public`, and the
-- `supabase_auth_admin` role MUST have EXECUTE on it.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  app_metadata jsonb;
  profile record;
BEGIN
  claims := event -> 'claims';
  app_metadata := COALESCE(claims -> 'app_metadata', '{}'::jsonb);

  SELECT role::text AS role, "locationId"::text AS location
  INTO profile
  FROM public."User"
  WHERE id = (event ->> 'user_id')::uuid;

  IF profile.role IS NOT NULL THEN
    app_metadata := app_metadata
      || jsonb_build_object('role', profile.role)
      || jsonb_build_object('location', profile.location);
  END IF;

  claims := jsonb_set(claims, '{app_metadata}', app_metadata);
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Lock down the function: only Supabase Auth invokes it.
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;

-- The hook must be able to read the User table even though RLS is enabled.
GRANT SELECT ON public."User" TO supabase_auth_admin;
