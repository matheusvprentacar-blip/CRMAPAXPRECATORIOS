-- ============================================
-- Script 79: Kanban + Gates - Seed (Itens Padrão)
-- ============================================
-- Cria itens padrão (documentos e certidões) para precatórios existentes
-- e função para criar automaticamente em novos precatórios

-- ============================================
-- 1. FUNÇÃO: Criar itens padrão para um precatório
-- ============================================

CREATE OR REPLACE FUNCTION criar_itens_padrao_precatorio(p_precatorio_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Verificar se já existem itens
  IF EXISTS (
    SELECT 1 FROM public.precatorio_itens 
    WHERE precatorio_id = p_precatorio_id
  ) THEN
    -- Já tem itens, não criar duplicados
    RETURN;
  END IF;

  -- ============================================
  -- DOCUMENTOS DO CREDOR (8 itens)
  -- ============================================
  
  INSERT INTO public.precatorio_itens (
    precatorio_id,
    tipo_grupo,
    nome_item,
    status_item
  ) VALUES
  (p_precatorio_id, 'DOC_CREDOR', 'RG', 'PENDENTE'),
  (p_precatorio_id, 'DOC_CREDOR', 'CPF', 'PENDENTE'),
  (p_precatorio_id, 'DOC_CREDOR', 'Certidão de casamento (ou nascimento se solteiro)', 'PENDENTE'),
  (p_precatorio_id, 'DOC_CREDOR', 'Averbação (se divórcio)', 'PENDENTE'),
  (p_precatorio_id, 'DOC_CREDOR', 'Comprovante de residência (≤ 30 dias)', 'PENDENTE'),
  (p_precatorio_id, 'DOC_CREDOR', 'Profissão do credor', 'PENDENTE'),
  (p_precatorio_id, 'DOC_CREDOR', 'Profissão do cônjuge', 'PENDENTE'),
  (p_precatorio_id, 'DOC_CREDOR', 'Dados bancários (agência/conta)', 'PENDENTE');

  -- ============================================
  -- CERTIDÕES (3 itens)
  -- ============================================
  
  INSERT INTO public.precatorio_itens (
    precatorio_id,
    tipo_grupo,
    nome_item,
    status_item,
    observacao
  ) VALUES
  (p_precatorio_id, 'CERTIDAO', 'Certidão negativa municipal', 'PENDENTE', 'Validade: 180 dias'),
  (p_precatorio_id, 'CERTIDAO', 'Certidão negativa estadual', 'PENDENTE', 'Validade: 180 dias'),
  (p_precatorio_id, 'CERTIDAO', 'Certidão negativa federal', 'PENDENTE', 'Validade: 180 dias');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION criar_itens_padrao_precatorio TO authenticated;

-- ============================================
-- 2. TRIGGER: Criar itens automaticamente em novos precatórios
-- ============================================

CREATE OR REPLACE FUNCTION trigger_criar_itens_padrao()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar itens padrão para o novo precatório
  PERFORM criar_itens_padrao_precatorio(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_precatorio_criar_itens_padrao ON public.precatorios;
CREATE TRIGGER trigger_precatorio_criar_itens_padrao
  AFTER INSERT ON public.precatorios
  FOR EACH ROW
  EXECUTE FUNCTION trigger_criar_itens_padrao();

-- ============================================
-- 3. CRIAR ITENS PARA PRECATÓRIOS EXISTENTES
-- ============================================

-- Criar itens padrão para todos os precatórios que ainda não têm
DO $$
DECLARE
  v_precatorio RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_precatorio IN 
    SELECT DISTINCT p.id
    FROM public.precatorios p
    LEFT JOIN public.precatorio_itens pi ON pi.precatorio_id = p.id
    WHERE pi.id IS NULL
      AND p.deleted_at IS NULL
  LOOP
    PERFORM criar_itens_padrao_precatorio(v_precatorio.id);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Itens padrão criados para % precatórios', v_count;
END $$;

-- ============================================
-- 4. FUNÇÃO: Adicionar item customizado
-- ============================================

CREATE OR REPLACE FUNCTION adicionar_item_customizado(
  p_precatorio_id UUID,
  p_tipo_grupo VARCHAR(20),
  p_nome_item VARCHAR(200),
  p_observacao TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_item_id UUID;
BEGIN
  -- Validar tipo_grupo
  IF p_tipo_grupo NOT IN ('DOC_CREDOR', 'CERTIDAO') THEN
    RAISE EXCEPTION 'Tipo de grupo inválido: %. Use DOC_CREDOR ou CERTIDAO', p_tipo_grupo;
  END IF;

  -- Inserir item
  INSERT INTO public.precatorio_itens (
    precatorio_id,
    tipo_grupo,
    nome_item,
    status_item,
    observacao
  ) VALUES (
    p_precatorio_id,
    p_tipo_grupo,
    p_nome_item,
    'PENDENTE',
    p_observacao
  )
  RETURNING id INTO v_item_id;

  -- Criar auditoria
  INSERT INTO public.precatorio_auditoria (
    precatorio_id,
    acao,
    para,
    payload_json,
    user_id
  ) VALUES (
    p_precatorio_id,
    'ADICIONAR_ITEM',
    p_nome_item,
    jsonb_build_object(
      'tipo_grupo', p_tipo_grupo,
      'item_id', v_item_id
    ),
    auth.uid()
  );

  RETURN v_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION adicionar_item_customizado TO authenticated;

-- ============================================
-- 5. FUNÇÃO: Atualizar status de item
-- ============================================

CREATE OR REPLACE FUNCTION atualizar_status_item(
  p_item_id UUID,
  p_novo_status VARCHAR(20),
  p_validade DATE DEFAULT NULL,
  p_observacao TEXT DEFAULT NULL,
  p_arquivo_url TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_precatorio_id UUID;
  v_status_anterior VARCHAR(20);
BEGIN
  -- Validar status
  IF p_novo_status NOT IN ('PENDENTE', 'SOLICITADO', 'RECEBIDO', 'INCOMPLETO', 'VENCIDO', 'NAO_APLICAVEL') THEN
    RAISE EXCEPTION 'Status inválido: %', p_novo_status;
  END IF;

  -- Buscar dados atuais
  SELECT precatorio_id, status_item 
  INTO v_precatorio_id, v_status_anterior
  FROM public.precatorio_itens
  WHERE id = p_item_id;

  IF v_precatorio_id IS NULL THEN
    RAISE EXCEPTION 'Item não encontrado: %', p_item_id;
  END IF;

  -- Atualizar item
  UPDATE public.precatorio_itens
  SET 
    status_item = p_novo_status,
    validade = COALESCE(p_validade, validade),
    observacao = COALESCE(p_observacao, observacao),
    arquivo_url = COALESCE(p_arquivo_url, arquivo_url),
    updated_at = NOW()
  WHERE id = p_item_id;

  -- Criar auditoria
  INSERT INTO public.precatorio_auditoria (
    precatorio_id,
    acao,
    de,
    para,
    payload_json,
    user_id
  ) VALUES (
    v_precatorio_id,
    'UPDATE_ITEM',
    v_status_anterior,
    p_novo_status,
    jsonb_build_object(
      'item_id', p_item_id,
      'validade', p_validade,
      'tem_arquivo', p_arquivo_url IS NOT NULL
    ),
    auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION atualizar_status_item TO authenticated;

-- ============================================
-- 6. VIEW: Resumo de itens por precatório
-- ============================================

CREATE OR REPLACE VIEW view_resumo_itens_precatorio AS
SELECT 
  p.id as precatorio_id,
  p.titulo,
  p.status_kanban,
  
  -- Documentos
  COUNT(*) FILTER (WHERE pi.tipo_grupo = 'DOC_CREDOR') as total_docs,
  COUNT(*) FILTER (WHERE pi.tipo_grupo = 'DOC_CREDOR' AND pi.status_item = 'RECEBIDO') as docs_recebidos,
  COUNT(*) FILTER (WHERE pi.tipo_grupo = 'DOC_CREDOR' AND pi.status_item = 'PENDENTE') as docs_pendentes,
  
  -- Certidões
  COUNT(*) FILTER (WHERE pi.tipo_grupo = 'CERTIDAO') as total_certidoes,
  COUNT(*) FILTER (WHERE pi.tipo_grupo = 'CERTIDAO' AND pi.status_item = 'RECEBIDO') as certidoes_recebidas,
  COUNT(*) FILTER (WHERE pi.tipo_grupo = 'CERTIDAO' AND pi.status_item = 'NAO_APLICAVEL') as certidoes_nao_aplicavel,
  COUNT(*) FILTER (WHERE pi.tipo_grupo = 'CERTIDAO' AND pi.status_item = 'VENCIDO') as certidoes_vencidas,
  COUNT(*) FILTER (WHERE pi.tipo_grupo = 'CERTIDAO' AND pi.status_item = 'PENDENTE') as certidoes_pendentes,
  
  -- Percentuais
  ROUND(
    (COUNT(*) FILTER (WHERE pi.tipo_grupo = 'DOC_CREDOR' AND pi.status_item = 'RECEBIDO')::NUMERIC / 
     NULLIF(COUNT(*) FILTER (WHERE pi.tipo_grupo = 'DOC_CREDOR'), 0)) * 100,
    0
  ) as percentual_docs,
  
  ROUND(
    (COUNT(*) FILTER (WHERE pi.tipo_grupo = 'CERTIDAO' AND pi.status_item IN ('RECEBIDO', 'NAO_APLICAVEL'))::NUMERIC / 
     NULLIF(COUNT(*) FILTER (WHERE pi.tipo_grupo = 'CERTIDAO'), 0)) * 100,
    0
  ) as percentual_certidoes

FROM public.precatorios p
LEFT JOIN public.precatorio_itens pi ON pi.precatorio_id = p.id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.titulo, p.status_kanban;

GRANT SELECT ON view_resumo_itens_precatorio TO authenticated;

-- ============================================
-- 7. FUNÇÃO: Obter itens de um precatório
-- ============================================

CREATE OR REPLACE FUNCTION obter_itens_precatorio(p_precatorio_id UUID)
RETURNS TABLE(
  id UUID,
  tipo_grupo VARCHAR(20),
  nome_item VARCHAR(200),
  status_item VARCHAR(20),
  validade DATE,
  dias_para_vencer INTEGER,
  observacao TEXT,
  arquivo_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pi.id,
    pi.tipo_grupo,
    pi.nome_item,
    pi.status_item,
    pi.validade,
    CASE 
      WHEN pi.validade IS NOT NULL THEN (pi.validade - CURRENT_DATE)::INTEGER
      ELSE NULL
    END as dias_para_vencer,
    pi.observacao,
    pi.arquivo_url,
    pi.created_at,
    pi.updated_at
  FROM public.precatorio_itens pi
  WHERE pi.precatorio_id = p_precatorio_id
  ORDER BY 
    pi.tipo_grupo,
    CASE pi.status_item
      WHEN 'VENCIDO' THEN 1
      WHEN 'PENDENTE' THEN 2
      WHEN 'SOLICITADO' THEN 3
      WHEN 'INCOMPLETO' THEN 4
      WHEN 'RECEBIDO' THEN 5
      WHEN 'NAO_APLICAVEL' THEN 6
      ELSE 7
    END,
    pi.nome_item;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION obter_itens_precatorio TO authenticated;

-- ============================================
-- 8. COMENTÁRIOS
-- ============================================

COMMENT ON FUNCTION criar_itens_padrao_precatorio IS 'Cria os 11 itens padrão (8 docs + 3 certidões) para um precatório';
COMMENT ON FUNCTION adicionar_item_customizado IS 'Adiciona um item customizado ao checklist de um precatório';
COMMENT ON FUNCTION atualizar_status_item IS 'Atualiza o status de um item do checklist';
COMMENT ON FUNCTION obter_itens_precatorio IS 'Retorna todos os itens de um precatório ordenados por prioridade';
COMMENT ON VIEW view_resumo_itens_precatorio IS 'Resumo de documentos e certidões por precatório';

-- ============================================
-- SUCESSO
-- ============================================

SELECT 
  'Script 79 executado com sucesso!' as status,
  COUNT(*) as precatorios_com_itens
FROM public.precatorios p
INNER JOIN public.precatorio_itens pi ON pi.precatorio_id = p.id
WHERE p.deleted_at IS NULL;
