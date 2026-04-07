/*
  # Compromise - Sistema Completo de Agendamento

  1. Tabelas Criadas
    - bookings: Agendamentos de reuniões
    - working_hours: Horários de trabalho
    - blocked_times: Horários bloqueados
    - profiles: Perfis de usuários (managers e attendants)
    - system_settings: Configurações do sistema
    - availability_settings: Configurações de disponibilidade
  
  2. Segurança
    - RLS habilitado em todas as tabelas
    - Policies restritivas usando JWT app_metadata
    - Validação de dados em INSERT policies
  
  3. Funções e Triggers
    - assign_booking_to_attendant: Distribui agendamentos automaticamente
    - handle_new_user: Cria perfil automaticamente no signup
  
  4. Dados Iniciais
    - Horários de trabalho padrão (Segunda a Sexta, 09:00-18:00)
    - Configurações de disponibilidade padrão
*/

-- ============================================================
-- TABELA: bookings
-- ============================================================

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_phone text,
  meeting_type text DEFAULT 'Reunião de 30 minutos',
  date date NOT NULL,
  time text NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  meet_link text,
  assigned_to uuid,
  assignment_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_to ON bookings(assigned_to);
CREATE INDEX IF NOT EXISTS idx_bookings_assignment_date ON bookings(assignment_date);

-- ============================================================
-- TABELA: working_hours
-- ============================================================

CREATE TABLE IF NOT EXISTS working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time text NOT NULL,
  end_time text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(day_of_week)
);

ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABELA: blocked_times
-- ============================================================

CREATE TABLE IF NOT EXISTS blocked_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABELA: profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('manager', 'attendant')),
  is_active boolean DEFAULT true,
  daily_limit integer,
  google_connected boolean DEFAULT false,
  google_refresh_token text,
  google_access_token text,
  google_token_expires_at timestamptz,
  google_email text,
  temporary_password text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON COLUMN profiles.google_connected IS 'Whether the attendant has connected their Google account';
COMMENT ON COLUMN profiles.google_refresh_token IS 'OAuth 2.0 refresh token for obtaining new access tokens';
COMMENT ON COLUMN profiles.google_access_token IS 'OAuth 2.0 access token for Google Calendar API';
COMMENT ON COLUMN profiles.google_token_expires_at IS 'Timestamp when the access token expires';
COMMENT ON COLUMN profiles.google_email IS 'Email address of the connected Google account';

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Adicionar FK após criar profiles
ALTER TABLE bookings ADD CONSTRAINT bookings_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- ============================================================
-- TABELA: system_settings
-- ============================================================

CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABELA: availability_settings
-- ============================================================

CREATE TABLE IF NOT EXISTS availability_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  days_of_week integer[] NOT NULL DEFAULT '{1,2,3,4,5}',
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '18:00',
  slot_duration integer NOT NULL DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE availability_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES: bookings
-- ============================================================

CREATE POLICY "Public can view bookings for availability"
  ON bookings FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Attendants can view their bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (assigned_to = (select auth.uid()));

CREATE POLICY "Managers can view all bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager');

CREATE POLICY "Public can create bookings"
  ON bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    client_name IS NOT NULL 
    AND client_email IS NOT NULL 
    AND date IS NOT NULL 
    AND time IS NOT NULL
  );

CREATE POLICY "Managers can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager')
  WITH CHECK ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager');

CREATE POLICY "Managers can delete bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager');

-- ============================================================
-- POLICIES: working_hours
-- ============================================================

CREATE POLICY "Public can view working hours"
  ON working_hours FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Managers can manage working hours insert"
  ON working_hours FOR INSERT
  TO authenticated
  WITH CHECK ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager');

CREATE POLICY "Managers can manage working hours update"
  ON working_hours FOR UPDATE
  TO authenticated
  USING ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager')
  WITH CHECK ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager');

CREATE POLICY "Managers can manage working hours delete"
  ON working_hours FOR DELETE
  TO authenticated
  USING ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager');

-- ============================================================
-- POLICIES: blocked_times
-- ============================================================

