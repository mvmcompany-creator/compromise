/*
  # Update Trigger to Sync Role to JWT

  1. Changes
    - Update trigger to ensure role is stored in user_metadata (JWT)
    - This prevents infinite recursion in RLS policies
  
  2. Security
    - Role is accessible via auth.jwt() without querying profiles table
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create updated function
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
  
  -- Insert profile
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
  );
  
  -- Ensure role is in user_metadata for JWT access
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(user_role)
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
