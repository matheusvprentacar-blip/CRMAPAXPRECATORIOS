-- =====================================================
-- SOLUÇÃO TEMPORÁRIA: Desabilitar RLS para testes
-- =====================================================
-- ⚠️ ATENÇÃO: Isso remove a segurança!
-- Use apenas para testes em desenvolvimento
-- NÃO use em produção!

-- 1. Desabilitar RLS na tabela documentos_precatorio
ALTER TABLE public.documentos_precatorio DISABLE ROW LEVEL SECURITY;

-- 2. Verificar se RLS foi desabilitado
SELECT 
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'documentos_precatorio';

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- rls_habilitado: false (desabilitado)
-- =====================================================

-- =====================================================
-- PARA REABILITAR RLS DEPOIS:
-- =====================================================
-- ALTER TABLE public.documentos_precatorio ENABLE ROW LEVEL SECURITY;
-- =====================================================

-- =====================================================
-- IMPORTANTE:
-- =====================================================
-- Com RLS desabilitado, QUALQUER usuário autenticado
-- pode fazer UPDATE/DELETE em qualquer documento!
--
-- Use apenas para:
-- 1. Testar se o problema é realmente RLS
-- 2. Desenvolvimento local
-- 3. Testes rápidos
--
-- Depois de confirmar que funciona, REABILITE o RLS!
-- =====================================================
