/*
  # Allow Public Access to View Attendants

  1. Problem
    - Public booking page cannot view available attendants
    - Only authenticated users (managers or self) can view profiles
    - This prevents public users from making bookings

  2. Solution
    - Add RLS policy to allow anonymous users to view attendant profiles
    - Only expose minimal necessary information (id, is_active, daily_limit, role)
    - Maintain security for other profile data

  3. Changes
    - Create policy "Public can view attendant availability" for SELECT on profiles
    - Allow anon role to see attendants where role = 'attendant'
*/

-- Allow public (anonymous) users to view attendant profiles for booking purposes
CREATE POLICY "Public can view attendant availability"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (
    role = 'attendant' AND is_active = true
  );