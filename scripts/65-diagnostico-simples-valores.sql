-- =====================================================
-- DIAGNÓSTICO SIMPLES: Ver valores dos precatórios
-- =====================================================

-- 1. Ver TODOS os precatórios com seus valores
SELECT 
  id,
  titulo,
  valor_principal,
  valor_atualizado,
  COALESCE(valor_atualizado, valor_principal) as valor_para_filtro,
  status,
  created_at
FROM public.precatorios
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- 2. Estatísticas dos valores
SELECT 
  COUNT(*) as total_precatorios,
  COUNT(valor_principal) as tem_valor_principal,
  COUNT(valor_atualizado) as tem_valor_atualizado,
  MIN(COALESCE(valor_atualizado, valor_principal)) as menor_valor,
  MAX(COALESCE(valor_atualizado, valor_principal)) as maior_valor,
  AVG(COALESCE(valor_atualizado, valor_principal)) as valor_medio
FROM public.precatorios
WHERE deleted_at IS NULL;

-- 3. Contar precatórios por faixa de valor
SELECT 
  CASE 
    WHEN COALESCE(valor_atualizado, valor_principal) IS NULL THEN 'SEM VALOR'
    WHEN COALESCE(valor_atualizado, valor_principal) < 1000 THEN 'Até R$ 1.000'
    WHEN COALESCE(valor_atualizado, valor_principal) < 10000 THEN 'R$ 1.000 - R$ 10.000'
    WHEN COALESCE(valor_atualizado, valor_principal) < 50000 THEN 'R$ 10.000 - R$ 50.000'
    WHEN COALESCE(valor_atualizado, valor_principal) < 100000 THEN 'R$ 50.000 - R$ 100.000'
    ELSE 'Acima de R$ 100.000'
  END as faixa,
  COUNT(*) as quantidade
FROM public.precatorios
WHERE deleted_at IS NULL
GROUP BY faixa
ORDER BY MIN(COALESCE(valor_atualizado, valor_principal, 0));
