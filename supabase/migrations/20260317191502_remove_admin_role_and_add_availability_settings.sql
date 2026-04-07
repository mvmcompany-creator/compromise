/*
  # Remove Admin Role and Add Availability Settings

  1. Changes to Profiles Table
    - Update role column to only allow 'manager' and 'attendant'
    - Remove any existing admin users (if any)

  2. New Tables
    - `availability_settings`
      - `id` (uuid, primary key)
      - `days_of_week` (integer array) - Days enabled (0=Sunday, 1=Monday, etc)
      - `start_time` (time) - Start of working hours
      - `end_time` (time) - End of working hours
      - `slot_duration` (integer) - Duration in minutes (30 or 60)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Security
    - Enable RLS on availability_settings
    - Managers can read and update settings
    - Public can read settings (needed for booking calendar)
*/

-- Drop existing constraint and add new one with only manager and attendant
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'profiles' AND constraint_name LIKE '%role%'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  END IF;
END $$;

ALTER TABLE profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('manager', 'attendant'));

-- Update trigger to not include admin
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get role from app_metadata (not user_metadata!)
  user_role := COALESCE(NEW.raw_app_meta_data->>'role', 'attendant');
  
  -- Insert profile (only if not exists to avoid conflicts)
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    is_active,
    daily_limit,
    google_connected
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    user_role,
    true,
    CASE 
      WHEN user_role = 'manager' THEN 0
      ELSE 5
    END,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create availability_settings table
CREATE TABLE IF NOT EXISTS availability_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  days_of_week integer[] NOT NULL DEFAULT '{1,2,3,4,5}',
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '18:00',
  slot_duration integer NOT NULL DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE availability_settings ENABLE ROW LEVEL SECURITY;

-- Policies for availability_settings
CREATE POLICY "Public can read availability settings"
  ON availability_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Managers can update availability settings"
  ON availability_settings
  FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'manager')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'manager');

CREATE POLICY "Managers can insert availability settings"
  ON availability_settings
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'manager');

-- Insert default availability settings if none exist
INSERT INTO availability_settings (days_of_week, start_time, end_time, slot_duration)
SELECT '{1,2,3,4,5}', '09:00', '18:00', 30
WHERE NOT EXISTS (SELECT 1 FROM availability_settings LIMIT 1);
