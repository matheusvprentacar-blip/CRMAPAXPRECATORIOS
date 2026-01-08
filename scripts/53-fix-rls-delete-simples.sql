-- =====================================================
-- FIX DEFINITIVO: RLS Policy para Soft Delete
-- =====================================================
-- Problema: Policy WITH CHECK está bloqueando soft delete
-- Solução: Remover WITH CHECK para permitir qualquer UPDATE

-- 1. Remover TODAS as policies de UPDATE
DROP POLICY IF EXISTS "Atualizar próprios documentos ou admin" ON public.documentos_precatorio;
DROP POLICY IF EXISTS "Remover próprios documentos ou admin" ON public.documentos_precatorio;
DROP POLICY IF EXISTS "Usuarios podem atualizar documentos" ON public.documentos_precatorio;
DROP POLICY IF EXISTS "Usuarios podem fazer soft delete" ON public.documentos_precatorio;

-- 2. Criar policy de UPDATE SEM WITH CHECK
-- Isso permite qualquer UPDATE (incluindo soft delete)
CREATE POLICY "Atualizar ou remover documentos"
ON public.documentos_precatorio
FOR UPDATE
USING (
  -- Pode atualizar se:
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
-- Nota: SEM WITH CHECK! Isso permite qualquer UPDATE

-- 3. Verificar policies
SELECT 
  policyname,
  cmd,
  permissive,
  CASE 
    WHEN qual IS NOT NULL THEN 'TEM USING'
    ELSE 'SEM USING'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'TEM WITH CHECK'
    ELSE 'SEM WITH CHECK'
  END as with_check_clause
FROM pg_policies 
WHERE tablename = 'documentos_precatorio'
ORDER BY cmd, policyname;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- Deve mostrar 3 policies:
-- 1. INSERT - Anexar documentos (com USING e WITH CHECK)
-- 2. SELECT - Ver documentos (com USING, sem WITH CHECK)
-- 3. UPDATE - Atualizar ou remover (com USING, SEM WITH CHECK) ← IMPORTANTE
-- =====================================================

-- =====================================================
-- TESTE MANUAL (opcional)
-- =====================================================
-- Para testar se funciona:
-- UPDATE documentos_precatorio 
-- SET deleted_at = NOW() 
-- WHERE id = 'seu-documento-id';
-- =====================================================
