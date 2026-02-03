-- ============================================================================
-- Script 182: Enriquecer notificacoes com nome e status do precatorio
-- ============================================================================

BEGIN;

ALTER TABLE public.notificacoes
  ADD COLUMN IF NOT EXISTS precatorio_nome TEXT,
  ADD COLUMN IF NOT EXISTS precatorio_status TEXT;

-- Atualiza a funcao de notificacao de precatorios para salvar nome e status
CREATE OR REPLACE FUNCTION public.notify_precatorio_update()
RETURNS TRIGGER AS $$
DECLARE
  actor UUID := auth.uid();
  v_nome TEXT;
  v_status TEXT;
BEGIN
  v_nome := COALESCE(
    NULLIF(NEW.titulo, ''),
    NULLIF(NEW.numero_precatorio, ''),
    NULLIF(NEW.credor_nome, ''),
    'Precatorio'
  );

  v_status := COALESCE(
    NULLIF(NEW.status_kanban, ''),
    NULLIF(NEW.localizacao_kanban, ''),
    NULLIF(NEW.status, '')
  );

  INSERT INTO public.notificacoes (
    usuario_id,
    precatorio_id,
    tipo,
    mensagem,
    lida,
    precatorio_nome,
    precatorio_status
  )
  SELECT DISTINCT
    u,
    NEW.id,
    'precatorio_atualizado',
    'Precatorio atualizado',
    false,
    v_nome,
    v_status
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

-- Atualiza a funcao de notificacao do chat para salvar nome e status
CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  v_nome TEXT;
  v_status TEXT;
BEGIN
  IF NEW.precatorio_id IS NOT NULL THEN
    SELECT
      COALESCE(
        NULLIF(titulo, ''),
        NULLIF(numero_precatorio, ''),
        NULLIF(credor_nome, ''),
        'Precatorio'
      ),
      COALESCE(
        NULLIF(status_kanban, ''),
        NULLIF(localizacao_kanban, ''),
        NULLIF(status, '')
      )
    INTO v_nome, v_status
    FROM public.precatorios
    WHERE id = NEW.precatorio_id;
  END IF;

  INSERT INTO public.notificacoes (
    usuario_id,
    precatorio_id,
    tipo,
    mensagem,
    lida,
    precatorio_nome,
    precatorio_status
  )
  VALUES (
    NEW.destinatario_id,
    NEW.precatorio_id,
    'mensagem_recebida',
    'Nova mensagem recebida',
    false,
    v_nome,
    v_status
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Backfill para notificacoes existentes
UPDATE public.notificacoes n
SET
  precatorio_nome = COALESCE(
    NULLIF(p.titulo, ''),
    NULLIF(p.numero_precatorio, ''),
    NULLIF(p.credor_nome, ''),
    'Precatorio'
  ),
  precatorio_status = COALESCE(
    NULLIF(p.status_kanban, ''),
    NULLIF(p.localizacao_kanban, ''),
    NULLIF(p.status, '')
  )
FROM public.precatorios p
WHERE n.precatorio_id = p.id
  AND (n.precatorio_nome IS NULL OR n.precatorio_status IS NULL);

COMMIT;

SELECT 'Script 182 executado com sucesso! Notificacoes enriquecidas.' as status;
