BEGIN;

ALTER TABLE public.atendimento_tentativas
  ADD COLUMN IF NOT EXISTS contato_nome TEXT,
  ADD COLUMN IF NOT EXISTS contato_telefone TEXT,
  ADD COLUMN IF NOT EXISTS interesse_receber_proposta BOOLEAN;

ALTER TABLE public.atendimento_tentativas
  DROP CONSTRAINT IF EXISTS atendimento_tentativas_interesse_dados_check;

-- NOT VALID: a regra passa a valer para todo INSERT/UPDATE a partir daqui,
-- sem rejeitar tentativas 'interessado' já gravadas antes da criação destas
-- colunas (dados de contato inexistentes no histórico, impossíveis de backfill).
ALTER TABLE public.atendimento_tentativas
  ADD CONSTRAINT atendimento_tentativas_interesse_dados_check
  CHECK (
    resultado <> 'interessado'
    OR (
      contato_nome IS NOT NULL
      AND btrim(contato_nome) <> ''
      AND contato_telefone IS NOT NULL
      AND btrim(contato_telefone) <> ''
      AND interesse_receber_proposta IS NOT NULL
    )
  ) NOT VALID;

COMMENT ON COLUMN public.atendimento_tentativas.contato_nome IS
  'Nome de quem recebeu a chamada no atendimento quando o credor demonstra interesse.';

COMMENT ON COLUMN public.atendimento_tentativas.contato_telefone IS
  'Telefone confirmado durante o contato do atendimento.';

COMMENT ON COLUMN public.atendimento_tentativas.interesse_receber_proposta IS
  'Confirma se o credor deseja receber proposta comercial.';

COMMIT;
