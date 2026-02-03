-- Script 118: Update Kanban Flow (Remove Documentos Column)

-- 1. Migrate existing cards from 'docs_credor' to 'pronto_calculo'
UPDATE precatorios 
SET status_kanban = 'pronto_calculo' 
WHERE status_kanban = 'docs_credor';

-- 2. Update Kanban Validation Function to skip 'docs_credor'
CREATE OR REPLACE FUNCTION validar_movimentacao_kanban(
  p_precatorio_id UUID,
  p_coluna_destino VARCHAR(50)
)
RETURNS JSONB AS $$
DECLARE
  v_coluna_atual VARCHAR(50);
  v_validacao JSONB;
BEGIN
  -- Buscar coluna atual
  SELECT status_kanban INTO v_coluna_atual
  FROM public.precatorios
  WHERE id = p_precatorio_id;

  -- Validar baseado na transição
  CASE 
    -- Direct jump from Triagem to Pronto para Calculo
    WHEN v_coluna_atual = 'triagem_interesse' AND p_coluna_destino = 'pronto_calculo' THEN
       -- Check interest only (using the existing logic for triagem)
       v_validacao := validar_gate_triagem_para_docs(p_precatorio_id); 
       
       -- Update message if valid
       IF (v_validacao->>'valido')::boolean THEN
          v_validacao := jsonb_build_object(
            'valido', true,
            'mensagem', 'Gate aprovado: Interesse verificado. Pronto para cálculo.'
          );
       END IF;

    -- Legacy support (if any card stuck) or standard flow updates
    WHEN v_coluna_atual = 'certidoes' AND p_coluna_destino = 'pronto_calculo' THEN
      v_validacao := validar_gate_certidoes_para_pronto(p_precatorio_id);
    
    WHEN v_coluna_atual = 'pronto_calculo' AND p_coluna_destino = 'calculo_andamento' THEN
      v_validacao := validar_gate_pronto_para_calculo(p_precatorio_id);
    
    WHEN v_coluna_atual = 'juridico' AND p_coluna_destino = 'pronto_calculo' THEN
      v_validacao := validar_gate_juridico_para_pronto(p_precatorio_id);

    WHEN v_coluna_atual = 'juridico' AND p_coluna_destino = 'reprovado' THEN
      v_validacao := validar_gate_juridico_para_reprovado(p_precatorio_id);

    WHEN v_coluna_atual = 'calculo_andamento' AND p_coluna_destino = 'calculo_concluido' THEN
      v_validacao := validar_gate_recalculo_para_concluido(p_precatorio_id);
    
    WHEN v_coluna_atual = 'calculo_concluido' AND p_coluna_destino = 'proposta_negociacao' THEN
      v_validacao := validar_gate_concluido_para_proposta(p_precatorio_id);
    
    ELSE
      -- Standard allow for other moves
      v_validacao := jsonb_build_object(
        'valido', true,
        'mensagem', 'Movimentação permitida'
      );
  END CASE;

  RETURN v_validacao;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
