-- rls-exempt: replaces 0007 policies with role-based ones; RLS already enabled on every table (verified rowsecurity=true).
-- Role-based RLS. Location isolation is enforced in the database; finer
-- action gating (e.g. "managers can approve POs but staff cannot") stays
-- in the app capability matrix (src/lib/permissions.ts).
--
-- Roles (from public."User".role):
--   SUPER_ADMIN     — full access everywhere
--   LOCATION_ADMIN  — full access within their own location
--   MANAGER         — operational access within their own location
--   STAFF           — operational access within their own location

-- ============================================================
-- 1. Helper functions: read role/location from JWT custom claims with a
--    DB fallback so policies work even if the custom_access_token_hook
--    isn't enabled in the dashboard yet.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    (SELECT role::text FROM public."User" WHERE id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_location()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'location'),
    (SELECT "locationId"::text FROM public."User" WHERE id = auth.uid())
  );
$$;

-- is_super_admin() already delegates to get_user_role(); no change needed.

-- ============================================================
-- 2. Drop the permissive placeholders from migration 0007.
-- ============================================================

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_all" ON public.%I;', r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- 3. Per-table policies
-- ============================================================

-- --- Single-location tables --------------------------------------------
CREATE POLICY "loc_scope" ON public."Customer"
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR location::text = public.get_user_location())
  WITH CHECK (public.is_super_admin() OR location::text = public.get_user_location());

CREATE POLICY "loc_scope" ON public."Supplier"
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR location::text = public.get_user_location())
  WITH CHECK (public.is_super_admin() OR location::text = public.get_user_location());

CREATE POLICY "loc_scope" ON public."Backorder"
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR location::text = public.get_user_location())
  WITH CHECK (public.is_super_admin() OR location::text = public.get_user_location());

CREATE POLICY "loc_scope" ON public."PurchaseOrder"
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR location::text = public.get_user_location())
  WITH CHECK (public.is_super_admin() OR location::text = public.get_user_location());

CREATE POLICY "loc_scope" ON public."CalendarEvent"
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR location::text = public.get_user_location())
  WITH CHECK (public.is_super_admin() OR location::text = public.get_user_location());

CREATE POLICY "loc_scope" ON public."LocationProfile"
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR code::text = public.get_user_location())
  WITH CHECK (public.is_super_admin() OR code::text = public.get_user_location());

-- --- Origin + destination tables ---------------------------------------
CREATE POLICY "loc_scope" ON public."Order"
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR "originLocation"::text = public.get_user_location()
    OR "destLocation"::text = public.get_user_location()
  )
  WITH CHECK (
    public.is_super_admin()
    OR "originLocation"::text = public.get_user_location()
    OR "destLocation"::text = public.get_user_location()
  );

CREATE POLICY "loc_scope" ON public."Container"
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR "originLocation"::text = public.get_user_location()
    OR "destLocation"::text = public.get_user_location()
  )
  WITH CHECK (
    public.is_super_admin()
    OR "originLocation"::text = public.get_user_location()
    OR "destLocation"::text = public.get_user_location()
  );

CREATE POLICY "loc_scope" ON public."ContainerSlot"
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR "originLocation"::text = public.get_user_location()
    OR "destLocation"::text = public.get_user_location()
  )
  WITH CHECK (
    public.is_super_admin()
    OR "originLocation"::text = public.get_user_location()
    OR "destLocation"::text = public.get_user_location()
  );

CREATE POLICY "loc_scope" ON public."LocationRoute"
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR "originLocation"::text = public.get_user_location()
    OR "destLocation"::text = public.get_user_location()
  )
  WITH CHECK (
    public.is_super_admin()
    OR "originLocation"::text = public.get_user_location()
    OR "destLocation"::text = public.get_user_location()
  );

-- --- Global catalogs ---------------------------------------------------
CREATE POLICY "read_all" ON public."ElevatorModel"
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "manager_write" ON public."ElevatorModel"
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('SUPER_ADMIN','LOCATION_ADMIN','MANAGER'));
CREATE POLICY "manager_update" ON public."ElevatorModel"
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('SUPER_ADMIN','LOCATION_ADMIN','MANAGER'))
  WITH CHECK (public.get_user_role() IN ('SUPER_ADMIN','LOCATION_ADMIN','MANAGER'));
