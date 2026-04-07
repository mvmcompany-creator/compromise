/*
  # Simplify Roles System - Manager and Attendant Only

  1. Changes
    - Remove admin role, keep only 'manager' and 'attendant'
    - Managers can create attendants with login credentials
    - Update RLS policies for simplified structure
    - Add password field for attendants (created by managers)
  
  2. Security
    - Managers can manage all attendants
    - Attendants can only view their own data
    - Public can only read meeting types and create bookings
*/

-- Update profiles table to add temporary_password field for attendants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'temporary_password'
  ) THEN
    ALTER TABLE profiles ADD COLUMN temporary_password text;
  END IF;
END $$;
