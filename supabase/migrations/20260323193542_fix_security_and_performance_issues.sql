/*
  # Correção de Problemas de Segurança e Performance

  1. Índices
    - Adiciona índice para foreign key `assigned_to` em `bookings`
    - Remove índices não utilizados

  2. Otimização de RLS Policies
    - Substitui `auth.uid()` por `(select auth.uid())` em todas as policies
    - Substitui `auth.jwt()` por `(select auth.jwt())` em todas as policies
    - Remove policies duplicadas
    - Corrige policies que sempre retornam true
    - Remove referências a `user_metadata` (inseguro)

  3. Segurança
    - Restringe INSERT policies para validar dados apropriadamente
    - Usa apenas `app_metadata` para autorização (não editável pelo usuário)

  4. Notas Importantes
    - Performance melhorada significativamente em queries
    - Segurança reforçada em todas as tabelas
    - Políticas duplicadas consolidadas
*/

-- ============================================================
-- 1. ADICIONAR ÍNDICE PARA FOREIGN KEY
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bookings_assigned_to ON bookings(assigned_to);

-- ============================================================
-- 2. REMOVER ÍNDICES NÃO UTILIZADOS
-- ============================================================

DROP INDEX IF EXISTS idx_blocked_times_date;
DROP INDEX IF EXISTS idx_system_settings_updated_by;

-- ============================================================
-- 3. LIMPAR E RECRIAR POLICIES DA TABELA BOOKINGS
-- ============================================================

DROP POLICY IF EXISTS "Atendentes podem ver seus próprios agendamentos" ON bookings;
DROP POLICY IF EXISTS "Attendants can view assigned bookings" ON bookings;
DROP POLICY IF EXISTS "Managers can delete bookings" ON bookings;
DROP POLICY IF EXISTS "Managers can update bookings" ON bookings;
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON bookings;
DROP POLICY IF EXISTS "Public can create bookings" ON bookings;
DROP POLICY IF EXISTS "Public can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Managers can view all bookings" ON bookings;

CREATE POLICY "Attendants can view their bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (assigned_to = (select auth.uid()));

CREATE POLICY "Managers can view all bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager');

CREATE POLICY "Managers can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager')
  WITH CHECK ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager');

CREATE POLICY "Managers can delete bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING ((select (auth.jwt()->>'app_metadata')::jsonb->>'role') = 'manager');

CREATE POLICY "Public can create bookings"
  ON bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    client_name IS NOT NULL 
    AND client_email IS NOT NULL 
    AND client_phone IS NOT NULL
    AND date IS NOT NULL 
    AND time IS NOT NULL
  );

-- ============================================================
-- 4. LIMPAR E RECRIAR POLICIES DA TABELA WORKING_HOURS
-- ============================================================

DROP POLICY IF EXISTS "Managers can delete working hours" ON working_hours;
DROP POLICY IF EXISTS "Managers can insert working hours" ON working_hours;
DROP POLICY IF EXISTS "Managers can update working hours" ON working_hours;

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
-- 5. LIMPAR E RECRIAR POLICIES DA TABELA BLOCKED_TIMES
-- ============================================================

DROP POLICY IF EXISTS "Managers can delete blocked times" ON blocked_times;
DROP POLICY IF EXISTS "Managers can insert blocked times" ON blocked_times;
DROP POLICY IF EXISTS "Managers can update blocked times" ON blocked_times;

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
-- 6. LIMPAR E RECRIAR POLICIES DA TABELA PROFILES
-- ============================================================

DROP POLICY IF EXISTS "Managers can delete profiles via JWT" ON profiles;
DROP POLICY IF EXISTS "Managers can insert profiles via JWT" ON profiles;
DROP POLICY IF EXISTS "Managers can update profiles via JWT" ON profiles;
DROP POLICY IF EXISTS "Managers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile safe" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON profiles;

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
-- 7. LIMPAR E RECRIAR POLICIES DA TABELA SYSTEM_SETTINGS
-- ============================================================

DROP POLICY IF EXISTS "Manager Admin pode atualizar configurações" ON system_settings;
DROP POLICY IF EXISTS "Manager Admin pode inserir configurações" ON system_settings;
DROP POLICY IF EXISTS "Managers can delete settings" ON system_settings;
DROP POLICY IF EXISTS "Managers can insert settings" ON system_settings;
DROP POLICY IF EXISTS "Managers can update settings" ON system_settings;

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
-- 8. LIMPAR E RECRIAR POLICIES DA TABELA AVAILABILITY_SETTINGS
-- ============================================================

DROP POLICY IF EXISTS "Public can read availability settings" ON availability_settings;
DROP POLICY IF EXISTS "Public can view availability settings" ON availability_settings;
DROP POLICY IF EXISTS "Managers can delete availability settings" ON availability_settings;
DROP POLICY IF EXISTS "Managers can insert availability settings" ON availability_settings;
DROP POLICY IF EXISTS "Managers can update availability settings" ON availability_settings;

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
