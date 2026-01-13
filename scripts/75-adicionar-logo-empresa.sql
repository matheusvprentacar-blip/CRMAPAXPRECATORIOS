-- ============================================
-- Script 75: Adicionar Logo da Empresa
-- ============================================
-- Descrição: Cria tabela para armazenar configurações
-- do sistema, incluindo o logo da empresa
-- ============================================

-- 1. Criar tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url TEXT,
  nome_empresa TEXT DEFAULT 'CRM Precatórios',
  subtitulo_empresa TEXT DEFAULT 'Sistema de Gestão',
  cor_primaria TEXT DEFAULT '#3b82f6',
  cor_secundaria TEXT DEFAULT '#8b5cf6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Inserir configuração padrão (apenas se não existir)
INSERT INTO public.configuracoes_sistema (id, nome_empresa, subtitulo_empresa)
SELECT 
  '00000000-0000-0000-0000-000000000001'::UUID,
  'CRM Precatórios',
  'Sistema de Gestão'
WHERE NOT EXISTS (
  SELECT 1 FROM public.configuracoes_sistema WHERE id = '00000000-0000-0000-0000-000000000001'::UUID
);

-- 3. Criar bucket para logos (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Políticas de acesso ao bucket de logos
-- Permitir leitura pública
DROP POLICY IF EXISTS "Logos são públicos" ON storage.objects;
CREATE POLICY "Logos são públicos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- Permitir upload apenas para admins
DROP POLICY IF EXISTS "Admins podem fazer upload de logos" ON storage.objects;
CREATE POLICY "Admins podem fazer upload de logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'logos' 
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Permitir atualização apenas para admins
DROP POLICY IF EXISTS "Admins podem atualizar logos" ON storage.objects;
CREATE POLICY "Admins podem atualizar logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'logos' 
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Permitir exclusão apenas para admins
DROP POLICY IF EXISTS "Admins podem deletar logos" ON storage.objects;
CREATE POLICY "Admins podem deletar logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'logos' 
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- 5. RLS para tabela de configurações
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- Todos podem ler as configurações
DROP POLICY IF EXISTS "Todos podem ler configurações" ON public.configuracoes_sistema;
CREATE POLICY "Todos podem ler configurações"
ON public.configuracoes_sistema FOR SELECT
TO authenticated
USING (true);

-- Apenas admins podem atualizar
DROP POLICY IF EXISTS "Admins podem atualizar configurações" ON public.configuracoes_sistema;
CREATE POLICY "Admins podem atualizar configurações"
ON public.configuracoes_sistema FOR UPDATE
TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 6. Função para atualizar timestamp
CREATE OR REPLACE FUNCTION public.atualizar_updated_at_configuracoes()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger para atualizar timestamp automaticamente
DROP TRIGGER IF EXISTS trigger_atualizar_updated_at_configuracoes ON public.configuracoes_sistema;
CREATE TRIGGER trigger_atualizar_updated_at_configuracoes
  BEFORE UPDATE ON public.configuracoes_sistema
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_updated_at_configuracoes();

-- 8. Comentários
COMMENT ON TABLE public.configuracoes_sistema IS 'Configurações gerais do sistema, incluindo logo e cores da empresa';
COMMENT ON COLUMN public.configuracoes_sistema.logo_url IS 'URL do logo da empresa armazenado no Supabase Storage';
COMMENT ON COLUMN public.configuracoes_sistema.nome_empresa IS 'Nome da empresa exibido no sistema';
COMMENT ON COLUMN public.configuracoes_sistema.subtitulo_empresa IS 'Subtítulo exibido abaixo do nome/logo';

-- 9. Conceder permissões
GRANT SELECT ON public.configuracoes_sistema TO authenticated;
GRANT UPDATE ON public.configuracoes_sistema TO authenticated;

SELECT 'Script 75 executado com sucesso! Tabela de configurações e bucket de logos criados.' as status;
