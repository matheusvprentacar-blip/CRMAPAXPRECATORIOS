-- Atualiza todos os registros existentes para CAIXA ALTA
-- Execute no Supabase SQL Editor

-- OBS: Natureza NÃO atualizada pois possui restrição de valores (Check Constraint)
UPDATE public.precatorios
SET
  titulo = UPPER(titulo),
  numero_precatorio = UPPER(numero_precatorio),
  numero_processo = UPPER(numero_processo),
  numero_oficio = UPPER(numero_oficio),
  tribunal = UPPER(tribunal),
  devedor = UPPER(devedor),
  credor_nome = UPPER(credor_nome),
  credor_cidade = UPPER(credor_cidade),
  credor_uf = UPPER(credor_uf)
  -- natureza = UPPER(natureza) -- REMOVIDO PARA EVITAR ERRO DE CHECK CONSTRAINT
WHERE
  deleted_at IS NULL;

-- Retorna a contagem de linhas afetadas
SELECT COUNT(*) as registros_atualizados FROM public.precatorios;
