-- ============================================================================
-- Script 192: Permitir "apagar mensagem" no chat (mantendo placeholder)
-- ============================================================================
-- Objetivo:
-- - Permitir que o REMETENTE possa atualizar sua própria mensagem para marcar
--   como apagada (sem remover o registro).
-- - Manter o comportamento atual de "marcar como lida" pelo DESTINATARIO.
--
-- Observacao:
-- - O frontend usa o marcador "__MENSAGEM_APAGADA__" no campo `texto` e limpa os
--   campos de arquivo (arquivo_* = NULL).
-- - Este script cria uma policy de UPDATE mais ampla (remetente OU destinatario)
--   e adiciona um trigger para restringir o que pode ser alterado.
-- ============================================================================

BEGIN;

-- 1) Policy de UPDATE: permitir remetente OU destinatario (o trigger restringe o que pode mudar)
DROP POLICY IF EXISTS chat_mensagens_update ON public.chat_mensagens;
CREATE POLICY chat_mensagens_update
  ON public.chat_mensagens FOR UPDATE
  USING (
    remetente_id = auth.uid()
    OR destinatario_id = auth.uid()
  )
  WITH CHECK (
    remetente_id = auth.uid()
    OR destinatario_id = auth.uid()
  );

-- 2) Trigger: restringir updates para evitar edicao livre das mensagens
CREATE OR REPLACE FUNCTION public.restrict_chat_mensagens_update()
RETURNS TRIGGER AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  -- Destinatario: pode somente alterar `lida` (e `updated_at` via trigger existente).
  IF uid IS NOT NULL AND uid = OLD.destinatario_id THEN
    IF NEW.remetente_id <> OLD.remetente_id
      OR NEW.destinatario_id <> OLD.destinatario_id
      OR NEW.precatorio_id IS DISTINCT FROM OLD.precatorio_id
      OR NEW.texto <> OLD.texto
      OR NEW.arquivo_url IS DISTINCT FROM OLD.arquivo_url
      OR NEW.arquivo_nome IS DISTINCT FROM OLD.arquivo_nome
      OR NEW.arquivo_tipo IS DISTINCT FROM OLD.arquivo_tipo
      OR NEW.arquivo_tamanho IS DISTINCT FROM OLD.arquivo_tamanho
      OR NEW.created_at <> OLD.created_at
    THEN
      RAISE EXCEPTION 'Somente marcar como lida e permitido.';
    END IF;

    RETURN NEW;
  END IF;

  -- Remetente: pode somente "apagar" (marcar placeholder + limpar anexo).
  IF uid IS NOT NULL AND uid = OLD.remetente_id THEN
    IF NEW.remetente_id = OLD.remetente_id
      AND NEW.destinatario_id = OLD.destinatario_id
      AND NEW.precatorio_id IS NOT DISTINCT FROM OLD.precatorio_id
      AND NEW.created_at = OLD.created_at
      AND NEW.lida = OLD.lida
      AND NEW.texto = '__MENSAGEM_APAGADA__'
      AND NEW.arquivo_url IS NULL
      AND NEW.arquivo_nome IS NULL
      AND NEW.arquivo_tipo IS NULL
      AND NEW.arquivo_tamanho IS NULL
    THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Somente apagar a mensagem e permitido.';
  END IF;

  RAISE EXCEPTION 'Sem permissao para alterar a mensagem.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS restrict_chat_mensagens_update ON public.chat_mensagens;
CREATE TRIGGER restrict_chat_mensagens_update
  BEFORE UPDATE ON public.chat_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.restrict_chat_mensagens_update();

COMMIT;

