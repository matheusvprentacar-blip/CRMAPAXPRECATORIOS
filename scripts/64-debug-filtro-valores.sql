-- =====================================================
-- SCRIPT 64: Debug e Correção do Filtro de Valores
-- =====================================================
-- Descrição: Diagnosticar e corrigir problema com filtro
--            de valores quando min E max são informados
-- =====================================================

-- 1. DIAGNÓSTICO: Ver valores reais dos precatórios
SELECT 
  id,
  titulo,
  valor_principal,
  valor_atualizado,
  COALESCE(valor_atualizado, valor_principal) as valor_usado_filtro,
  status
FROM public.precatorios
WHERE deleted_at IS NULL
ORDER BY COALESCE(valor_atualizado, valor_principal) DESC
LIMIT 10;

-- 2. TESTE: Buscar com apenas valor máximo (deve funcionar)
SELECT COUNT(*) as total
FROM public.precatorios
WHERE deleted_at IS NULL
  AND COALESCE(valor_atualizado, valor_principal) <= 100000;

-- 3. TESTE: Buscar com apenas valor mínimo (deve funcionar)
SELECT COUNT(*) as total
FROM public.precatorios
WHERE deleted_at IS NULL
  AND COALESCE(valor_atualizado, valor_principal) >= 10000;

-- 4. TESTE: Buscar com AMBOS (min E max) - PROBLEMA AQUI
SELECT COUNT(*) as total
FROM public.precatorios
WHERE deleted_at IS NULL
  AND COALESCE(valor_atualizado, valor_principal) >= 10000
  AND COALESCE(valor_atualizado, valor_principal) <= 100000;

-- 5. VERIFICAR: Há precatórios nessa faixa?
SELECT 
  COUNT(*) as total_na_faixa,
  MIN(COALESCE(valor_atualizado, valor_principal)) as menor_valor,
  MAX(COALESCE(valor_atualizado, valor_principal)) as maior_valor,
  AVG(COALESCE(valor_atualizado, valor_principal)) as valor_medio
FROM public.precatorios
WHERE deleted_at IS NULL;

-- 6. TESTAR A FUNÇÃO RPC DIRETAMENTE
-- Teste com apenas max
SELECT COUNT(*) FROM buscar_precatorios_global(
  p_valor_max := 100000
);

-- Teste com apenas min
SELECT COUNT(*) FROM buscar_precatorios_global(
  p_valor_min := 10000
);

-- Teste com AMBOS (min E max)
SELECT COUNT(*) FROM buscar_precatorios_global(
  p_valor_min := 10000,
  p_valor_max := 100000
);

-- 7. VER DETALHES DOS RESULTADOS
SELECT 
  titulo,
  valor_principal,
  valor_atualizado,
  COALESCE(valor_atualizado, valor_principal) as valor_filtro
FROM buscar_precatorios_global(
  p_valor_min := 10000,
  p_valor_max := 100000
)
LIMIT 5;

-- =====================================================
-- ANÁLISE DO PROBLEMA
-- =====================================================
-- Se os testes 2 e 3 retornam resultados, mas o teste 4 não,
-- o problema está na combinação dos dois filtros.
--
-- Possíveis causas:
-- 1. Valores NULL em valor_principal E valor_atualizado
-- 2. Valores fora da faixa esperada
-- 3. Problema na função COALESCE
-- 4. Tipo de dado incompatível (NUMERIC vs INTEGER)
-- =====================================================
