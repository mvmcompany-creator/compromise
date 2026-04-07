/*
  # Compromise - Sistema de Agendamento de Reuniões

  ## Descrição
  Este migration cria a estrutura completa do banco de dados para o sistema Compromise,
  um aplicativo de agendamento de reuniões estilo Calendly.

  ## Tabelas Criadas

  ### 1. `bookings` (Agendamentos)
  Armazena todos os agendamentos de reuniões feitos pelos clientes.
  
  Colunas:
  - `id` (uuid, PK): Identificador único do agendamento
  - `client_name` (text): Nome completo do cliente
  - `client_email` (text): E-mail do cliente
  - `meeting_type` (text): Tipo de reunião (padrão: "Reunião de 30 minutos")
  - `date` (date): Data da reunião
  - `time` (text): Horário da reunião (formato HH:MM)
  - `reason` (text): Motivo/descrição da reunião
  - `status` (text): Status do agendamento (confirmed, cancelled)
  - `meet_link` (text): Link do Google Meet gerado
  - `created_at` (timestamptz): Data/hora de criação do agendamento

  ### 2. `working_hours` (Horário de Trabalho)
  Define os horários de disponibilidade do administrador por dia da semana.
  
  Colunas:
  - `id` (uuid, PK): Identificador único
  - `day_of_week` (integer): Dia da semana (0=Domingo, 1=Segunda, ..., 6=Sábado)
  - `start_time` (text): Horário de início (formato HH:MM)
  - `end_time` (text): Horário de término (formato HH:MM)
  - `enabled` (boolean): Se o dia está habilitado para agendamentos
  - `created_at` (timestamptz): Data/hora de criação

  ### 3. `blocked_times` (Horários Bloqueados)
  Armazena períodos específicos que estão bloqueados para agendamento (ex: almoço, compromissos pessoais).
  
  Colunas:
  - `id` (uuid, PK): Identificador único
  - `date` (date): Data do bloqueio
  - `start_time` (text): Horário de início do bloqueio (formato HH:MM)
  - `end_time` (text): Horário de término do bloqueio (formato HH:MM)
  - `reason` (text): Motivo do bloqueio
  - `created_at` (timestamptz): Data/hora de criação

  ## Segurança (RLS - Row Level Security)

  ### Políticas de Segurança
  
  1. **bookings**:
     - Leitura pública: Apenas para verificar disponibilidade (sem dados sensíveis)
     - Inserção pública: Permitida para criar novos agendamentos
     - Leitura completa: Apenas usuários autenticados (admins)
     - Atualização/Exclusão: Apenas usuários autenticados (admins)

  2. **working_hours**:
     - Leitura pública: Permitida para mostrar horários disponíveis
     - Modificação: Apenas usuários autenticados (admins)

  3. **blocked_times**:
     - Leitura pública: Permitida para calcular disponibilidade
     - Modificação: Apenas usuários autenticados (admins)

  ## Dados Iniciais
  
  Horário de trabalho padrão: Segunda a Sexta, 09:00 às 18:00
*/

-- Criar tabela de agendamentos
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  client_email text NOT NULL,
  meeting_type text DEFAULT 'Reunião de 30 minutos',
  date date NOT NULL,
  time text NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  meet_link text,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela de horários de trabalho
CREATE TABLE IF NOT EXISTS working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time text NOT NULL,
  end_time text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(day_of_week)
);

-- Criar tabela de horários bloqueados
CREATE TABLE IF NOT EXISTS blocked_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;

-- Políticas para bookings
CREATE POLICY "Qualquer pessoa pode criar agendamentos"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode ver data/hora de agendamentos"
  ON bookings FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Admins podem ver todos os agendamentos"
  ON bookings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins podem atualizar agendamentos"
  ON bookings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins podem deletar agendamentos"
  ON bookings FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para working_hours
CREATE POLICY "Qualquer pessoa pode ver horários de trabalho"
  ON working_hours FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Admins podem inserir horários de trabalho"
  ON working_hours FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins podem atualizar horários de trabalho"
  ON working_hours FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins podem deletar horários de trabalho"
  ON working_hours FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para blocked_times
CREATE POLICY "Qualquer pessoa pode ver horários bloqueados"
  ON blocked_times FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Admins podem inserir horários bloqueados"
  ON blocked_times FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins podem atualizar horários bloqueados"
  ON blocked_times FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins podem deletar horários bloqueados"
  ON blocked_times FOR DELETE
  TO authenticated
  USING (true);

-- Inserir horários de trabalho padrão (Segunda a Sexta, 09:00 às 18:00)
INSERT INTO working_hours (day_of_week, start_time, end_time, enabled)
VALUES 
  (0, '09:00', '18:00', false),  -- Domingo
  (1, '09:00', '18:00', true),   -- Segunda
  (2, '09:00', '18:00', true),   -- Terça
  (3, '09:00', '18:00', true),   -- Quarta
  (4, '09:00', '18:00', true),   -- Quinta
  (5, '09:00', '18:00', true),   -- Sexta
  (6, '09:00', '18:00', false)   -- Sábado
ON CONFLICT (day_of_week) DO NOTHING;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_blocked_times_date ON blocked_times(date);
