-- ============================================
-- Script 78: Kanban + Gates - Triggers
-- ============================================
-- Triggers para marcar cálculo como desatualizado e criar auditoria

-- ============================================
-- 1. TRIGGER: Marcar cálculo desatualizado quando item muda
-- ============================================

CREATE OR REPLACE FUNCTION trigger_marcar_calculo_desatualizado()
RETURNS TRIGGER AS $$
DECLARE
  v_status_kanban VARCHAR(50);
BEGIN
  -- Buscar status atual do precatório
  SELECT status_kanban INTO v_status_kanban
  FROM public.precatorios
  WHERE id = NEW.precatorio_id;

  -- Se o precatório já passou do cálculo concluído
  IF v_status_kanban IN ('calculo_concluido', 'proposta_negociacao') THEN
    -- Se um item voltou para PENDENTE, INCOMPLETO ou VENCIDO
    IF NEW.status_item IN ('PENDENTE', 'INCOMPLETO', 'VENCIDO') 
       AND (OLD.status_item IS NULL OR OLD.status_item != NEW.status_item) THEN
      
      -- Marcar cálculo como desatualizado
      UPDATE public.precatorios
      SET calculo_desatualizado = true,
          updated_at = NOW()
      WHERE id = NEW.precatorio_id;

      -- Criar auditoria
      INSERT INTO public.precatorio_auditoria (
        precatorio_id,
        acao,
        de,
        para,
        payload_json,
        user_id
      ) VALUES (
        NEW.precatorio_id,
        'CALCULO_DESATUALIZADO',
        OLD.status_item,
        NEW.status_item,
        jsonb_build_object(
          'item_tipo', NEW.tipo_grupo,
          'item_nome', NEW.nome_item,
          'motivo', 'Item mudou de status'
        ),
        auth.uid()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_item_marcar_calculo_desatualizado ON public.precatorio_itens;
CREATE TRIGGER trigger_item_marcar_calculo_desatualizado
  AFTER UPDATE ON public.precatorio_itens
  FOR EACH ROW
  EXECUTE FUNCTION trigger_marcar_calculo_desatualizado();

-- ============================================
-- 2. TRIGGER: Auditoria de movimentação de coluna
-- ============================================

CREATE OR REPLACE FUNCTION trigger_auditar_movimentacao_kanban()
RETURNS TRIGGER AS $$
BEGIN
  -- Se mudou a coluna do kanban
  IF NEW.status_kanban IS DISTINCT FROM OLD.status_kanban THEN
    INSERT INTO public.precatorio_auditoria (
      precatorio_id,
      acao,
      de,
      para,
      payload_json,
      user_id
    ) VALUES (
      NEW.id,
      'MOVE_COLUNA',
      OLD.status_kanban,
      NEW.status_kanban,
      jsonb_build_object(
        'interesse_status', NEW.interesse_status,
        'calculo_desatualizado', NEW.calculo_desatualizado
      ),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_precatorio_auditar_movimentacao ON public.precatorios;
CREATE TRIGGER trigger_precatorio_auditar_movimentacao
  AFTER UPDATE ON public.precatorios
  FOR EACH ROW
  WHEN (OLD.status_kanban IS DISTINCT FROM NEW.status_kanban)
  EXECUTE FUNCTION trigger_auditar_movimentacao_kanban();

-- ============================================
-- 3. TRIGGER: Auditoria de mudança de interesse
-- ============================================

CREATE OR REPLACE FUNCTION trigger_auditar_mudanca_interesse()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.interesse_status IS DISTINCT FROM OLD.interesse_status THEN
    INSERT INTO public.precatorio_auditoria (
      precatorio_id,
      acao,
      de,
      para,
      payload_json,
      user_id
    ) VALUES (
      NEW.id,
      'UPDATE_INTERESSE',
      OLD.interesse_status,
      NEW.interesse_status,
      jsonb_build_object(
        'observacao', NEW.interesse_observacao
      ),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_precatorio_auditar_interesse ON public.precatorios;
CREATE TRIGGER trigger_precatorio_auditar_interesse
  AFTER UPDATE ON public.precatorios
  FOR EACH ROW
  WHEN (OLD.interesse_status IS DISTINCT FROM NEW.interesse_status)
  EXECUTE FUNCTION trigger_auditar_mudanca_interesse();

-- ============================================
-- 4. TRIGGER: Auditoria de parecer jurídico
-- ============================================

CREATE OR REPLACE FUNCTION trigger_auditar_parecer_juridico()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.juridico_parecer_status IS DISTINCT FROM OLD.juridico_parecer_status THEN
    INSERT INTO public.precatorio_auditoria (
      precatorio_id,
      acao,
      de,
      para,
      payload_json,
      user_id
    ) VALUES (
      NEW.id,
      'PARECER_JURIDICO',
      OLD.juridico_parecer_status,
      NEW.juridico_parecer_status,
      jsonb_build_object(
        'motivo', NEW.juridico_motivo,
        'parecer_texto', NEW.juridico_parecer_texto
      ),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_precatorio_auditar_juridico ON public.precatorios;
CREATE TRIGGER trigger_precatorio_auditar_juridico
  AFTER UPDATE ON public.precatorios
  FOR EACH ROW
  WHEN (OLD.juridico_parecer_status IS DISTINCT FROM NEW.juridico_parecer_status)
  EXECUTE FUNCTION trigger_auditar_parecer_juridico();

-- ============================================
-- 5. TRIGGER: Auditoria de upload de item
-- ============================================

CREATE OR REPLACE FUNCTION trigger_auditar_upload_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Se mudou o arquivo_url (upload)
  IF NEW.arquivo_url IS DISTINCT FROM OLD.arquivo_url AND NEW.arquivo_url IS NOT NULL THEN
    INSERT INTO public.precatorio_auditoria (
      precatorio_id,
      acao,
      de,
      para,
      payload_json,
      user_id
    ) VALUES (
      NEW.precatorio_id,
      'UPLOAD_DOC',
      OLD.arquivo_url,
      NEW.arquivo_url,
      jsonb_build_object(
        'tipo_grupo', NEW.tipo_grupo,
        'nome_item', NEW.nome_item,
        'status_item', NEW.status_item
      ),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_item_auditar_upload ON public.precatorio_itens;
CREATE TRIGGER trigger_item_auditar_upload
  AFTER UPDATE ON public.precatorio_itens
  FOR EACH ROW
  WHEN (OLD.arquivo_url IS DISTINCT FROM NEW.arquivo_url)
  EXECUTE FUNCTION trigger_auditar_upload_item();

-- ============================================
-- 6. TRIGGER: Detectar certidão vencida automaticamente
-- ============================================

CREATE OR REPLACE FUNCTION trigger_detectar_certidao_vencida()
RETURNS TRIGGER AS $$
BEGIN
  -- Se é uma certidão com validade
  IF NEW.tipo_grupo = 'CERTIDAO' AND NEW.validade IS NOT NULL THEN
    -- Se a validade passou e status ainda é RECEBIDO
    IF NEW.validade < CURRENT_DATE AND NEW.status_item = 'RECEBIDO' THEN
      NEW.status_item := 'VENCIDO';
      NEW.observacao := COALESCE(NEW.observacao || E'\n', '') || 
                        'Certidão vencida automaticamente em ' || CURRENT_DATE::TEXT;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_item_detectar_vencimento ON public.precatorio_itens;
CREATE TRIGGER trigger_item_detectar_vencimento
  BEFORE UPDATE ON public.precatorio_itens
  FOR EACH ROW
  EXECUTE FUNCTION trigger_detectar_certidao_vencida();

-- ============================================
-- 7. FUNÇÃO: Verificar certidões vencidas (executar periodicamente)
-- ============================================

CREATE OR REPLACE FUNCTION verificar_certidoes_vencidas()
RETURNS TABLE(
  precatorio_id UUID,
  item_id UUID,
  nome_item VARCHAR,
  validade DATE,
  dias_vencido INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pi.precatorio_id,
    pi.id as item_id,
    pi.nome_item,
    pi.validade,
    (CURRENT_DATE - pi.validade)::INTEGER as dias_vencido
  FROM public.precatorio_itens pi
  WHERE pi.tipo_grupo = 'CERTIDAO'
    AND pi.validade IS NOT NULL
    AND pi.validade < CURRENT_DATE
    AND pi.status_item = 'RECEBIDO'
  ORDER BY pi.validade ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION verificar_certidoes_vencidas TO authenticated;

-- ============================================
-- SUCESSO
-- ============================================

SELECT 'Script 78 executado com sucesso! Triggers de auditoria e cálculo desatualizado criados.' as status;
