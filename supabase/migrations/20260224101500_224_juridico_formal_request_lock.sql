-- Lock movement into Juridico unless there is a formal request (motivo + descricao)

CREATE OR REPLACE FUNCTION public.validar_gate_para_juridico(p_precatorio_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_motivo TEXT;
  v_descricao TEXT;
BEGIN
  SELECT
    NULLIF(BTRIM(COALESCE(juridico_motivo, '')), ''),
    NULLIF(BTRIM(COALESCE(juridico_descricao_bloqueio, '')), '')
  INTO v_motivo, v_descricao
  FROM public.precatorios
  WHERE id = p_precatorio_id;

  IF v_motivo IS NOT NULL AND v_descricao IS NOT NULL THEN
    RETURN jsonb_build_object(
      'valido', true,
      'mensagem', 'Gate aprovado: solicitacao formal juridica registrada.'
    );
  END IF;

  RETURN jsonb_build_object(
    'valido', false,
    'mensagem', 'Bloqueado: registre a solicitacao formal (motivo e descricao do bloqueio) antes de mover para Juridico.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.validar_movimentacao_kanban(
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
    WHEN p_coluna_destino = 'juridico' AND v_coluna_atual IS DISTINCT FROM 'juridico' THEN
      v_validacao := public.validar_gate_para_juridico(p_precatorio_id);

    WHEN v_coluna_atual = 'triagem_interesse' AND p_coluna_destino = 'docs_credor' THEN
      v_validacao := public.validar_gate_triagem_para_docs(p_precatorio_id);

    WHEN v_coluna_atual = 'docs_credor' AND p_coluna_destino = 'pronto_calculo' THEN
      v_validacao := public.validar_gate_docs_para_certidoes(p_precatorio_id);

    WHEN v_coluna_atual = 'certidoes' AND p_coluna_destino = 'pronto_calculo' THEN
      v_validacao := public.validar_gate_certidoes_para_pronto(p_precatorio_id);

    WHEN v_coluna_atual = 'pronto_calculo' AND p_coluna_destino = 'calculo_andamento' THEN
      v_validacao := public.validar_gate_pronto_para_calculo(p_precatorio_id);

    WHEN v_coluna_atual = 'juridico' AND p_coluna_destino = 'pronto_calculo' THEN
      v_validacao := public.validar_gate_juridico_para_pronto(p_precatorio_id);

    WHEN v_coluna_atual = 'calculo_concluido' AND p_coluna_destino = 'proposta_negociacao' THEN
      v_validacao := public.validar_gate_concluido_para_proposta(p_precatorio_id);

    WHEN v_coluna_atual = 'proposta_aceita' AND p_coluna_destino = 'certidoes' THEN
      v_validacao := public.validar_gate_proposta_aceita_para_certidoes(p_precatorio_id);

    WHEN v_coluna_atual = 'juridico' AND p_coluna_destino = 'reprovado' THEN
      v_validacao := public.validar_gate_juridico_para_reprovado(p_precatorio_id);

    WHEN v_coluna_atual = 'calculo_andamento' AND p_coluna_destino = 'calculo_concluido' THEN
      v_validacao := public.validar_gate_recalculo_para_concluido(p_precatorio_id);

    ELSE
      v_validacao := jsonb_build_object(
        'valido', true,
        'mensagem', 'Movimentacao permitida'
      );
  END CASE;

  RETURN v_validacao;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.travar_juridico_sem_solicitacao_formal()
RETURNS TRIGGER AS $$
DECLARE
  v_motivo TEXT;
  v_descricao TEXT;
  v_entrando_juridico BOOLEAN;
BEGIN
  v_entrando_juridico :=
    (COALESCE(OLD.status_kanban, '') <> 'juridico' AND COALESCE(NEW.status_kanban, '') = 'juridico')
    OR
    (COALESCE(OLD.localizacao_kanban, '') <> 'juridico' AND COALESCE(NEW.localizacao_kanban, '') = 'juridico');

  IF v_entrando_juridico THEN
    v_motivo := NULLIF(BTRIM(COALESCE(NEW.juridico_motivo, '')), '');
    v_descricao := NULLIF(BTRIM(COALESCE(NEW.juridico_descricao_bloqueio, '')), '');

    IF v_motivo IS NULL OR v_descricao IS NULL THEN
      RAISE EXCEPTION
        'Movimentacao para Juridico bloqueada: registre a solicitacao formal (motivo e descricao do bloqueio).'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_travar_juridico_sem_solicitacao_formal ON public.precatorios;
CREATE TRIGGER trigger_travar_juridico_sem_solicitacao_formal
  BEFORE UPDATE ON public.precatorios
  FOR EACH ROW
  EXECUTE FUNCTION public.travar_juridico_sem_solicitacao_formal();

GRANT EXECUTE ON FUNCTION public.validar_gate_para_juridico(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validar_movimentacao_kanban(UUID, VARCHAR) TO authenticated;
