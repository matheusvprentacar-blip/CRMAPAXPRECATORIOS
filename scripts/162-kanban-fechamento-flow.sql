-- ==============================================================================
-- MIGRATION: 162-kanban-fechamento-flow.sql
-- PURPOSE: Update Kanban flow with proposta aceita + juridico unificado
-- ==============================================================================

BEGIN;

-- 1) Novos campos para aceite, certidões e fechamento
ALTER TABLE public.precatorios
  ADD COLUMN IF NOT EXISTS proposta_aceita BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_aceite_proposta DATE,
  ADD COLUMN IF NOT EXISTS proposta_aceita_id UUID,
  ADD COLUMN IF NOT EXISTS status_certidoes VARCHAR(30) DEFAULT 'nao_iniciado',
  ADD COLUMN IF NOT EXISTS juridico_resultado_final VARCHAR(30),
  ADD COLUMN IF NOT EXISTS juridico_liberou_fechamento BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pendencias_fechamento TEXT;

-- 2) Check constraint para status_certidoes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'precatorios_status_certidoes_check'
  ) THEN
    ALTER TABLE public.precatorios
      ADD CONSTRAINT precatorios_status_certidoes_check
      CHECK (status_certidoes IN (
        'nao_iniciado',
        'em_andamento',
        'concluido',
        'concluido_com_ressalvas'
      ));
  END IF;
END $$;

-- 2.1) Check constraint para juridico_resultado_final
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'precatorios_juridico_resultado_final_check'
  ) THEN
    ALTER TABLE public.precatorios
      ADD CONSTRAINT precatorios_juridico_resultado_final_check
      CHECK (
        juridico_resultado_final IN ('reprovado', 'nao_elegivel')
        OR juridico_resultado_final IS NULL
      );
  END IF;
END $$;

-- 3) Remover constraint antiga antes do backfill (evita bloqueio do update)
ALTER TABLE public.precatorios
  DROP CONSTRAINT IF EXISTS precatorios_status_kanban_check;

-- 4) Backfill: ajustar status antigos do jurÃ­dico
UPDATE public.precatorios
SET status_kanban = 'juridico',
    localizacao_kanban = 'juridico'
WHERE status_kanban = 'analise_juridica';

UPDATE public.precatorios
SET status_kanban = 'pronto_calculo',
    localizacao_kanban = 'pronto_calculo'
WHERE status_kanban = 'recalculo_pos_juridico';

-- 5) Recriar constraint de status_kanban com o novo fluxo
  ALTER TABLE public.precatorios
  ADD CONSTRAINT precatorios_status_kanban_check
  CHECK (status_kanban IN (
    'entrada',
    'triagem_interesse',
    'aguardando_oficio',
    'analise_processual_inicial',
    'docs_credor',
    'pronto_calculo',
    'calculo_andamento',
    'juridico',
    'calculo_concluido',
    'proposta_negociacao',
    'proposta_aceita',
    'certidoes',
    'fechado',
    'pos_fechamento',
    -- Paralelos
    'pausado_credor',
    'pausado_documentos',
    'sem_interesse',
    'reprovado'
  ));

