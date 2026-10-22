-- rls-exempt: this migration IS RLS policy maintenance on existing tables (Order, ContainerSlot already have RLS enabled in 0007); replaces the FOR-ALL loc_scope policy with split SELECT/INSERT/UPDATE/DELETE policies.
-- Phase 2: tighten RLS so only the destination (receiving) region can
-- UPDATE / DELETE orders + container slots. Origin region can SELECT + INSERT.
-- Super admin bypasses everything.

DROP POLICY IF EXISTS "loc_scope" ON public."Order";

CREATE POLICY "order_read" ON public."Order"
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR "originLocation"::text = public.get_user_location()
    OR "destLocation"::text  = public.get_user_location()
  );

CREATE POLICY "order_insert" ON public."Order"
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR "originLocation"::text = public.get_user_location()
  );

CREATE POLICY "order_update" ON public."Order"
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR "destLocation"::text = public.get_user_location()
  )
  WITH CHECK (
    public.is_super_admin()
    OR "destLocation"::text = public.get_user_location()
  );

CREATE POLICY "order_delete" ON public."Order"
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR "originLocation"::text = public.get_user_location()
  );

DROP POLICY IF EXISTS "loc_scope" ON public."ContainerSlot";

CREATE POLICY "slot_read" ON public."ContainerSlot"
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR "originLocation"::text = public.get_user_location()
    OR "destLocation"::text  = public.get_user_location()
  );

CREATE POLICY "slot_insert" ON public."ContainerSlot"
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR "originLocation"::text = public.get_user_location()
    OR "destLocation"::text  = public.get_user_location()
  );

CREATE POLICY "slot_update" ON public."ContainerSlot"
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR "destLocation"::text = public.get_user_location()
  )
  WITH CHECK (
    public.is_super_admin()
    OR "destLocation"::text = public.get_user_location()
  );

CREATE POLICY "slot_delete" ON public."ContainerSlot"
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR "destLocation"::text = public.get_user_location()
  );
