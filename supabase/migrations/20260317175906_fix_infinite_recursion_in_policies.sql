/*
  # Fix Infinite Recursion in RLS Policies

  1. Problem
    - Policies on profiles table were causing infinite recursion
    - Cannot query profiles table within profiles policies
  
  2. Solution
    - Use auth.jwt() to check role instead of querying profiles
    - Store role in JWT metadata for instant access
  
  3. Security
    - Same security level, better performance
    - No recursion issues
*/

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Anyone can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Managers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Managers can update any profile" ON profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON profiles;

-- Create new policies without recursion
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Managers can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'manager');

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Managers can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'manager')
  WITH CHECK ((auth.jwt()->>'role')::text = 'manager');

CREATE POLICY "System can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Managers can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'manager');

-- Fix bookings policies to avoid recursion
DROP POLICY IF EXISTS "Managers can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Managers can update bookings" ON bookings;
DROP POLICY IF EXISTS "Managers can delete bookings" ON bookings;

CREATE POLICY "Managers can view all bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'manager');

CREATE POLICY "Managers can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'manager')
  WITH CHECK ((auth.jwt()->>'role')::text = 'manager');

CREATE POLICY "Managers can delete bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'manager');

-- Fix working_hours policies
DROP POLICY IF EXISTS "Managers can manage working hours" ON working_hours;

CREATE POLICY "Managers can manage working hours"
  ON working_hours FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'manager')
  WITH CHECK ((auth.jwt()->>'role')::text = 'manager');

-- Fix blocked_times policies
DROP POLICY IF EXISTS "Managers can manage blocked times" ON blocked_times;

CREATE POLICY "Managers can manage blocked times"
  ON blocked_times FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'manager')
  WITH CHECK ((auth.jwt()->>'role')::text = 'manager');

-- Fix system_settings policies
DROP POLICY IF EXISTS "Managers can manage settings" ON system_settings;

CREATE POLICY "Managers can manage settings"
  ON system_settings FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'manager')
  WITH CHECK ((auth.jwt()->>'role')::text = 'manager');
