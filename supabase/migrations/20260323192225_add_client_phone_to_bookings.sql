/*
  # Adicionar campo de telefone aos agendamentos

  1. Alterações na tabela `bookings`
    - Adiciona coluna `client_phone` (text) para armazenar telefone/WhatsApp do cliente
    - Remove obrigatoriedade do campo `reason` (torna nullable)

  2. Notas Importantes
    - O campo `client_phone` é obrigatório para novos agendamentos
    - O campo `reason` passa a ser opcional
    - Dados existentes são preservados
*/

-- Adiciona coluna de telefone
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'client_phone'
  ) THEN
    ALTER TABLE bookings ADD COLUMN client_phone text;
  END IF;
END $$;

-- Torna o campo reason nullable (opcional)
ALTER TABLE bookings ALTER COLUMN reason DROP NOT NULL;
