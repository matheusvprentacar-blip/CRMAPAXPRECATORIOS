-- =====================================================
-- FIX: Preencher enviado_por NULL em documentos existentes
-- =====================================================
-- Problema: Documentos criados sem enviado_por não podem ser deletados
-- Solução: Atribuir ao criador do precatório ou ao primeiro admin

-- 1. Atualizar documentos órfãos (enviado_por = NULL)
-- Atribuir ao criador do precatório
UPDATE public.documentos_precatorio d
SET enviado_por = p.criado_por
FROM public.precatorios p
WHERE d.precatorio_id = p.id
  AND d.enviado_por IS NULL
  AND p.criado_por IS NOT NULL;

-- 2. Se ainda houver documentos órfãos (precatório sem criador)
-- Atribuir ao primeiro admin encontrado
UPDATE public.documentos_precatorio
SET enviado_por = (
  SELECT id FROM public.usuarios 
  WHERE role = 'admin' 
  LIMIT 1
)
WHERE enviado_por IS NULL;

-- 3. Verificar resultado
SELECT 
  COUNT(*) FILTER (WHERE enviado_por IS NULL) as documentos_sem_dono,
  COUNT(*) FILTER (WHERE enviado_por IS NOT NULL) as documentos_com_dono,
  COUNT(*) as total
FROM public.documentos_precatorio
WHERE deleted_at IS NULL;

-- 4. Listar documentos que foram corrigidos
SELECT 
  d.id,
  d.nome_arquivo,
  d.tipo_documento,
  d.enviado_por,
  u.nome as enviado_por_nome,
  u.role as enviado_por_role
FROM public.documentos_precatorio d
LEFT JOIN public.usuarios u ON u.id = d.enviado_por
WHERE d.deleted_at IS NULL
ORDER BY d.created_at DESC
LIMIT 20;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- Query 3: Deve mostrar 0 documentos_sem_dono
-- Query 4: Todos os documentos devem ter enviado_por preenchido
-- =====================================================
