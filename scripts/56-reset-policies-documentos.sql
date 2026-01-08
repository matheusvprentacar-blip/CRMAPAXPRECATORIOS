-- =====================================================
-- RESET COMPLETO: Policies de documentos_precatorio
-- =====================================================
-- Remove TODAS as policies e recria de forma simples
-- SEM WITH CHECK para permitir soft delete

-- 1. REMOVER TODAS AS POLICIES EXISTENTES
DROP POLICY IF EXISTS "Ver documentos dos precatórios acessíveis" ON public.documentos_precatorio;
DROP POLICY IF EXISTS "Anexar documentos aos precatórios acessíveis" ON public.documentos_precatorio;
DROP POLICY IF EXISTS "Atualizar próprios documentos ou admin" ON public.documentos_precatorio;
DROP POLICY IF EXISTS "Remover próprios documentos ou admin" ON public.documentos_precatorio;
DROP POLICY IF EXISTS "Usuarios podem ver documentos" ON public.documentos_precatorio;
DROP POLICY IF EXISTS "Usuarios podem inserir documentos" ON public.documentos_precatorio;
DROP POLICY IF EXISTS "Usuarios podem atualizar documentos" ON public.documentos_precatorio;
DROP POLICY IF EXISTS "Usuarios podem fazer soft delete" ON public.documentos_precatorio;
DROP POLICY IF EXISTS "Atualizar ou remover documentos" ON public.documentos_precatorio;

-- 2. CRIAR POLICY DE SELECT (Ver documentos)
CREATE POLICY "select_documentos"
ON public.documentos_precatorio
FOR SELECT
USING (
  deleted_at IS NULL
  AND (
    -- Admin vê tudo
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- Vê se tem acesso ao precatório
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
);

-- 3. CRIAR POLICY DE INSERT (Anexar documentos)
CREATE POLICY "insert_documentos"
ON public.documentos_precatorio
FOR INSERT
WITH CHECK (
  -- Admin pode inserir em qualquer precatório
  EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND role = 'admin'
  )
  OR
  -- Pode inserir se tem acesso ao precatório
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

-- 4. CRIAR POLICY DE UPDATE (Editar E Soft Delete)
-- IMPORTANTE: SEM WITH CHECK!
CREATE POLICY "update_documentos"
ON public.documentos_precatorio
FOR UPDATE
USING (
  -- Pode atualizar se:
  -- 1. É admin
  EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND role = 'admin'
  )
  OR
  -- 2. É quem enviou o documento
  enviado_por = auth.uid()
  OR
  -- 3. Tem acesso ao precatório
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
-- NOTA: Sem WITH CHECK = permite qualquer UPDATE (incluindo soft delete)

-- 5. VERIFICAR POLICIES CRIADAS
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'TEM USING'
    ELSE 'SEM USING'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'TEM WITH CHECK ⚠️'
    ELSE 'SEM WITH CHECK ✅'
  END as with_check_clause
FROM pg_policies 
WHERE tablename = 'documentos_precatorio'
ORDER BY cmd, policyname;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- Deve mostrar 3 policies:
-- 1. select_documentos (SELECT) - TEM USING, SEM WITH CHECK ✅
-- 2. insert_documentos (INSERT) - TEM USING, TEM WITH CHECK ✅
-- 3. update_documentos (UPDATE) - TEM USING, SEM WITH CHECK ✅ ← IMPORTANTE!
-- =====================================================

-- =====================================================
-- TESTE MANUAL
-- =====================================================
-- Para testar soft delete:
-- UPDATE documentos_precatorio 
-- SET deleted_at = NOW() 
-- WHERE id = 'bf0f685c-9f2d-476e-856d-20b5e591a06c';
-- 
-- Deve funcionar se você tiver permissão (admin, enviou, ou tem acesso ao precatório)
-- =====================================================
