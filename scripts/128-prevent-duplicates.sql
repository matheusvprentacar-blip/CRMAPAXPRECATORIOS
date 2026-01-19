-- Bloquear Duplicidade de Precatórios (Com Limpeza de Duplicados)
-- Objetivo: Garantir que não seja possível inserir dois precatórios com o mesmo número
-- Ação Extra: Remove duplicatas existentes mantendo apenas o registro mais recente.

BEGIN;

-- 1. Limpeza de duplicados por 'numero_precatorio'
-- Mantém o que tem data de atualização mais recente
DELETE FROM public.precatorios a USING (
      SELECT MIN(updated_at) as min_date, numero_precatorio
      FROM public.precatorios 
      WHERE numero_precatorio IS NOT NULL AND numero_precatorio != '' AND deleted_at IS NULL
      GROUP BY numero_precatorio HAVING COUNT(*) > 1
    ) b
WHERE a.numero_precatorio = b.numero_precatorio 
AND a.updated_at = b.min_date
AND a.deleted_at IS NULL;

-- 2. Limpeza de duplicados por 'numero_processo'
-- Mantém o que tem data de atualização mais recente
DELETE FROM public.precatorios a USING (
      SELECT MIN(updated_at) as min_date, numero_processo
      FROM public.precatorios 
      WHERE numero_processo IS NOT NULL AND numero_processo != '' AND deleted_at IS NULL
      GROUP BY numero_processo HAVING COUNT(*) > 1
    ) b
WHERE a.numero_processo = b.numero_processo 
AND a.updated_at = b.min_date
AND a.deleted_at IS NULL;

-- 3. Agora sim, criar os índices Unique

-- Index Unique para numero_precatorio (se preenchido e não deletado)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_numero_precatorio 
ON public.precatorios(numero_precatorio) 
WHERE numero_precatorio IS NOT NULL AND numero_precatorio != '' AND deleted_at IS NULL;

-- Index Unique para numero_processo (se preenchido e não deletado)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_numero_processo 
ON public.precatorios(numero_processo) 
WHERE numero_processo IS NOT NULL AND numero_processo != '' AND deleted_at IS NULL;

COMMIT;

-- Verificação
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'precatorios' AND indexname LIKE 'idx_unique%';
