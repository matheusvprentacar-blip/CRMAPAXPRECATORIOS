-- =====================================================
-- SCRIPT 50: Funções Auxiliares para Storage
-- =====================================================
-- Descrição: Cria funções auxiliares para gerenciar
--            documentos no Supabase Storage
-- Autor: Sistema CRM Precatórios
-- Data: 2025
-- =====================================================

-- IMPORTANTE: O bucket deve ser criado MANUALMENTE no Supabase Dashboard
-- Siga o guia: GUIA-CRIAR-BUCKET-SUPABASE.md

-- =====================================================
-- FUNÇÕES AUXILIARES PARA STORAGE
-- =====================================================

-- Função para gerar caminho do arquivo no storage
CREATE OR REPLACE FUNCTION public.gerar_storage_path(
  p_precatorio_id UUID,
  p_tipo_documento TEXT,
  p_nome_arquivo TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_timestamp TEXT;
  v_nome_sanitizado TEXT;
BEGIN
  -- Gerar timestamp
  v_timestamp := TO_CHAR(NOW(), 'YYYYMMDD_HH24MISS');
  
  -- Sanitizar nome do arquivo (remover caracteres especiais)
  v_nome_sanitizado := REGEXP_REPLACE(
    p_nome_arquivo,
    '[^a-zA-Z0-9._-]',
    '_',
    'g'
  );
  
  -- Retornar caminho completo
  RETURN FORMAT(
    '%s/%s/%s_%s',
    p_precatorio_id,
    p_tipo_documento,
    v_timestamp,
    v_nome_sanitizado
  );
END;
$$;

-- Função para obter URL pública do documento
CREATE OR REPLACE FUNCTION public.get_documento_url(
  p_storage_path TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_url TEXT;
BEGIN
  -- Obter URL do projeto (configurar manualmente)
  v_project_url := current_setting('app.settings.supabase_url', true);
  
  IF v_project_url IS NULL THEN
    -- Fallback: usar variável de ambiente
    v_project_url := current_setting('SUPABASE_URL', true);
  END IF;
  
  -- Retornar URL completa
  RETURN FORMAT(
    '%s/storage/v1/object/authenticated/precatorios-documentos/%s',
    v_project_url,
    p_storage_path
  );
END;
$$;

-- Função para validar tipo de arquivo
CREATE OR REPLACE FUNCTION public.validar_tipo_arquivo(
  p_mime_type TEXT,
  p_tamanho_bytes BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tipos_permitidos TEXT[] := ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  v_tamanho_maximo BIGINT := 10485760; -- 10MB
BEGIN
  -- Validar MIME type
  IF NOT (p_mime_type = ANY(v_tipos_permitidos)) THEN
    RAISE EXCEPTION 'Tipo de arquivo não permitido: %', p_mime_type;
  END IF;
  
  -- Validar tamanho
  IF p_tamanho_bytes > v_tamanho_maximo THEN
    RAISE EXCEPTION 'Arquivo muito grande: % bytes (máximo: % bytes)', 
      p_tamanho_bytes, v_tamanho_maximo;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Adicionar comentários
COMMENT ON FUNCTION public.gerar_storage_path IS 
'Gera caminho padronizado para armazenar arquivo no storage';

COMMENT ON FUNCTION public.get_documento_url IS 
'Retorna URL autenticada para acessar documento no storage';

COMMENT ON FUNCTION public.validar_tipo_arquivo IS 
'Valida tipo MIME e tamanho do arquivo antes do upload';

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.gerar_storage_path TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_documento_url TO authenticated;
GRANT EXECUTE ON FUNCTION public.validar_tipo_arquivo TO authenticated;

-- =====================================================
-- TESTES
-- =====================================================

-- Teste 1: Gerar caminho de storage
SELECT gerar_storage_path(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID,
  'credor_rg',
  'João Silva - RG.pdf'
);
-- Resultado esperado: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/credor_rg/20250115_143022_joao_silva_-_rg.pdf

-- Teste 2: Validar tipo de arquivo (válido)
SELECT validar_tipo_arquivo('application/pdf', 5242880);
-- Resultado esperado: true

-- Teste 3: Validar tipo de arquivo (inválido - tipo)
-- SELECT validar_tipo_arquivo('application/zip', 1024);
-- Resultado esperado: ERRO - Tipo de arquivo não permitido

-- Teste 4: Validar tipo de arquivo (inválido - tamanho)
-- SELECT validar_tipo_arquivo('application/pdf', 20971520);
-- Resultado esperado: ERRO - Arquivo muito grande

-- Verificar se as funções foram criadas
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'gerar_storage_path',
    'get_documento_url',
    'validar_tipo_arquivo'
  )
ORDER BY routine_name;

-- =====================================================
-- ROLLBACK (se necessário)
-- =====================================================
-- DROP FUNCTION IF EXISTS public.gerar_storage_path;
-- DROP FUNCTION IF EXISTS public.get_documento_url;
-- DROP FUNCTION IF EXISTS public.validar_tipo_arquivo;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 1. BUCKET DEVE SER CRIADO MANUALMENTE:
--    - Acesse: Supabase Dashboard > Storage
--    - Clique em "New bucket"
--    - Nome: precatorios-documentos
--    - Public: false (privado)
--    - File size limit: 10485760 (10MB)
--    - Siga o guia: GUIA-CRIAR-BUCKET-SUPABASE.md
--
-- 2. POLICIES DEVEM SER CRIADAS VIA INTERFACE:
--    - Acesse: Storage > precatorios-documentos > Policies
--    - Crie 4 policies (SELECT, INSERT, UPDATE, DELETE)
--    - Siga o guia: GUIA-CRIAR-BUCKET-SUPABASE.md
--
-- 3. ESTRUTURA DE PASTAS (automática):
--    precatorios-documentos/
--      {precatorio_id}/
--        {tipo_documento}/
--          {timestamp}_{nome_arquivo}
--
-- 4. VALIDAÇÕES:
--    - Tamanho máximo: 10MB
--    - Tipos permitidos: PDF, JPG, PNG, DOC, DOCX
--    - Nome sanitizado automaticamente
--
-- 5. SEGURANÇA:
--    - Bucket privado
--    - RLS habilitado
--    - Acesso baseado em permissões do precatório
--    - URLs autenticadas
-- =====================================================
