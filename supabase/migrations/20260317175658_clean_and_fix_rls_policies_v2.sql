/*
  # Clean and Fix RLS Policies

  1. Changes
    - Remove all duplicate and old policies
    - Create clean, simple policies for manager and attendant roles
  
  2. Security
    - Managers can manage everything
    - Attendants can only view their own data
    - Public can create bookings and view meeting types
*/

-- PROFILES TABLE: Remove all existing policies
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Manager can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Manager can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Manager can update any profile" ON profiles;
DROP POLICY IF EXISTS "Managers can update attendant profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Usuários autenticados podem ver perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Managers can create attendant profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can update profiles" ON profiles;

-- Create clean policies for profiles
CREATE POLICY "Anyone can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Managers can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'
    )
  );

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Managers can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'
    )
  );

CREATE POLICY "System can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- BOOKINGS TABLE: Remove all existing policies
DROP POLICY IF EXISTS "Admins can update all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins podem atualizar agendamentos" ON bookings;
DROP POLICY IF EXISTS "Admins podem deletar agendamentos" ON bookings;
DROP POLICY IF EXISTS "Admins podem ver todos os agendamentos" ON bookings;
DROP POLICY IF EXISTS "Attendants can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Managers can update all bookings" ON bookings;
DROP POLICY IF EXISTS "Managers can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Qualquer pessoa pode criar agendamentos" ON bookings;
DROP POLICY IF EXISTS "Qualquer pessoa pode ver data/hora de agendamentos" ON bookings;
DROP POLICY IF EXISTS "System can create bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view their bookings" ON bookings;

-- Create clean policies for bookings
CREATE POLICY "Public can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Managers can view all bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'
    )
  );

CREATE POLICY "Attendants can view their bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());

CREATE POLICY "Managers can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'
    )
  );

CREATE POLICY "Managers can delete bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'
    )
  );

-- WORKING_HOURS TABLE: Clean policies
DROP POLICY IF EXISTS "Admins can manage working hours" ON working_hours;
DROP POLICY IF EXISTS "Público pode ver horários" ON working_hours;

CREATE POLICY "Public can view working hours"
  ON working_hours FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated can view working hours"
  ON working_hours FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage working hours"
  ON working_hours FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'
    )
  );

-- BLOCKED_TIMES TABLE: Clean policies
DROP POLICY IF EXISTS "Admins can manage blocked times" ON blocked_times;
DROP POLICY IF EXISTS "Público pode ver bloqueios" ON blocked_times;

CREATE POLICY "Public can view blocked times"
  ON blocked_times FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated can view blocked times"
  ON blocked_times FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage blocked times"
  ON blocked_times FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'
    )
  );

-- SYSTEM_SETTINGS TABLE: Clean policies
DROP POLICY IF EXISTS "Admins can manage settings" ON system_settings;

CREATE POLICY "Managers can manage settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'
    )
  );
