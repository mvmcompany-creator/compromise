/*
  # Sistema de Usuários e Distribuição Automática

  ## Descrição
  Adiciona sistema completo de múltiplos usuários (atendentes), roles, limites diários
  e distribuição automática de agendamentos.

  ## Novas Tabelas

  ### 1. `profiles` (Perfis de Usuário)
  Estende a tabela de autenticação do Supabase com informações adicionais.
  
  Colunas:
  - `id` (uuid, PK, FK para auth.users): ID do usuário autenticado
  - `email` (text): E-mail do usuário
  - `full_name` (text): Nome completo
  - `role` (text): Papel do usuário (manager_admin, attendant)
  - `is_active` (boolean): Se o usuário está ativo
  - `daily_limit` (integer): Limite de atendimentos por dia (NULL para managers)
  - `google_connected` (boolean): Se conectou conta Google
  - `google_refresh_token` (text): Token de refresh do Google OAuth
  - `google_email` (text): E-mail da conta Google conectada
  - `created_at` (timestamptz): Data de criação
  - `updated_at` (timestamptz): Última atualização

  ### 2. `system_settings` (Configurações do Sistema)
  Armazena configurações globais definidas pelo Manager Admin.
  
  Colunas:
  - `id` (uuid, PK): Identificador único
  - `setting_key` (text, unique): Chave da configuração
  - `setting_value` (text): Valor da configuração (JSON)
  - `updated_by` (uuid, FK): ID do admin que atualizou
  - `updated_at` (timestamptz): Data da atualização

  ## Modificações em Tabelas Existentes

  ### `bookings` (Agendamentos)
  Adicionar novas colunas:
  - `assigned_to` (uuid, FK): ID do usuário atribuído
  - `assignment_date` (date): Data do atendimento (para controle de limite diário)

  ## Segurança (RLS)

  ### Políticas de Segurança
  
  1. **profiles**:
     - Leitura: Usuários autenticados podem ver todos os perfis
     - Atualização própria: Usuários podem atualizar seus próprios dados
     - Atualização completa: Apenas manager_admin
     - Inserção: Apenas manager_admin

  2. **system_settings**:
     - Leitura: Todos os autenticados
     - Modificação: Apenas manager_admin

  ## Funções Auxiliares

  ### `assign_booking_to_attendant()`
  Função que distribui automaticamente um agendamento para um atendente disponível:
  - Verifica atendentes ativos
  - Verifica limites diários
  - Seleciona aleatoriamente entre os disponíveis
  - Atualiza o agendamento com o atendente escolhido

  ## Dados Iniciais
  
  Configuração padrão do sistema
*/

-- Criar tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('manager_admin', 'attendant')),
  is_active boolean DEFAULT true,
  daily_limit integer,
  google_connected boolean DEFAULT false,
  google_refresh_token text,
  google_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar colunas à tabela bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE bookings ADD COLUMN assigned_to uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'assignment_date'
  ) THEN
    ALTER TABLE bookings ADD COLUMN assignment_date date;
  END IF;
END $$;

-- Habilitar RLS nas novas tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Usuários autenticados podem ver perfis"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Manager Admin pode inserir perfis"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'manager_admin'
    )
  );

CREATE POLICY "Manager Admin pode atualizar qualquer perfil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'manager_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'manager_admin'
    )
  );

CREATE POLICY "Manager Admin pode deletar perfis"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'manager_admin'
    )
  );

-- Políticas para system_settings
CREATE POLICY "Usuários autenticados podem ver configurações"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Manager Admin pode inserir configurações"
  ON system_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'manager_admin'
    )
  );

CREATE POLICY "Manager Admin pode atualizar configurações"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'manager_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'manager_admin'
    )
  );

-- Atualizar políticas de bookings para incluir assigned_to
CREATE POLICY "Atendentes podem ver seus próprios agendamentos"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'manager_admin'
    )
  );

-- Função para distribuir agendamento automaticamente
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
  -- Buscar atendentes ativos que ainda não atingiram o limite diário
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

  -- Se não houver atendentes disponíveis, retornar NULL
  IF array_length(available_attendants, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  -- Selecionar um atendente aleatoriamente
  selected_attendant := available_attendants[1 + floor(random() * array_length(available_attendants, 1))::int];

  -- Atualizar o agendamento
  UPDATE bookings
  SET assigned_to = selected_attendant,
      assignment_date = booking_date
  WHERE id = booking_id;

  RETURN selected_attendant;
END;
$$;

-- Trigger para criar profile automaticamente quando usuário é criado
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'attendant')
  );
  RETURN NEW;
END;
$$;

-- Criar trigger se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_to ON bookings(assigned_to);
CREATE INDEX IF NOT EXISTS idx_bookings_assignment_date ON bookings(assignment_date);

-- Inserir configuração padrão
INSERT INTO system_settings (setting_key, setting_value)
VALUES ('total_attendants', '0')
ON CONFLICT (setting_key) DO NOTHING;
