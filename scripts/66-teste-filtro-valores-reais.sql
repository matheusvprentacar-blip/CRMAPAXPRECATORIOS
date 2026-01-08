-- =====================================================
-- TESTE: Filtrar com valores reais do sistema
-- =====================================================

-- Seus precatórios têm valores até R$ 1.000
-- Vamos testar filtros que DEVEM funcionar:

-- 1. Buscar precatórios com valor até R$ 1.000 (1000)
SELECT COUNT(*) as total, 'Até 1000' as teste
FROM buscar_precatorios_global(
  p_valor_max := 1000
);

-- 2. Buscar precatórios com valor até R$ 2.000 (2000)
SELECT COUNT(*) as total, 'Até 2000' as teste
FROM buscar_precatorios_global(
  p_valor_max := 2000
);

-- 3. Buscar precatórios entre R$ 0 e R$ 1.000 (0 a 1000)
SELECT COUNT(*) as total, 'De 0 até 1000' as teste
FROM buscar_precatorios_global(
  p_valor_min := 0,
  p_valor_max := 1000
);

-- 4. Buscar precatórios entre R$ 100 e R$ 900 (100 a 900)
SELECT COUNT(*) as total, 'De 100 até 900' as teste
FROM buscar_precatorios_global(
  p_valor_min := 100,
  p_valor_max := 900
);

-- 5. Ver os valores EXATOS dos seus precatórios
SELECT 
  titulo,
  valor_principal,
  valor_atualizado,
  COALESCE(valor_atualizado, valor_principal) as valor_usado
FROM public.precatorios
WHERE deleted_at IS NULL
ORDER BY COALESCE(valor_atualizado, valor_principal);

-- 6. Testar se a função está sendo chamada corretamente
SELECT 
  titulo,
  valor_principal,
  valor_atualizado
FROM buscar_precatorios_global(
  p_valor_min := 0,
  p_valor_max := 1000
);
