-- =====================================================
-- FIX: RLS Policy para Soft Delete de Documentos
-- =====================================================
-- Problema: Ao excluir documento (soft delete), a policy
-- de UPDATE não permite porque verifica deleted_at IS NULL
-- Solução: Simplificar policy para permitir soft delete

-- 1. Remover policy de UPDATE antiga
DROP POLICY IF EXISTS "Atualizar próprios documentos ou admin" ON public.documentos_precatorio;
DROP POLICY IF EXISTS "Remover próprios documentos ou admin" ON public.documentos_precatorio;

-- 2. Criar policy de UPDATE unificada (permite edição E soft delete)
CREATE POLICY "Atualizar próprios documentos ou admin"
ON public.documentos_precatorio
FOR UPDATE
USING (
  -- Pode atualizar se:
  -- 1. É admin OU
  -- 2. É quem enviou o documento OU
  -- 3. Tem acesso ao precatório
  EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
  OR
  enviado_por = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.precatorios p
    WHERE p.id = documentos_precatorio.precatorio_id
      AND p.deleted_at IS NULL
      AND (
        p.criado_por = auth.uid() OR
        p.responsavel = auth.uid() OR
        p.responsavel_calculo_id = auth.uid()
      )
  )
)
WITH CHECK (
  -- Permite qualquer UPDATE (incluindo soft delete)
  EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
  OR
  enviado_por = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.precatorios p
    WHERE p.id = documentos_precatorio.precatorio_id
      AND p.deleted_at IS NULL
      AND (
        p.criado_por = auth.uid() OR
        p.responsavel = auth.uid() OR
        p.responsavel_calculo_id = auth.uid()
      )
  )
);

-- 3. Verificar policies criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'documentos_precatorio'
ORDER BY policyname;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- Deve mostrar 3 policies:
-- 1. SELECT - Ver documentos dos precatórios acessíveis
-- 2. INSERT - Anexar documentos aos precatórios acessíveis
-- 3. UPDATE - Atualizar próprios documentos ou admin (permite soft delete)
-- =====================================================

-- =====================================================
-- TESTE
-- =====================================================
-- Para testar o soft delete:
-- UPDATE documentos_precatorio 
-- SET deleted_at = NOW() 
-- WHERE id = 'seu-documento-id';
-- =====================================================
