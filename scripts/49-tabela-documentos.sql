-- =====================================================
-- SCRIPT 49: Tabela de Documentos do Precatório
-- =====================================================
-- Descrição: Cria tabela para armazenar metadados de
--            documentos anexados aos precatórios
-- Autor: Sistema CRM Precatórios
-- Data: 2025
-- =====================================================

-- 1. Criar enum para tipos de documentos
DO $$ BEGIN
  CREATE TYPE tipo_documento_enum AS ENUM (
    'oficio_requisitorio',
    'credor_rg',
    'credor_cpf',
    'certidao_casamento',
    'certidao_nascimento',
    'comprovante_residencia',
    'dados_bancarios',
    'certidao_negativa_municipal',
    'certidao_negativa_estadual',
    'certidao_negativa_federal',
    'documento_conjuge',
    'documento_advogado',
    'outros'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Criar tabela de documentos
CREATE TABLE IF NOT EXISTS public.documentos_precatorio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  precatorio_id UUID NOT NULL REFERENCES public.precatorios(id) ON DELETE CASCADE,
  tipo_documento tipo_documento_enum NOT NULL,
  nome_arquivo TEXT NOT NULL,
  tamanho_bytes BIGINT,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  storage_url TEXT,
  enviado_por UUID REFERENCES public.usuarios(id),
  observacao TEXT,
  opcional BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 3. Criar índices
CREATE INDEX IF NOT EXISTS idx_documentos_precatorio_id 
ON public.documentos_precatorio(precatorio_id) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documentos_tipo 
ON public.documentos_precatorio(tipo_documento) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documentos_enviado_por 
ON public.documentos_precatorio(enviado_por) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documentos_created_at 
ON public.documentos_precatorio(created_at DESC) 
WHERE deleted_at IS NULL;

-- 4. Adicionar comentários
COMMENT ON TABLE public.documentos_precatorio IS 
'Armazena metadados dos documentos anexados aos precatórios';

COMMENT ON COLUMN public.documentos_precatorio.tipo_documento IS 
'Tipo/categoria do documento (ofício, RG, CPF, certidões, etc.)';

COMMENT ON COLUMN public.documentos_precatorio.storage_path IS 
'Caminho do arquivo no storage (ex: precatorios-documentos/{precatorio_id}/{tipo}/{arquivo})';

COMMENT ON COLUMN public.documentos_precatorio.opcional IS 
'Indica se o documento é opcional ou obrigatório';

-- 5. Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_documentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger se já existir
DROP TRIGGER IF EXISTS trigger_documentos_updated_at ON public.documentos_precatorio;

-- Criar trigger
CREATE TRIGGER trigger_documentos_updated_at
BEFORE UPDATE ON public.documentos_precatorio
FOR EACH ROW
EXECUTE FUNCTION update_documentos_updated_at();

-- 6. Habilitar RLS
ALTER TABLE public.documentos_precatorio ENABLE ROW LEVEL SECURITY;

-- 7. Criar policies de RLS

-- Remover policies se já existirem
DROP POLICY IF EXISTS "Ver documentos dos precatórios acessíveis" ON public.documentos_precatorio;
DROP POLICY IF EXISTS "Anexar documentos aos precatórios acessíveis" ON public.documentos_precatorio;
DROP POLICY IF EXISTS "Atualizar próprios documentos ou admin" ON public.documentos_precatorio;
DROP POLICY IF EXISTS "Remover próprios documentos ou admin" ON public.documentos_precatorio;

-- Policy: Ver documentos
-- Usuários podem ver documentos dos precatórios que têm acesso
CREATE POLICY "Ver documentos dos precatórios acessíveis"
ON public.documentos_precatorio
FOR SELECT
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.precatorios p
    WHERE p.id = documentos_precatorio.precatorio_id
      AND p.deleted_at IS NULL
      AND (
        p.criado_por = auth.uid() OR
        p.responsavel = auth.uid() OR
        p.responsavel_calculo_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.usuarios u
          WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
      )
  )
);

-- Policy: Anexar documentos
-- Usuários podem anexar documentos aos precatórios que têm acesso
CREATE POLICY "Anexar documentos aos precatórios acessíveis"
ON public.documentos_precatorio
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.precatorios p
    WHERE p.id = documentos_precatorio.precatorio_id
      AND p.deleted_at IS NULL
      AND (
        p.criado_por = auth.uid() OR
        p.responsavel = auth.uid() OR
        p.responsavel_calculo_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.usuarios u
          WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
      )
  )
);

