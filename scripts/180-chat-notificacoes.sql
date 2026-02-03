-- ============================================================================
-- Script 180: Chat interno + notificacoes automaticas
-- ============================================================================
-- Cria tabela de chat, ajustes em notificacoes e triggers para:
-- - Atualizacoes de precatorios
-- - Mensagens recebidas no chat
-- ============================================================================
-- Observacao: por padrao o chat usa o bucket "precatorios-pdf".
-- Se quiser separar, crie um bucket "chat-anexos" e defina
-- NEXT_PUBLIC_CHAT_BUCKET=chat-anexos no .env.local.

BEGIN;

-- ============================================================================
-- 1. CHAT: TABELA + RLS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remetente_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
  destinatario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
  precatorio_id UUID REFERENCES public.precatorios(id) ON DELETE SET NULL,
  texto TEXT NOT NULL,
  arquivo_url TEXT,
  arquivo_nome TEXT,
  arquivo_tipo TEXT,
  arquivo_tamanho BIGINT,
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_mensagens
  ADD COLUMN IF NOT EXISTS arquivo_url TEXT,
  ADD COLUMN IF NOT EXISTS arquivo_nome TEXT,
  ADD COLUMN IF NOT EXISTS arquivo_tipo TEXT,
  ADD COLUMN IF NOT EXISTS arquivo_tamanho BIGINT;

DROP TRIGGER IF EXISTS update_chat_mensagens_updated_at ON public.chat_mensagens;
CREATE TRIGGER update_chat_mensagens_updated_at
  BEFORE UPDATE ON public.chat_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.chat_mensagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_mensagens_select ON public.chat_mensagens;
CREATE POLICY chat_mensagens_select
  ON public.chat_mensagens FOR SELECT
  USING (
    remetente_id = auth.uid()
    OR destinatario_id = auth.uid()
  );

DROP POLICY IF EXISTS chat_mensagens_insert ON public.chat_mensagens;
CREATE POLICY chat_mensagens_insert
  ON public.chat_mensagens FOR INSERT
  WITH CHECK (
    remetente_id = auth.uid()
  );

DROP POLICY IF EXISTS chat_mensagens_update ON public.chat_mensagens;
CREATE POLICY chat_mensagens_update
  ON public.chat_mensagens FOR UPDATE
  USING (
    destinatario_id = auth.uid()
  )
  WITH CHECK (
    destinatario_id = auth.uid()
  );

CREATE INDEX IF NOT EXISTS idx_chat_mensagens_destinatario_lida
  ON public.chat_mensagens(destinatario_id, lida);

CREATE INDEX IF NOT EXISTS idx_chat_mensagens_remetente
  ON public.chat_mensagens(remetente_id);

CREATE INDEX IF NOT EXISTS idx_chat_mensagens_destinatario
  ON public.chat_mensagens(destinatario_id);

CREATE INDEX IF NOT EXISTS idx_chat_mensagens_created_at
  ON public.chat_mensagens(created_at DESC);

-- ============================================================================
-- 2. NOTIFICACOES: TIPOS NOVOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
  precatorio_id UUID REFERENCES public.precatorios(id) ON DELETE CASCADE,
  tipo TEXT,
  mensagem TEXT,
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notificacoes
  ALTER COLUMN precatorio_id DROP NOT NULL;

DROP TRIGGER IF EXISTS update_notificacoes_updated_at ON public.notificacoes;
CREATE TRIGGER update_notificacoes_updated_at
  BEFORE UPDATE ON public.notificacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notificacoes_admin_select ON public.notificacoes;
DROP POLICY IF EXISTS notificacoes_owner_select ON public.notificacoes;
DROP POLICY IF EXISTS notificacoes_insert ON public.notificacoes;
DROP POLICY IF EXISTS notificacoes_owner_update ON public.notificacoes;
DROP POLICY IF EXISTS notificacoes_admin_delete ON public.notificacoes;

CREATE POLICY notificacoes_admin_select
  ON public.notificacoes FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY notificacoes_owner_select
  ON public.notificacoes FOR SELECT
  USING (
    usuario_id = auth.uid()
  );

CREATE POLICY notificacoes_insert
  ON public.notificacoes FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY notificacoes_owner_update
  ON public.notificacoes FOR UPDATE
  USING (
    usuario_id = auth.uid()
  )
  WITH CHECK (
    usuario_id = auth.uid()
  );

CREATE POLICY notificacoes_admin_delete
  ON public.notificacoes FOR DELETE
  USING (
    (auth.jwt() ->> 'role') = 'admin'
  );

ALTER TABLE public.notificacoes
  DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;

ALTER TABLE public.notificacoes
  ADD CONSTRAINT notificacoes_tipo_check
  CHECK (
    tipo IN (
      'calculo_disponivel',
      'calculo_concluido',
      'proposta_enviada',
      'proposta_aceita',
      'precatorio_atualizado',
      'mensagem_recebida',
      'admin_aviso'
    )
  );

-- ============================================================================
-- 3. TRIGGER: NOTIFICAR ATUALIZACOES DE PRECATARIOS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_precatorio_update()
RETURNS TRIGGER AS $$
DECLARE
  actor UUID := auth.uid();
BEGIN
  INSERT INTO public.notificacoes (usuario_id, precatorio_id, tipo, mensagem, lida)
  SELECT DISTINCT u, NEW.id, 'precatorio_atualizado', 'Precatorio atualizado', false
  FROM unnest(ARRAY[
    NEW.dono_usuario_id,
    NEW.responsavel_calculo_id,
    NEW.criado_por,
    NEW.responsavel,
    NEW.operador_calculo
  ]) AS u
  WHERE u IS NOT NULL AND (actor IS NULL OR u <> actor);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_precatorio_update ON public.precatorios;
CREATE TRIGGER trigger_notify_precatorio_update
  AFTER UPDATE ON public.precatorios
  FOR EACH ROW EXECUTE FUNCTION public.notify_precatorio_update();

-- ============================================================================
-- 4. TRIGGER: NOTIFICAR MENSAGENS RECEBIDAS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notificacoes (usuario_id, precatorio_id, tipo, mensagem, lida)
  VALUES (NEW.destinatario_id, NEW.precatorio_id, 'mensagem_recebida', 'Nova mensagem recebida', false);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_chat_message ON public.chat_mensagens;
CREATE TRIGGER trigger_notify_chat_message
  AFTER INSERT ON public.chat_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.notify_chat_message();

COMMIT;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
