-- =====================================================
-- SCRIPT 68: Tabelas para Extração de IA
-- =====================================================
-- Descrição: Cria estrutura para armazenar extrações
--            de dados de documentos usando IA
-- Autor: Sistema CRM Precatórios
-- Data: 2024
-- =====================================================

-- 1. Expandir tabela documentos_precatorio (adicionar campos IA)
ALTER TABLE public.documentos_precatorio
ADD COLUMN IF NOT EXISTS processado_ia BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS processado_ia_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS erro_processamento TEXT;

-- Índice para buscar documentos não processados
CREATE INDEX IF NOT EXISTS idx_documentos_precatorio_processado_ia 
ON public.documentos_precatorio(processado_ia, precatorio_id) 
WHERE deleted_at IS NULL;

-- 2. Tabela de extrações (uma por precatório/processamento)
CREATE TABLE IF NOT EXISTS public.precatorio_extracoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  precatorio_id UUID NOT NULL REFERENCES public.precatorios(id) ON DELETE CASCADE,
  
  -- Status do processamento
  status TEXT NOT NULL CHECK (status IN ('processando', 'concluido', 'erro', 'aplicado')) DEFAULT 'processando',
  
  -- Resultado completo (JSON)
  result_json JSONB,
  
  -- Estatísticas
  total_campos INTEGER DEFAULT 0,
  campos_alta_confianca INTEGER DEFAULT 0, -- >80%
  campos_baixa_confianca INTEGER DEFAULT 0, -- <50%
  conflitos INTEGER DEFAULT 0,
  
  -- Documentos processados
  documentos_ids UUID[] DEFAULT '{}',
  total_documentos INTEGER DEFAULT 0,
  
  -- Checklist de documentos
  checklist_json JSONB,
  
  -- Auditoria de criação
  created_by UUID REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Auditoria de aplicação
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES public.usuarios(id),
  campos_aplicados TEXT[], -- Lista de campos que foram aplicados
  
  -- Erro
  erro_mensagem TEXT,
  erro_detalhes JSONB
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_precatorio_extracoes_precatorio 
ON public.precatorio_extracoes(precatorio_id);

CREATE INDEX IF NOT EXISTS idx_precatorio_extracoes_status 
ON public.precatorio_extracoes(status);

CREATE INDEX IF NOT EXISTS idx_precatorio_extracoes_created 
ON public.precatorio_extracoes(created_at DESC);

-- 3. Tabela de campos extraídos (granular)
CREATE TABLE IF NOT EXISTS public.precatorio_extracao_campos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extracao_id UUID NOT NULL REFERENCES public.precatorio_extracoes(id) ON DELETE CASCADE,
  
  -- Identificação do campo
  campo_nome TEXT NOT NULL, -- Ex: 'numero_precatorio', 'credor_cpf_cnpj'
  campo_label TEXT, -- Label amigável: 'Número do Precatório', 'CPF do Credor'
  campo_valor TEXT, -- Valor extraído (sempre string, converter depois)
  campo_tipo TEXT NOT NULL CHECK (campo_tipo IN ('string', 'number', 'date', 'boolean', 'cpf', 'cnpj', 'currency')),
  
  -- Valor normalizado (para aplicação)
  valor_normalizado TEXT,
  
  -- Confiança da IA
  confianca DECIMAL(5,2) CHECK (confianca >= 0 AND confianca <= 100),
  confianca_nivel TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN confianca >= 80 THEN 'alta'
      WHEN confianca >= 50 THEN 'media'
      ELSE 'baixa'
    END
  ) STORED,
  
  -- Fonte do dado
  fonte_documento_id UUID REFERENCES public.documentos_precatorio(id),
  fonte_documento_nome TEXT,
  fonte_pagina INTEGER,
  fonte_snippet TEXT, -- Trecho do texto onde foi encontrado (max 500 chars)
  
  -- Status
  aplicado BOOLEAN DEFAULT false,
  aplicado_at TIMESTAMPTZ,
  
  -- Conflito
  conflito BOOLEAN DEFAULT false,
  conflito_com UUID[], -- IDs de outros campos conflitantes
  conflito_resolvido BOOLEAN DEFAULT false,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_extracao_campos_extracao 
ON public.precatorio_extracao_campos(extracao_id);

CREATE INDEX IF NOT EXISTS idx_extracao_campos_campo_nome 
ON public.precatorio_extracao_campos(campo_nome);

CREATE INDEX IF NOT EXISTS idx_extracao_campos_confianca 
ON public.precatorio_extracao_campos(confianca DESC);

CREATE INDEX IF NOT EXISTS idx_extracao_campos_aplicado 
ON public.precatorio_extracao_campos(aplicado);

CREATE INDEX IF NOT EXISTS idx_extracao_campos_conflito 
ON public.precatorio_extracao_campos(conflito) 
WHERE conflito = true;

-- 4. Comentários
COMMENT ON TABLE public.precatorio_extracoes IS 
'Armazena resultados de extrações de IA por precatório';

COMMENT ON TABLE public.precatorio_extracao_campos IS 
'Armazena cada campo extraído individualmente com metadados';

COMMENT ON COLUMN public.precatorio_extracao_campos.confianca_nivel IS 
'Nível de confiança calculado automaticamente: alta (>=80%), media (50-79%), baixa (<50%)';