-- 4) Gates novos
CREATE OR REPLACE FUNCTION validar_gate_proposta_aceita_para_certidoes(p_precatorio_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_proposta_aceita BOOLEAN;
  v_data_aceite DATE;
  v_proposta_aceita_id UUID;
  v_result JSONB;
BEGIN
  IF NOT public.current_user_has_role('juridico') THEN
    v_result := jsonb_build_object(
      'valido', false,
      'mensagem', 'Somente o Jurídico pode liberar de Jurídico de fechamento para Certidões.'
    );
    RETURN v_result;
  END IF;
  SELECT proposta_aceita, data_aceite_proposta, proposta_aceita_id
  INTO v_proposta_aceita, v_data_aceite, v_proposta_aceita_id
  FROM public.precatorios
  WHERE id = p_precatorio_id;

  IF v_proposta_aceita IS TRUE AND v_data_aceite IS NOT NULL AND v_proposta_aceita_id IS NOT NULL THEN
    v_result := jsonb_build_object(
      'valido', true,
      'mensagem', 'Gate aprovado: proposta aceita registrada.'
    );
  ELSE
    v_result := jsonb_build_object(
      'valido', false,
      'mensagem', 'Certidões só podem ser iniciadas após o aceite da proposta pelo credor.',
      'requisitos', jsonb_build_object(
        'proposta_aceita', v_proposta_aceita,
        'data_aceite_proposta', v_data_aceite,
        'proposta_aceita_id', v_proposta_aceita_id
      )
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION validar_gate_juridico_para_pronto(p_precatorio_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_status VARCHAR(50);
  v_texto TEXT;
  v_result JSONB;
BEGIN
  SELECT juridico_parecer_status, juridico_parecer_texto
  INTO v_status, v_texto
  FROM public.precatorios
  WHERE id = p_precatorio_id;

  IF v_status IS NULL OR v_texto IS NULL THEN
    v_result := jsonb_build_object(
      'valido', false,
      'mensagem', 'Parecer jurídico ainda não foi preenchido.'
    );
  ELSIF v_status = 'IMPEDIMENTO' THEN
    v_result := jsonb_build_object(
      'valido', false,
      'mensagem', 'Parecer indica impedimento. Mova para Reprovado/Não elegível.'
    );
  ELSE
    v_result := jsonb_build_object(
      'valido', true,
      'mensagem', 'Gate aprovado: parecer jurídico preenchido.'
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION validar_gate_juridico_para_reprovado(p_precatorio_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_status VARCHAR(50);
  v_result JSONB;
BEGIN
  SELECT juridico_parecer_status INTO v_status
  FROM public.precatorios
  WHERE id = p_precatorio_id;

  IF v_status = 'IMPEDIMENTO' THEN
    v_result := jsonb_build_object(
      'valido', true,
      'mensagem', 'Gate aprovado: impedimento registrado.'
    );
  ELSE
    v_result := jsonb_build_object(
      'valido', false,
      'mensagem', 'Para reprovado, informe impedimento no parecer jurídico.'
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) Atualizar validação de movimentação
CREATE OR REPLACE FUNCTION validar_movimentacao_kanban(
  p_precatorio_id UUID,
  p_coluna_destino VARCHAR(50)
)
RETURNS JSONB AS $$
DECLARE
  v_coluna_atual VARCHAR(50);
  v_validacao JSONB;
BEGIN
  SELECT status_kanban INTO v_coluna_atual
  FROM public.precatorios
  WHERE id = p_precatorio_id;

  CASE
    WHEN v_coluna_atual = 'triagem_interesse' AND p_coluna_destino = 'docs_credor' THEN
      v_validacao := validar_gate_triagem_para_docs(p_precatorio_id);

    WHEN v_coluna_atual = 'docs_credor' AND p_coluna_destino = 'pronto_calculo' THEN
      v_validacao := validar_gate_docs_para_certidoes(p_precatorio_id);

    WHEN v_coluna_atual = 'certidoes' AND p_coluna_destino = 'pronto_calculo' THEN
      v_validacao := validar_gate_certidoes_para_pronto(p_precatorio_id);

    WHEN v_coluna_atual = 'pronto_calculo' AND p_coluna_destino = 'calculo_andamento' THEN
      v_validacao := validar_gate_pronto_para_calculo(p_precatorio_id);

    WHEN v_coluna_atual = 'juridico' AND p_coluna_destino = 'pronto_calculo' THEN
      v_validacao := validar_gate_juridico_para_pronto(p_precatorio_id);

    WHEN v_coluna_atual = 'calculo_concluido' AND p_coluna_destino = 'proposta_negociacao' THEN
      v_validacao := validar_gate_concluido_para_proposta(p_precatorio_id);

    WHEN v_coluna_atual = 'proposta_aceita' AND p_coluna_destino = 'certidoes' THEN
      v_validacao := validar_gate_proposta_aceita_para_certidoes(p_precatorio_id);

    WHEN v_coluna_atual = 'juridico' AND p_coluna_destino = 'reprovado' THEN
      v_validacao := validar_gate_juridico_para_reprovado(p_precatorio_id);

    WHEN v_coluna_atual = 'calculo_andamento' AND p_coluna_destino = 'calculo_concluido' THEN
      v_validacao := validar_gate_recalculo_para_concluido(p_precatorio_id);

    ELSE
      v_validacao := jsonb_build_object(
        'valido', true,
        'mensagem', 'Movimentação permitida'
      );
  END CASE;

  RETURN v_validacao;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6) Auditoria automática (novos campos)
CREATE OR REPLACE FUNCTION trigger_auditar_proposta_aceita()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.proposta_aceita IS DISTINCT FROM OLD.proposta_aceita
     OR NEW.data_aceite_proposta IS DISTINCT FROM OLD.data_aceite_proposta
     OR NEW.proposta_aceita_id IS DISTINCT FROM OLD.proposta_aceita_id THEN
    INSERT INTO public.precatorio_auditoria (
      precatorio_id,
      acao,
      de,
      para,
      payload_json,
      user_id
    ) VALUES (
      NEW.id,
      'PROPOSTA_ACEITA',
      COALESCE(OLD.proposta_aceita::TEXT, 'null'),
      COALESCE(NEW.proposta_aceita::TEXT, 'null'),
      jsonb_build_object(
        'data_aceite_proposta', NEW.data_aceite_proposta,
        'proposta_aceita_id', NEW.proposta_aceita_id
      ),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_precatorio_auditar_proposta_aceita ON public.precatorios;
CREATE TRIGGER trigger_precatorio_auditar_proposta_aceita
  AFTER UPDATE ON public.precatorios
  FOR EACH ROW
  WHEN (
    OLD.proposta_aceita IS DISTINCT FROM NEW.proposta_aceita
    OR OLD.data_aceite_proposta IS DISTINCT FROM NEW.data_aceite_proposta
    OR OLD.proposta_aceita_id IS DISTINCT FROM NEW.proposta_aceita_id
  )
  EXECUTE FUNCTION trigger_auditar_proposta_aceita();

CREATE OR REPLACE FUNCTION trigger_auditar_status_certidoes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status_certidoes IS DISTINCT FROM OLD.status_certidoes THEN
    INSERT INTO public.precatorio_auditoria (
      precatorio_id,
      acao,
      de,
      para,
      payload_json,
      user_id
    ) VALUES (
      NEW.id,
      'STATUS_CERTIDOES',
      COALESCE(OLD.status_certidoes, 'null'),
      COALESCE(NEW.status_certidoes, 'null'),
      jsonb_build_object(
        'status_certidoes', NEW.status_certidoes
      ),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_precatorio_auditar_status_certidoes ON public.precatorios;
CREATE TRIGGER trigger_precatorio_auditar_status_certidoes
  AFTER UPDATE ON public.precatorios
  FOR EACH ROW
  WHEN (OLD.status_certidoes IS DISTINCT FROM NEW.status_certidoes)
  EXECUTE FUNCTION trigger_auditar_status_certidoes();

CREATE OR REPLACE FUNCTION trigger_auditar_liberacao_fechamento()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.juridico_liberou_fechamento IS DISTINCT FROM OLD.juridico_liberou_fechamento THEN
    INSERT INTO public.precatorio_auditoria (
      precatorio_id,
      acao,
      de,
      para,
      payload_json,
      user_id
    ) VALUES (
      NEW.id,
      'LIBERACAO_FECHAMENTO',
      COALESCE(OLD.juridico_liberou_fechamento::TEXT, 'null'),
      COALESCE(NEW.juridico_liberou_fechamento::TEXT, 'null'),
      jsonb_build_object(
        'pendencias_fechamento', NEW.pendencias_fechamento
      ),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_precatorio_auditar_liberacao_fechamento ON public.precatorios;
CREATE TRIGGER trigger_precatorio_auditar_liberacao_fechamento
  AFTER UPDATE ON public.precatorios
  FOR EACH ROW
  WHEN (OLD.juridico_liberou_fechamento IS DISTINCT FROM NEW.juridico_liberou_fechamento)
  EXECUTE FUNCTION trigger_auditar_liberacao_fechamento();

-- 7) Grants
GRANT EXECUTE ON FUNCTION validar_gate_proposta_aceita_para_certidoes TO authenticated;
GRANT EXECUTE ON FUNCTION validar_gate_juridico_para_pronto TO authenticated;
GRANT EXECUTE ON FUNCTION validar_gate_juridico_para_reprovado TO authenticated;
GRANT EXECUTE ON FUNCTION validar_movimentacao_kanban TO authenticated;

COMMIT;

SELECT 'Script 162 executado com sucesso! Fluxo de fechamento atualizado.' as status;

