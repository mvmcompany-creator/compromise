/*
  # Fix Trigger to Read Role from app_metadata
  
  1. Problem
    - Trigger was reading role from raw_user_meta_data
    - Edge Function sets role in app_metadata
    - This mismatch causes attendants to not get proper role assignment
  
  2. Solution
    - Update trigger to read from raw_app_meta_data instead
    - Ensure daily_limit is set to 5 for attendants
  
  3. Changes
    - Read role from app_metadata
    - Maintain default of 5 for attendants' daily_limit
*/

-- Drop and recreate the trigger function with correct metadata source
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
      WHEN user_role = 'admin' THEN 0
      ELSE 5
    END,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