-- Policy: Atualizar documentos
-- Apenas quem anexou ou admin pode atualizar
CREATE POLICY "Atualizar próprios documentos ou admin"
ON public.documentos_precatorio
FOR UPDATE
USING (
  deleted_at IS NULL
  AND (
    enviado_por = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
  )
);

-- Policy: Remover documentos (soft delete)
-- Apenas quem anexou ou admin pode remover
CREATE POLICY "Remover próprios documentos ou admin"
ON public.documentos_precatorio
FOR UPDATE
USING (
  enviado_por = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
);

-- 8. Criar view para documentos com informações do usuário
CREATE OR REPLACE VIEW public.documentos_precatorio_view AS
SELECT 
  d.id,
  d.precatorio_id,
  d.tipo_documento,
  d.nome_arquivo,
  d.tamanho_bytes,
  d.mime_type,
  d.storage_path,
  d.storage_url,
  d.observacao,
  d.opcional,
  d.created_at,
  d.updated_at,
  u.nome as enviado_por_nome,
  u.email as enviado_por_email,
  d.enviado_por as enviado_por_id
FROM public.documentos_precatorio d
LEFT JOIN public.usuarios u ON d.enviado_por = u.id
WHERE d.deleted_at IS NULL;

-- 9. Conceder permissões
GRANT SELECT ON public.documentos_precatorio TO authenticated;
GRANT INSERT ON public.documentos_precatorio TO authenticated;
GRANT UPDATE ON public.documentos_precatorio TO authenticated;
GRANT SELECT ON public.documentos_precatorio_view TO authenticated;

-- =====================================================
-- TESTES
-- =====================================================

-- Teste 1: Verificar se a tabela foi criada
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'documentos_precatorio';

-- Teste 2: Verificar colunas
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'documentos_precatorio'
ORDER BY ordinal_position;

-- Teste 3: Verificar índices
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'documentos_precatorio'
ORDER BY indexname;

-- Teste 4: Verificar policies
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'documentos_precatorio'
ORDER BY policyname;

-- Teste 5: Verificar view
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'documentos_precatorio_view';

-- Teste 6: Verificar enum
SELECT 
  enumlabel
FROM pg_enum
WHERE enumtypid = 'tipo_documento_enum'::regtype
ORDER BY enumsortorder;

-- =====================================================
-- ROLLBACK (se necessário)
-- =====================================================
-- DROP VIEW IF EXISTS public.documentos_precatorio_view;
-- DROP TABLE IF EXISTS public.documentos_precatorio CASCADE;
-- DROP TYPE IF EXISTS tipo_documento_enum CASCADE;
-- DROP FUNCTION IF EXISTS update_documentos_updated_at() CASCADE;

-- =====================================================
-- NOTAS
-- =====================================================
-- Esta tabela armazena apenas METADADOS dos documentos.
-- Os arquivos físicos são armazenados no Supabase Storage.
--
-- Estrutura de pastas no storage:
-- precatorios-documentos/
--   {precatorio_id}/
--     {tipo_documento}/
--       {timestamp}_{nome_arquivo}
--
-- Tipos de documentos suportados:
-- 1. oficio_requisitorio - Ofício requisitório
-- 2. credor_rg - RG do credor
-- 3. credor_cpf - CPF do credor
-- 4. certidao_casamento - Certidão de casamento
-- 5. certidao_nascimento - Certidão de nascimento
-- 6. comprovante_residencia - Comprovante de residência
-- 9. dados_bancarios - Dados bancários
-- 10. certidao_negativa_municipal - Certidão negativa municipal
-- 11. certidao_negativa_estadual - Certidão negativa estadual
-- 12. certidao_negativa_federal - Certidão negativa federal
-- 13. documento_conjuge - Documentos do cônjuge
-- 14. documento_advogado - Documentos do advogado
-- 15. outros - Outros documentos
--
-- Validações no frontend:
-- - Tamanho máximo: 10MB
-- - Extensões aceitas: .pdf, .jpg, .jpeg, .png, .doc, .docx
-- - Nome do arquivo: sanitizado
-- =====================================================