-- 5. Função para buscar documentos não processados
CREATE OR REPLACE FUNCTION public.get_documentos_nao_processados(p_precatorio_id UUID)
RETURNS TABLE (
  id UUID,
  tipo_documento TEXT,
  storage_path TEXT,
  storage_url TEXT,
  mime_type TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id,
    tipo_documento::TEXT,
    storage_path,
    storage_url,
    mime_type,
    created_at
  FROM public.documentos_precatorio
  WHERE precatorio_id = p_precatorio_id
    AND deleted_at IS NULL
    AND (processado_ia = false OR processado_ia IS NULL)
  ORDER BY created_at ASC;
$$;

-- 6. Função para marcar documentos como processados
CREATE OR REPLACE FUNCTION public.marcar_documentos_processados(
  p_documento_ids UUID[],
  p_sucesso BOOLEAN DEFAULT true,
  p_erro TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.documentos_precatorio
  SET 
    processado_ia = p_sucesso,
    processado_ia_at = NOW(),
    erro_processamento = p_erro
  WHERE id = ANY(p_documento_ids);
END;
$$;

-- 7. Função para obter última extração de um precatório
CREATE OR REPLACE FUNCTION public.get_ultima_extracao(p_precatorio_id UUID)
RETURNS TABLE (
  id UUID,
  status TEXT,
  total_campos INTEGER,
  campos_alta_confianca INTEGER,
  campos_baixa_confianca INTEGER,
  conflitos INTEGER,
  created_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id,
    status,
    total_campos,
    campos_alta_confianca,
    campos_baixa_confianca,
    conflitos,
    created_at,
    applied_at
  FROM public.precatorio_extracoes
  WHERE precatorio_id = p_precatorio_id
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- 8. Função para obter campos de uma extração
CREATE OR REPLACE FUNCTION public.get_campos_extracao(p_extracao_id UUID)
RETURNS TABLE (
  id UUID,
  campo_nome TEXT,
  campo_label TEXT,
  campo_valor TEXT,
  campo_tipo TEXT,
  valor_normalizado TEXT,
  confianca DECIMAL,
  confianca_nivel TEXT,
  fonte_documento_nome TEXT,
  fonte_pagina INTEGER,
  fonte_snippet TEXT,
  aplicado BOOLEAN,
  conflito BOOLEAN,
  conflito_com UUID[]
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id,
    campo_nome,
    campo_label,
    campo_valor,
    campo_tipo,
    valor_normalizado,
    confianca,
    confianca_nivel,
    fonte_documento_nome,
    fonte_pagina,
    fonte_snippet,
    aplicado,
    conflito,
    conflito_com
  FROM public.precatorio_extracao_campos
  WHERE extracao_id = p_extracao_id
  ORDER BY 
    conflito DESC, -- Conflitos primeiro
    confianca DESC, -- Depois por confiança
    campo_nome ASC;
$$;

-- 9. RLS Policies
ALTER TABLE public.precatorio_extracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precatorio_extracao_campos ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários autenticados podem ver extrações
CREATE POLICY "Usuarios podem ver extracoes"
ON public.precatorio_extracoes
FOR SELECT
TO authenticated
USING (true);

-- Policy: Usuários autenticados podem criar extrações
CREATE POLICY "Usuarios podem criar extracoes"
ON public.precatorio_extracoes
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Usuários podem atualizar suas próprias extrações
CREATE POLICY "Usuarios podem atualizar suas extracoes"
ON public.precatorio_extracoes
FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- Policy: Usuários autenticados podem ver campos
CREATE POLICY "Usuarios podem ver campos"
ON public.precatorio_extracao_campos
FOR SELECT
TO authenticated
USING (true);

-- Policy: Usuários autenticados podem criar campos
CREATE POLICY "Usuarios podem criar campos"
ON public.precatorio_extracao_campos
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Usuários podem atualizar campos
CREATE POLICY "Usuarios podem atualizar campos"
ON public.precatorio_extracao_campos
FOR UPDATE
TO authenticated
USING (true);

-- 10. Grants
GRANT SELECT, INSERT, UPDATE ON public.precatorio_extracoes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.precatorio_extracao_campos TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_documentos_nao_processados TO authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_documentos_processados TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ultima_extracao TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_campos_extracao TO authenticated;

-- =====================================================
-- TESTES
-- =====================================================

-- Teste 1: Verificar estrutura das tabelas
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('precatorio_extracoes', 'precatorio_extracao_campos')
ORDER BY table_name, ordinal_position;

-- Teste 2: Verificar funções criadas
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%extracao%'
ORDER BY routine_name;

-- Teste 3: Verificar policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('precatorio_extracoes', 'precatorio_extracao_campos')
ORDER BY tablename, policyname;

-- =====================================================
-- ROLLBACK (se necessário)
-- =====================================================
-- DROP TABLE IF EXISTS public.precatorio_extracao_campos CASCADE;
-- DROP TABLE IF EXISTS public.precatorio_extracoes CASCADE;
-- DROP FUNCTION IF EXISTS public.get_documentos_nao_processados;
-- DROP FUNCTION IF EXISTS public.marcar_documentos_processados;
-- DROP FUNCTION IF EXISTS public.get_ultima_extracao;
-- DROP FUNCTION IF EXISTS public.get_campos_extracao;
-- ALTER TABLE public.documentos_precatorio DROP COLUMN IF EXISTS processado_ia;
-- ALTER TABLE public.documentos_precatorio DROP COLUMN IF EXISTS processado_ia_at;
-- ALTER TABLE public.documentos_precatorio DROP COLUMN IF EXISTS erro_processamento;

-- =====================================================
-- NOTAS
-- =====================================================
-- Este script cria a estrutura completa para:
-- 1. Armazenar extrações de IA
-- 2. Armazenar campos extraídos individualmente
-- 3. Rastrear documentos processados
-- 4. Detectar e resolver conflitos
-- 5. Manter auditoria completa
-- 6. Calcular níveis de confiança automaticamente
--
-- Próximos passos:
-- 1. Criar API routes para processamento
-- 2. Integrar com provedor de IA
-- 3. Criar componentes React
-- 4. Testar com documentos reais
-- =====================================================
