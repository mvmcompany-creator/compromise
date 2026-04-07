/*
  # Seed Test Users

  This migration adds test users to enable the booking system to work:
  
  ## Test Users Created
    1. Manager user for administration
    2. Two attendant users to handle bookings
  
  ## Important Notes
    - These are test accounts with simple passwords
    - In production, use proper authentication through the signup forms
    - Manager email: manager@test.com / Password: Manager123!
    - Attendant 1: attendant1@test.com / Password: Attendant123!
    - Attendant 2: attendant2@test.com / Password: Attendant123!
    - The profiles will be created automatically by the trigger
*/

-- Check if users already exist before inserting
DO $$
DECLARE
  manager_user_id uuid;
  attendant1_user_id uuid;
  attendant2_user_id uuid;
BEGIN
  -- Create manager user if doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'manager@test.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'manager@test.com',
      crypt('Manager123!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"],"role":"manager"}'::jsonb,
      '{"name":"Test Manager"}'::jsonb,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO manager_user_id;
    
    -- Update the profile to set proper role and name
    UPDATE profiles 
    SET 
      full_name = 'Test Manager',
      role = 'manager',
      is_active = true,
      daily_limit = 0
    WHERE id = manager_user_id;
  END IF;

  -- Create attendant 1 if doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'attendant1@test.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'attendant1@test.com',
      crypt('Attendant123!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"],"role":"attendant"}'::jsonb,
      '{"name":"João Silva"}'::jsonb,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO attendant1_user_id;
    
    -- Update the profile to set proper role and name
    UPDATE profiles 
    SET 
      full_name = 'João Silva',
      role = 'attendant',
      is_active = true,
      daily_limit = 10
    WHERE id = attendant1_user_id;
  END IF;

  -- Create attendant 2 if doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'attendant2@test.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'attendant2@test.com',
      crypt('Attendant123!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"],"role":"attendant"}'::jsonb,
      '{"name":"Maria Santos"}'::jsonb,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO attendant2_user_id;
    
    -- Update the profile to set proper role and name
    UPDATE profiles 
    SET 
      full_name = 'Maria Santos',
      role = 'attendant',
      is_active = true,
      daily_limit = 10
    WHERE id = attendant2_user_id;
  END IF;
  
END $$;