CREATE POLICY "Public can view blocked times"
  ON blocked_times FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Managers can manage blocked times insert"
  ON blocked_times FOR INSERT
  TO authenticated
  WITH CHECK ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager');

CREATE POLICY "Managers can manage blocked times update"
  ON blocked_times FOR UPDATE
  TO authenticated
  USING ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager')
  WITH CHECK ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager');

CREATE POLICY "Managers can manage blocked times delete"
  ON blocked_times FOR DELETE
  TO authenticated
  USING ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager');

-- ============================================================
-- POLICIES: profiles
-- ============================================================

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Managers can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager');

CREATE POLICY "System can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Managers can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager')
  WITH CHECK ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager');

CREATE POLICY "Managers can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager');

-- ============================================================
-- POLICIES: system_settings
-- ============================================================

CREATE POLICY "Authenticated can view settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage settings insert"
  ON system_settings FOR INSERT
  TO authenticated
  WITH CHECK ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager');

CREATE POLICY "Managers can manage settings update"
  ON system_settings FOR UPDATE
  TO authenticated
  USING ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager')
  WITH CHECK ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager');

CREATE POLICY "Managers can manage settings delete"
  ON system_settings FOR DELETE
  TO authenticated
  USING ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager');

-- ============================================================
-- POLICIES: availability_settings
-- ============================================================

CREATE POLICY "Public can view availability settings"
  ON availability_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Managers can manage availability insert"
  ON availability_settings FOR INSERT
  TO authenticated
  WITH CHECK ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager');

CREATE POLICY "Managers can manage availability update"
  ON availability_settings FOR UPDATE
  TO authenticated
  USING ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager')
  WITH CHECK ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager');

CREATE POLICY "Managers can manage availability delete"
  ON availability_settings FOR DELETE
  TO authenticated
  USING ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager');

-- ============================================================
-- FUNÇÃO: assign_booking_to_attendant
-- ============================================================

CREATE OR REPLACE FUNCTION assign_booking_to_attendant(
  booking_id uuid,
  booking_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  selected_attendant uuid;
  attendant_record RECORD;
  available_attendants uuid[];
BEGIN
  FOR attendant_record IN
    SELECT p.id, p.daily_limit
    FROM profiles p
    WHERE p.role = 'attendant'
      AND p.is_active = true
      AND p.daily_limit IS NOT NULL
      AND p.google_connected = true
      AND (
        SELECT COUNT(*)
        FROM bookings b
        WHERE b.assigned_to = p.id
          AND b.assignment_date = booking_date
          AND b.status = 'confirmed'
      ) < p.daily_limit
  LOOP
    available_attendants := array_append(available_attendants, attendant_record.id);
  END LOOP;

  IF array_length(available_attendants, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  selected_attendant := available_attendants[1 + floor(random() * array_length(available_attendants, 1))::int];

  UPDATE bookings
  SET assigned_to = selected_attendant,
      assignment_date = booking_date
  WHERE id = booking_id;

  RETURN selected_attendant;
END;
$$;

-- ============================================================
-- FUNÇÃO E TRIGGER: handle_new_user
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role text;
BEGIN
  user_role := COALESCE(NEW.raw_app_meta_data->>'role', 'attendant');
  
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- DADOS INICIAIS
-- ============================================================

INSERT INTO working_hours (day_of_week, start_time, end_time, enabled)
VALUES 
  (0, '09:00', '18:00', false),
  (1, '09:00', '18:00', true),
  (2, '09:00', '18:00', true),
  (3, '09:00', '18:00', true),
  (4, '09:00', '18:00', true),
  (5, '09:00', '18:00', true),
  (6, '09:00', '18:00', false)
ON CONFLICT (day_of_week) DO NOTHING;

INSERT INTO availability_settings (days_of_week, start_time, end_time, slot_duration)
SELECT '{1,2,3,4,5}', '09:00', '18:00', 30
WHERE NOT EXISTS (SELECT 1 FROM availability_settings LIMIT 1);

INSERT INTO system_settings (setting_key, setting_value)
VALUES ('total_attendants', '0')
ON CONFLICT (setting_key) DO NOTHING;