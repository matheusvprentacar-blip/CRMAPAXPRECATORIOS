-- =====================================================
-- POLICY PERMISSIVA FINAL: Permitir exclusão de documentos
-- =====================================================
-- Regras:
-- 1. Admin pode tudo
-- 2. Criador do precatório pode deletar documentos
-- 3. Responsável comercial pode deletar documentos
-- 4. Responsável de cálculo pode deletar documentos
-- 5. Quem enviou o documento pode deletar

-- 1. Remover policy de UPDATE atual
DROP POLICY IF EXISTS "update_documentos" ON public.documentos_precatorio;

-- 2. Criar policy PERMISSIVA de UPDATE
CREATE POLICY "update_documentos"
ON public.documentos_precatorio
FOR UPDATE
USING (
  -- Usuário autenticado
  auth.uid() IS NOT NULL
  AND
  (
    -- 1. É admin (pode tudo)
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- 2. É quem enviou o documento
    enviado_por = auth.uid()
    OR
    -- 3. É criador do precatório
    EXISTS (
      SELECT 1 FROM public.precatorios p
      WHERE p.id = documentos_precatorio.precatorio_id
        AND p.criado_por = auth.uid()
    )
    OR
    -- 4. É responsável comercial do precatório
    EXISTS (
      SELECT 1 FROM public.precatorios p
      WHERE p.id = documentos_precatorio.precatorio_id
        AND p.responsavel = auth.uid()
    )
    OR
    -- 5. É responsável de cálculo do precatório
    EXISTS (
      SELECT 1 FROM public.precatorios p
      WHERE p.id = documentos_precatorio.precatorio_id
        AND p.responsavel_calculo_id = auth.uid()
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

-- 4. Testar permissões (substitua os IDs)
SELECT 
  'Teste de Permissões' as titulo,
  auth.uid() as meu_id,
  EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND role = 'admin'
  ) as sou_admin,
  (SELECT enviado_por FROM documentos_precatorio WHERE id = 'bf0f685c-9f2d-476e-856d-20b5e591a06c') = auth.uid() as sou_quem_enviou,
  EXISTS (
    SELECT 1 FROM public.precatorios p
    JOIN documentos_precatorio d ON d.precatorio_id = p.id
    WHERE d.id = 'bf0f685c-9f2d-476e-856d-20b5e591a06c'
      AND p.criado_por = auth.uid()
  ) as sou_criador_precatorio,
  EXISTS (
    SELECT 1 FROM public.precatorios p
    JOIN documentos_precatorio d ON d.precatorio_id = p.id
    WHERE d.id = 'bf0f685c-9f2d-476e-856d-20b5e591a06c'
      AND p.responsavel = auth.uid()
  ) as sou_responsavel_comercial,
  EXISTS (
    SELECT 1 FROM public.precatorios p
    JOIN documentos_precatorio d ON d.precatorio_id = p.id
    WHERE d.id = 'bf0f685c-9f2d-476e-856d-20b5e591a06c'
      AND p.responsavel_calculo_id = auth.uid()
  ) as sou_responsavel_calculo;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- Query 3: Deve mostrar "SEM WITH CHECK ✅"
-- Query 4: Pelo menos 1 campo deve ser TRUE para você ter permissão
-- =====================================================

-- =====================================================
-- IMPORTANTE:
-- =====================================================
-- Esta policy permite que QUALQUER pessoa com acesso ao precatório
-- possa deletar documentos, não apenas quem enviou.
--
-- Permissões:
-- ✅ Admin
-- ✅ Criador do precatório
-- ✅ Responsável comercial
-- ✅ Responsável de cálculo
-- ✅ Quem enviou o documento
-- =====================================================
