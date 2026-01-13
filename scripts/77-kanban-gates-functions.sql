-- ============================================
-- Script 77: Kanban + Gates - Funções de Validação
-- ============================================
-- Funções para validar gates (Definition of Done) antes de mover cards

-- ============================================
-- 1. FUNÇÃO: Validar Gate de Triagem → Documentos
-- ============================================

CREATE OR REPLACE FUNCTION validar_gate_triagem_para_docs(p_precatorio_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_interesse_status VARCHAR(50);
  v_result JSONB;
BEGIN
  -- Buscar status do interesse
  SELECT interesse_status INTO v_interesse_status
  FROM public.precatorios
  WHERE id = p_precatorio_id;

  -- Validar
  IF v_interesse_status = 'TEM_INTERESSE' THEN
    v_result := jsonb_build_object(
      'valido', true,
      'mensagem', 'Gate aprovado: Credor tem interesse'
    );
  ELSIF v_interesse_status = 'SEM_INTERESSE' THEN
    v_result := jsonb_build_object(
      'valido', true,
      'pode_fechar', true,
      'mensagem', 'Credor sem interesse - pode mover para Fechado'
    );
  ELSE
    v_result := jsonb_build_object(
      'valido', false,
      'mensagem', 'Bloqueado: Interesse do credor não confirmado. Status atual: ' || COALESCE(v_interesse_status, 'não definido')
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. FUNÇÃO: Validar Gate de Documentos → Certidões
-- ============================================

CREATE OR REPLACE FUNCTION validar_gate_docs_para_certidoes(p_precatorio_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_total_docs INTEGER;
  v_docs_recebidos INTEGER;
  v_docs_pendentes TEXT[];
  v_result JSONB;
BEGIN
  -- Contar documentos mínimos obrigatórios
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status_item = 'RECEBIDO')
  INTO v_total_docs, v_docs_recebidos
  FROM public.precatorio_itens
  WHERE precatorio_id = p_precatorio_id
    AND tipo_grupo = 'DOC_CREDOR'
    AND nome_item IN (
      'RG',
      'CPF',
      'Certidão de casamento (ou nascimento se solteiro)',
      'Comprovante de residência (≤ 30 dias)',
      'Dados bancários (agência/conta)'
    );

  -- Buscar documentos pendentes
  SELECT array_agg(nome_item)
  INTO v_docs_pendentes
  FROM public.precatorio_itens
  WHERE precatorio_id = p_precatorio_id
    AND tipo_grupo = 'DOC_CREDOR'
    AND nome_item IN (
      'RG',
      'CPF',
      'Certidão de casamento (ou nascimento se solteiro)',
      'Comprovante de residência (≤ 30 dias)',
      'Dados bancários (agência/conta)'
    )
    AND status_item != 'RECEBIDO';

  -- Validar (mínimo 5 documentos obrigatórios)
  IF v_docs_recebidos >= 5 THEN
    v_result := jsonb_build_object(
      'valido', true,
      'mensagem', 'Gate aprovado: Documentos mínimos recebidos (' || v_docs_recebidos || '/5)'
    );
  ELSE
    v_result := jsonb_build_object(
      'valido', false,
      'mensagem', 'Bloqueado: Documentos mínimos pendentes (' || v_docs_recebidos || '/5)',
      'docs_pendentes', v_docs_pendentes
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. FUNÇÃO: Validar Gate de Certidões → Pronto para Cálculo
-- ============================================

CREATE OR REPLACE FUNCTION validar_gate_certidoes_para_pronto(p_precatorio_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_total_certidoes INTEGER;
  v_certidoes_ok INTEGER;
  v_certidoes_pendentes TEXT[];
  v_result JSONB;
BEGIN
  -- Contar certidões
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status_item IN ('RECEBIDO', 'NAO_APLICAVEL'))
  INTO v_total_certidoes, v_certidoes_ok
  FROM public.precatorio_itens
  WHERE precatorio_id = p_precatorio_id
    AND tipo_grupo = 'CERTIDAO';

  -- Buscar certidões pendentes
  SELECT array_agg(nome_item || ' (' || status_item || ')')
  INTO v_certidoes_pendentes
  FROM public.precatorio_itens
  WHERE precatorio_id = p_precatorio_id
    AND tipo_grupo = 'CERTIDAO'
    AND status_item NOT IN ('RECEBIDO', 'NAO_APLICAVEL');

  -- Validar
  IF v_total_certidoes = v_certidoes_ok THEN
    v_result := jsonb_build_object(
      'valido', true,
      'mensagem', 'Gate aprovado: Todas as certidões OK (' || v_certidoes_ok || '/' || v_total_certidoes || ')'
    );
  ELSE
    v_result := jsonb_build_object(
      'valido', false,
      'mensagem', 'Bloqueado: Certidões pendentes (' || v_certidoes_ok || '/' || v_total_certidoes || ')',
      'certidoes_pendentes', v_certidoes_pendentes
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. FUNÇÃO: Validar Gate de Pronto → Cálculo em Andamento
-- ============================================

CREATE OR REPLACE FUNCTION validar_gate_pronto_para_calculo(p_precatorio_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_responsavel_calculo_id UUID;
  v_result JSONB;
BEGIN
  -- Buscar responsável do cálculo
  SELECT responsavel_calculo_id INTO v_responsavel_calculo_id
  FROM public.precatorios
  WHERE id = p_precatorio_id;

  -- Validar
  IF v_responsavel_calculo_id IS NOT NULL THEN
    v_result := jsonb_build_object(
      'valido', true,
      'mensagem', 'Gate aprovado: Responsável do cálculo atribuído'
    );
  ELSE
    v_result := jsonb_build_object(
      'valido', false,
      'mensagem', 'Bloqueado: Responsável do cálculo não atribuído'
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. FUNÇÃO: Validar Gate de Análise Jurídica → Recálculo
-- ============================================

CREATE OR REPLACE FUNCTION validar_gate_juridico_para_recalculo(p_precatorio_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_parecer_status VARCHAR(50);
  v_parecer_texto TEXT;
  v_result JSONB;
BEGIN
  -- Buscar parecer
  SELECT juridico_parecer_status, juridico_parecer_texto
  INTO v_parecer_status, v_parecer_texto
  FROM public.precatorios
  WHERE id = p_precatorio_id;

  -- Validar
  IF v_parecer_status IS NOT NULL AND v_parecer_texto IS NOT NULL THEN
    IF v_parecer_status = 'IMPEDIMENTO' THEN
      v_result := jsonb_build_object(
        'valido', true,
        'pode_fechar', true,
        'mensagem', 'Impedimento jurídico - pode mover para Fechado'
      );
    ELSE
      v_result := jsonb_build_object(
        'valido', true,
        'mensagem', 'Gate aprovado: Parecer jurídico preenchido (' || v_parecer_status || ')'
      );
    END IF;
  ELSE
    v_result := jsonb_build_object(
      'valido', false,
      'mensagem', 'Bloqueado: Parecer jurídico não preenchido'
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. FUNÇÃO: Validar Gate de Recálculo → Cálculo Concluído
-- ============================================

CREATE OR REPLACE FUNCTION validar_gate_recalculo_para_concluido(p_precatorio_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_ultima_versao INTEGER;
  v_result JSONB;
BEGIN
  -- Buscar última versão do cálculo
  SELECT calculo_ultima_versao INTO v_ultima_versao
  FROM public.precatorios
  WHERE id = p_precatorio_id;

  -- Validar
  IF v_ultima_versao > 0 THEN
    v_result := jsonb_build_object(
      'valido', true,
      'mensagem', 'Gate aprovado: Cálculo salvo (versão ' || v_ultima_versao || ')'
    );
  ELSE
    v_result := jsonb_build_object(
      'valido', false,
      'mensagem', 'Bloqueado: Nenhum cálculo salvo'
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. FUNÇÃO: Validar Gate de Concluído → Proposta
-- ============================================

CREATE OR REPLACE FUNCTION validar_gate_concluido_para_proposta(p_precatorio_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_valor_atualizado NUMERIC;
  v_saldo_liquido NUMERIC;
  v_data_base DATE;
  v_premissas TEXT;
  v_result JSONB;
  v_campos_faltando TEXT[];
BEGIN
  -- Buscar campos obrigatórios
  SELECT 
    valor_atualizado,
    saldo_liquido,
    data_base_calculo,
    premissas_calculo_resumo
  INTO v_valor_atualizado, v_saldo_liquido, v_data_base, v_premissas
  FROM public.precatorios
  WHERE id = p_precatorio_id;

  -- Verificar campos faltando
  v_campos_faltando := ARRAY[]::TEXT[];
  
  IF v_valor_atualizado IS NULL THEN
    v_campos_faltando := array_append(v_campos_faltando, 'Valor atualizado');
  END IF;
  
  IF v_saldo_liquido IS NULL THEN
    v_campos_faltando := array_append(v_campos_faltando, 'Saldo líquido');
  END IF;
  
  IF v_data_base IS NULL THEN
    v_campos_faltando := array_append(v_campos_faltando, 'Data base do cálculo');
  END IF;
  
  IF v_premissas IS NULL OR v_premissas = '' THEN
    v_campos_faltando := array_append(v_campos_faltando, 'Premissas do cálculo');
  END IF;

  -- Validar
  IF array_length(v_campos_faltando, 1) IS NULL THEN
    v_result := jsonb_build_object(
      'valido', true,
      'mensagem', 'Gate aprovado: Todos os campos obrigatórios preenchidos'
    );
  ELSE
    v_result := jsonb_build_object(
      'valido', false,
      'mensagem', 'Bloqueado: Campos obrigatórios faltando',
      'campos_faltando', v_campos_faltando
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. FUNÇÃO: Validar se pode acessar Área de Cálculos
-- ============================================

CREATE OR REPLACE FUNCTION pode_acessar_area_calculos(
  p_precatorio_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB AS $$
DECLARE
  v_status_kanban VARCHAR(50);
  v_user_role VARCHAR(50);
  v_responsavel_calculo_id UUID;
  v_result JSONB;
  v_motivos_bloqueio TEXT[];
BEGIN
  -- Buscar dados do precatório
  SELECT status_kanban, responsavel_calculo_id
  INTO v_status_kanban, v_responsavel_calculo_id
  FROM public.precatorios
  WHERE id = p_precatorio_id;

  -- Buscar role do usuário
  SELECT auth.jwt() -> 'app_metadata' ->> 'role' INTO v_user_role;

  v_motivos_bloqueio := ARRAY[]::TEXT[];

  -- Verificar coluna
  IF v_status_kanban NOT IN (
    'pronto_calculo',
    'calculo_andamento',
    'analise_juridica',
    'recalculo_pos_juridico',
    'calculo_concluido'
  ) THEN
    v_motivos_bloqueio := array_append(
      v_motivos_bloqueio,
      'Coluna atual não permite acesso ao cálculo: ' || v_status_kanban
    );
  END IF;

  -- Verificar permissão do usuário
  IF v_user_role NOT IN ('operador_calculo', 'admin') THEN
    v_motivos_bloqueio := array_append(
      v_motivos_bloqueio,
      'Usuário não tem permissão (role: ' || COALESCE(v_user_role, 'não definido') || ')'
    );
  END IF;

  -- Verificar se é o responsável (se não for admin)
  IF v_user_role != 'admin' AND v_responsavel_calculo_id != p_user_id THEN
    v_motivos_bloqueio := array_append(
      v_motivos_bloqueio,
      'Usuário não é o responsável pelo cálculo'
    );
  END IF;

  -- Resultado
  IF array_length(v_motivos_bloqueio, 1) IS NULL THEN
    v_result := jsonb_build_object(
      'pode_acessar', true,
      'mensagem', 'Acesso permitido à Área de Cálculos'
    );
  ELSE
    v_result := jsonb_build_object(
      'pode_acessar', false,
      'mensagem', 'Acesso bloqueado à Área de Cálculos',
      'motivos', v_motivos_bloqueio
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. FUNÇÃO: Validar movimentação completa
-- ============================================

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
    WHEN v_coluna_atual = 'triagem_interesse' AND p_coluna_destino = 'docs_credor' THEN
      v_validacao := validar_gate_triagem_para_docs(p_precatorio_id);
    
    WHEN v_coluna_atual = 'docs_credor' AND p_coluna_destino = 'certidoes' THEN
      v_validacao := validar_gate_docs_para_certidoes(p_precatorio_id);
    
    WHEN v_coluna_atual = 'certidoes' AND p_coluna_destino = 'pronto_calculo' THEN
      v_validacao := validar_gate_certidoes_para_pronto(p_precatorio_id);
    
    WHEN v_coluna_atual = 'pronto_calculo' AND p_coluna_destino = 'calculo_andamento' THEN
      v_validacao := validar_gate_pronto_para_calculo(p_precatorio_id);
    
    WHEN v_coluna_atual = 'analise_juridica' AND p_coluna_destino = 'recalculo_pos_juridico' THEN
      v_validacao := validar_gate_juridico_para_recalculo(p_precatorio_id);
    
    WHEN v_coluna_atual = 'recalculo_pos_juridico' AND p_coluna_destino = 'calculo_concluido' THEN
      v_validacao := validar_gate_recalculo_para_concluido(p_precatorio_id);
    
    WHEN v_coluna_atual = 'calculo_concluido' AND p_coluna_destino = 'proposta_negociacao' THEN
      v_validacao := validar_gate_concluido_para_proposta(p_precatorio_id);
    
    ELSE
      -- Movimentações sem gate específico são permitidas
      v_validacao := jsonb_build_object(
        'valido', true,
        'mensagem', 'Movimentação permitida (sem gate específico)'
      );
  END CASE;

  RETURN v_validacao;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION validar_gate_triagem_para_docs TO authenticated;
GRANT EXECUTE ON FUNCTION validar_gate_docs_para_certidoes TO authenticated;
GRANT EXECUTE ON FUNCTION validar_gate_certidoes_para_pronto TO authenticated;
GRANT EXECUTE ON FUNCTION validar_gate_pronto_para_calculo TO authenticated;
GRANT EXECUTE ON FUNCTION validar_gate_juridico_para_recalculo TO authenticated;
GRANT EXECUTE ON FUNCTION validar_gate_recalculo_para_concluido TO authenticated;
GRANT EXECUTE ON FUNCTION validar_gate_concluido_para_proposta TO authenticated;
GRANT EXECUTE ON FUNCTION pode_acessar_area_calculos TO authenticated;
GRANT EXECUTE ON FUNCTION validar_movimentacao_kanban TO authenticated;

-- ============================================
-- SUCESSO
-- ============================================

SELECT 'Script 77 executado com sucesso! Funções de validação de gates criadas.' as status;
