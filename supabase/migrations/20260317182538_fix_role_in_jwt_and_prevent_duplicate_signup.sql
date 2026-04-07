/*
  # Fix Role in JWT and Prevent Duplicate Signup Errors

  1. Problem
    - Role is being saved in raw_user_meta_data (user editable)
    - Should be in raw_app_meta_data (admin only, appears in JWT)
    - Duplicate email signup returns error instead of graceful handling
    - Manager can't see attendants because role not in JWT
  
  2. Changes
    - Update existing users to have role in raw_app_meta_data
    - Fix trigger to use raw_app_meta_data for role
    - Add check before signup to prevent duplicate errors
  
  3. Security
    - raw_app_meta_data is admin-only (cannot be changed by user)
    - Proper JWT claims for authorization
    - RLS policies work correctly with role in JWT
*/

-- Step 1: Copy existing roles from profiles to auth.users.raw_app_meta_data
DO $$
DECLARE
  profile_record RECORD;
  current_meta jsonb;
BEGIN
  FOR profile_record IN 
    SELECT p.id, p.role 
    FROM profiles p
    INNER JOIN auth.users u ON u.id = p.id
    WHERE p.role IS NOT NULL
  LOOP
    -- Get current app_meta_data
    SELECT COALESCE(raw_app_meta_data, '{}'::jsonb) INTO current_meta
    FROM auth.users
    WHERE id = profile_record.id;
    
    -- Update with role
    UPDATE auth.users
    SET raw_app_meta_data = current_meta || jsonb_build_object('role', profile_record.role)
    WHERE id = profile_record.id;
  END LOOP;
END $$;

-- Step 2: Drop and recreate the trigger to use raw_app_meta_data
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
  -- Get role from APP metadata (not user metadata) - this goes into JWT
  user_role := COALESCE(NEW.raw_app_meta_data->>'role', 'attendant');
  
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', COALESCE(NEW.raw_app_meta_data->>'full_name', '')),
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

-- Step 3: Create helper function to check if email exists before signup
CREATE OR REPLACE FUNCTION public.email_exists(check_email text)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE email = check_email
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.email_exists(text) TO authenticated;
