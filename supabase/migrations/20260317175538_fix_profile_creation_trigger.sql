/*
  # Fix Profile Creation Trigger

  1. Changes
    - Create trigger to automatically insert profile when user signs up
    - Ensures manager and attendant profiles are created properly
  
  2. Security
    - Trigger runs with security definer privileges
    - Only creates profiles for authenticated users
*/

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
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
    COALESCE(NEW.raw_user_meta_data->>'role', 'attendant'),
    true,
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'attendant') = 'manager' THEN 0
      ELSE 5
    END,
    false
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
