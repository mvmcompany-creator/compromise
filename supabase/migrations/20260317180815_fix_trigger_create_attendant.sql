/*
  # Fix Trigger for Creating Attendants

  1. Problem
    - Trigger was trying to update auth.users during insertion
    - This causes conflicts and doesn't persist properly
  
  2. Solution
    - Remove the UPDATE statement from trigger
    - Let the signUp metadata handle the JWT role
    - Trigger only creates the profile entry
  
  3. Security
    - Profile creation still automatic
    - Role properly set from metadata
*/

-- Drop and recreate the trigger function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create simplified function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get role from metadata or default to 'attendant'
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'attendant');
  
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

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
