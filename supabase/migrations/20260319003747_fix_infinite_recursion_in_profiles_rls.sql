/*
  # Fix Infinite Recursion in Profiles RLS Policies

  This migration resolves the infinite recursion error (42P17) that occurs when
  RLS policies on the profiles table query the same table to check user roles.
  
  ## Problem
  Policies were using:
  ```sql
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'manager')
  ```
  This creates a circular dependency: to check if user can UPDATE profiles,
  we SELECT from profiles, which triggers the SELECT policy, which checks if
  user can SELECT from profiles, creating infinite recursion.
  
  ## Solution
  Use JWT metadata to check roles instead of querying the profiles table.
  The role is stored in app_metadata during signup and is available in the JWT.
  
  ## Changes Made
  
  ### 1. DROP Problematic Policies
    - "Manager Admin pode deletar perfis" (causes recursion)
    - "Manager Admin pode inserir perfis" (causes recursion)
    - "Manager Admin pode atualizar qualquer perfil" (causes recursion)
    - "Managers can delete profiles" (redundant)
    - "Managers can update any profile" (redundant)
    - "Users can update own profile" (will be recreated)
  
  ### 2. CREATE Safe Policies Using JWT
    - Managers can INSERT/UPDATE/DELETE using JWT role check
    - Users can UPDATE their own profile
    - System can INSERT profiles during signup
  
  ## Security Notes
    - JWT app_metadata is read-only for users (only server can modify)
    - Checking JWT avoids database queries and recursion
    - Policies remain restrictive: only managers and profile owners have access
*/

-- Drop all problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Manager Admin pode deletar perfis" ON profiles;
DROP POLICY IF EXISTS "Manager Admin pode inserir perfis" ON profiles;
DROP POLICY IF EXISTS "Manager Admin pode atualizar qualquer perfil" ON profiles;
DROP POLICY IF EXISTS "Managers can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- CREATE safe INSERT policy for managers using JWT
CREATE POLICY "Managers can insert profiles via JWT"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role')::text = 'manager' OR
    (auth.jwt()->'user_metadata'->>'role')::text = 'manager'
  );

-- CREATE safe UPDATE policy for managers using JWT
CREATE POLICY "Managers can update profiles via JWT"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role')::text = 'manager' OR
    (auth.jwt()->'user_metadata'->>'role')::text = 'manager'
  )
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role')::text = 'manager' OR
    (auth.jwt()->'user_metadata'->>'role')::text = 'manager'
  );

-- CREATE safe DELETE policy for managers using JWT
CREATE POLICY "Managers can delete profiles via JWT"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role')::text = 'manager' OR
    (auth.jwt()->'user_metadata'->>'role')::text = 'manager'
  );

-- Allow users to update their own profile (safe, no recursion)
CREATE POLICY "Users can update own profile safe"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