CREATE POLICY "admin_delete" ON public."ElevatorModel"
  FOR DELETE TO authenticated
  USING (public.get_user_role() IN ('SUPER_ADMIN','LOCATION_ADMIN'));

CREATE POLICY "read_all" ON public."ElevatorConfiguration"
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "manager_write" ON public."ElevatorConfiguration"
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('SUPER_ADMIN','LOCATION_ADMIN','MANAGER'));
CREATE POLICY "manager_update" ON public."ElevatorConfiguration"
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('SUPER_ADMIN','LOCATION_ADMIN','MANAGER'))
  WITH CHECK (public.get_user_role() IN ('SUPER_ADMIN','LOCATION_ADMIN','MANAGER'));
CREATE POLICY "admin_delete" ON public."ElevatorConfiguration"
  FOR DELETE TO authenticated
  USING (public.get_user_role() IN ('SUPER_ADMIN','LOCATION_ADMIN'));

CREATE POLICY "read_all" ON public."Part"
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "manager_write" ON public."Part"
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('SUPER_ADMIN','LOCATION_ADMIN','MANAGER'));
CREATE POLICY "manager_update" ON public."Part"
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('SUPER_ADMIN','LOCATION_ADMIN','MANAGER'))
  WITH CHECK (public.get_user_role() IN ('SUPER_ADMIN','LOCATION_ADMIN','MANAGER'));
CREATE POLICY "admin_delete" ON public."Part"
  FOR DELETE TO authenticated
  USING (public.get_user_role() IN ('SUPER_ADMIN','LOCATION_ADMIN'));

-- --- Child tables (inherit from parent) --------------------------------
CREATE POLICY "via_order" ON public."OrderItem"
  FOR ALL TO authenticated
  USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public."Order" o
      WHERE o.id = "orderId"
        AND (o."originLocation"::text = public.get_user_location()
          OR o."destLocation"::text = public.get_user_location())
    )
  )
  WITH CHECK (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public."Order" o
      WHERE o.id = "orderId"
        AND (o."originLocation"::text = public.get_user_location()
          OR o."destLocation"::text = public.get_user_location())
    )
  );

CREATE POLICY "via_po" ON public."POItem"
  FOR ALL TO authenticated
  USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public."PurchaseOrder" p
      WHERE p.id = "poId"
        AND p.location::text = public.get_user_location()
    )
  )
  WITH CHECK (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public."PurchaseOrder" p
      WHERE p.id = "poId"
        AND p.location::text = public.get_user_location()
    )
  );

-- --- User-private ------------------------------------------------------
CREATE POLICY "own_only" ON public."Notification"
  FOR ALL TO authenticated
  USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- --- Audit log ---------------------------------------------------------
CREATE POLICY "super_read" ON public."AuditLog"
  FOR SELECT TO authenticated
  USING (public.is_super_admin());
CREATE POLICY "auth_insert" ON public."AuditLog"
  FOR INSERT TO authenticated
  WITH CHECK ("userId" = auth.uid() OR "userId" IS NULL);

-- --- User table --------------------------------------------------------
CREATE POLICY "user_select" ON public."User"
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR id = auth.uid()
    OR "locationId"::text = public.get_user_location()
  );

CREATE POLICY "user_insert" ON public."User"
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.get_user_role() = 'LOCATION_ADMIN'
      AND "locationId"::text = public.get_user_location()
      AND role::text <> 'SUPER_ADMIN'
    )
  );

CREATE POLICY "user_update_admin" ON public."User"
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.get_user_role() = 'LOCATION_ADMIN'
      AND "locationId"::text = public.get_user_location()
      AND role::text <> 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.get_user_role() = 'LOCATION_ADMIN'
      AND "locationId"::text = public.get_user_location()
      AND role::text <> 'SUPER_ADMIN'
    )
  );

CREATE POLICY "user_update_self" ON public."User"
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role::text = public.get_user_role()
    AND "locationId"::text = public.get_user_location()
  );

CREATE POLICY "user_delete" ON public."User"
  FOR DELETE TO authenticated
  USING (
    id <> auth.uid() AND (
      public.is_super_admin()
      OR (
        public.get_user_role() = 'LOCATION_ADMIN'
        AND "locationId"::text = public.get_user_location()
        AND role::text <> 'SUPER_ADMIN'
      )
    )
  );
