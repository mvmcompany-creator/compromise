/*
  # Fix Security and Performance Issues

  1. Performance Improvements
    - Add missing index for system_settings.updated_by foreign key
    - Remove unused indexes that add overhead without benefit
    - Fix RLS policies to use (select auth.uid()) pattern for better performance at scale

  2. Security Improvements
    - Fix function search_path for assign_booking_to_attendant to prevent SQL injection
    - Optimize RLS policies to evaluate auth functions once per query instead of per row

  3. Changes Made
    - Add index: idx_system_settings_updated_by
    - Drop unused indexes: idx_bookings_date, idx_bookings_status, idx_bookings_assigned_to, idx_bookings_assignment_date, idx_profiles_role, idx_profiles_is_active
    - Update all RLS policies to use (select auth.uid()) and (select auth.jwt())
    - Fix assign_booking_to_attendant function search_path
*/

-- =====================================================
-- 1. ADD MISSING INDEX FOR FOREIGN KEY
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by 
ON public.system_settings(updated_by);

-- =====================================================
-- 2. REMOVE UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS public.idx_bookings_date;
DROP INDEX IF EXISTS public.idx_bookings_status;
DROP INDEX IF EXISTS public.idx_bookings_assigned_to;
DROP INDEX IF EXISTS public.idx_bookings_assignment_date;
DROP INDEX IF EXISTS public.idx_profiles_role;
DROP INDEX IF EXISTS public.idx_profiles_is_active;

-- =====================================================
-- 3. FIX RLS POLICIES - BOOKINGS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Managers can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Managers can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Managers can delete bookings" ON public.bookings;

CREATE POLICY "Managers can view all bookings"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  );

CREATE POLICY "Managers can update bookings"
  ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  )
  WITH CHECK (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  );

CREATE POLICY "Managers can delete bookings"
  ON public.bookings
  FOR DELETE
  TO authenticated
  USING (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  );

-- =====================================================
-- 4. FIX RLS POLICIES - WORKING_HOURS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Managers can manage working hours insert" ON public.working_hours;
DROP POLICY IF EXISTS "Managers can manage working hours update" ON public.working_hours;
DROP POLICY IF EXISTS "Managers can manage working hours delete" ON public.working_hours;

CREATE POLICY "Managers can manage working hours insert"
  ON public.working_hours
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  );

CREATE POLICY "Managers can manage working hours update"
  ON public.working_hours
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  )
  WITH CHECK (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  );

CREATE POLICY "Managers can manage working hours delete"
  ON public.working_hours
  FOR DELETE
  TO authenticated
  USING (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  );

-- =====================================================
-- 5. FIX RLS POLICIES - BLOCKED_TIMES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Managers can manage blocked times insert" ON public.blocked_times;
DROP POLICY IF EXISTS "Managers can manage blocked times update" ON public.blocked_times;
DROP POLICY IF EXISTS "Managers can manage blocked times delete" ON public.blocked_times;

CREATE POLICY "Managers can manage blocked times insert"
  ON public.blocked_times
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  );

CREATE POLICY "Managers can manage blocked times update"
  ON public.blocked_times
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  )
  WITH CHECK (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  );

CREATE POLICY "Managers can manage blocked times delete"
  ON public.blocked_times
  FOR DELETE
  TO authenticated
  USING (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  );

-- =====================================================
-- 6. FIX RLS POLICIES - PROFILES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can delete profiles" ON public.profiles;

CREATE POLICY "Managers can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  );

CREATE POLICY "Managers can update profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  )
  WITH CHECK (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  );

CREATE POLICY "Managers can delete profiles"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  );

-- =====================================================
-- 7. FIX RLS POLICIES - SYSTEM_SETTINGS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Managers can manage settings insert" ON public.system_settings;
DROP POLICY IF EXISTS "Managers can manage settings update" ON public.system_settings;
DROP POLICY IF EXISTS "Managers can manage settings delete" ON public.system_settings;

CREATE POLICY "Managers can manage settings insert"
  ON public.system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  );

CREATE POLICY "Managers can manage settings update"
  ON public.system_settings
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  )
  WITH CHECK (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  );

CREATE POLICY "Managers can manage settings delete"
  ON public.system_settings
  FOR DELETE
  TO authenticated
  USING (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  );

-- =====================================================
-- 8. FIX RLS POLICIES - AVAILABILITY_SETTINGS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Managers can manage availability insert" ON public.availability_settings;
DROP POLICY IF EXISTS "Managers can manage availability update" ON public.availability_settings;
DROP POLICY IF EXISTS "Managers can manage availability delete" ON public.availability_settings;

CREATE POLICY "Managers can manage availability insert"
  ON public.availability_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  );

CREATE POLICY "Managers can manage availability update"
  ON public.availability_settings
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  )
  WITH CHECK (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  );

CREATE POLICY "Managers can manage availability delete"
  ON public.availability_settings
  FOR DELETE
  TO authenticated
  USING (
    (SELECT COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'role', '')) = 'manager'
  );

-- =====================================================
-- 9. FIX FUNCTION SEARCH_PATH
-- =====================================================

DROP FUNCTION IF EXISTS public.assign_booking_to_attendant(uuid);

CREATE OR REPLACE FUNCTION public.assign_booking_to_attendant(booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_date date;
  v_attendant_id uuid;
BEGIN
  SELECT date INTO v_date
  FROM public.bookings
  WHERE id = booking_id;

  SELECT id INTO v_attendant_id
  FROM public.profiles
  WHERE role = 'attendant'
    AND is_active = true
    AND id NOT IN (
      SELECT assigned_to
      FROM public.bookings
      WHERE date = v_date
        AND status = 'confirmed'
        AND assigned_to IS NOT NULL
      GROUP BY assigned_to
      HAVING COUNT(*) >= (
        SELECT daily_limit
        FROM public.profiles
        WHERE id = assigned_to
      )
    )
  ORDER BY (
    SELECT COUNT(*)
    FROM public.bookings
    WHERE assigned_to = public.profiles.id
      AND date = v_date
      AND status = 'confirmed'
  ) ASC
  LIMIT 1;

  IF v_attendant_id IS NOT NULL THEN
    UPDATE public.bookings
    SET assigned_to = v_attendant_id
    WHERE id = booking_id;
  END IF;
END;
$$;