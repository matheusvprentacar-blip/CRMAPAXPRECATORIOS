-- =====================================================
-- SOLUÇÃO FINAL: Permitir soft delete via aplicação
-- =====================================================
-- Problema: RLS policies bloqueiam UPDATE mesmo com permissão
-- Solução: Simplificar policy para permitir UPDATE de quem tem acesso

-- 1. Remover policy de UPDATE atual
DROP POLICY IF EXISTS "update_documentos" ON public.documentos_precatorio;

-- 2. Criar policy PERMISSIVA de UPDATE
-- Permite UPDATE se o usuário está autenticado E tem acesso ao precatório
CREATE POLICY "update_documentos"
ON public.documentos_precatorio
FOR UPDATE
USING (
  -- Usuário autenticado
  auth.uid() IS NOT NULL
  AND
  (
    -- É admin
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- É quem enviou
    enviado_por = auth.uid()
    OR
    -- Tem acesso ao precatório (criador, responsável ou responsável cálculo)
    EXISTS (
      SELECT 1 FROM public.precatorios p
      WHERE p.id = documentos_precatorio.precatorio_id
        AND (
          p.criado_por = auth.uid() OR
          p.responsavel = auth.uid() OR
          p.responsavel_calculo_id = auth.uid()
        )
    )
  )
);

-- 3. Verificar policy criada
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN with_check IS NOT NULL THEN 'TEM WITH CHECK ⚠️'
    ELSE 'SEM WITH CHECK ✅'
  END as with_check_status
FROM pg_policies 
WHERE tablename = 'documentos_precatorio'
  AND cmd = 'UPDATE';

-- =====================================================
-- TESTE DIRETO (como admin via service_role)
-- =====================================================
-- Este UPDATE deve funcionar porque bypassa RLS:
-- UPDATE documentos_precatorio 
-- SET deleted_at = NOW() 
-- WHERE id = 'bf0f685c-9f2d-476e-856d-20b5e591a06c';

-- =====================================================
-- IMPORTANTE:
-- =====================================================
-- A policy acima vai funcionar na APLICAÇÃO porque:
-- 1. auth.uid() retorna o ID do usuário logado
-- 2. O usuário tem acesso ao precatório
-- 
-- Mas NÃO funciona no SQL Editor porque:
-- 1. auth.uid() retorna NULL (sem autenticação)
-- 2. Por isso todos os checks falham
--
-- Para testar no SQL Editor, use service_role key ou
-- teste direto na aplicação!
-- =====================================================
