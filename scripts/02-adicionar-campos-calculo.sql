-- ========================================
-- SCRIPT 02: Adicionar Campos de Cálculo
-- ========================================
-- Este script adiciona as colunas necessárias para armazenar
-- os resultados dos cálculos de precatórios.

-- Adicionar campos para armazenar os resultados do cálculo
ALTER TABLE public.precatorios
  ADD COLUMN IF NOT EXISTS irpf_total NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS pss_total NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS valor_liquido_credor NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS menor_proposta NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS maior_proposta NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS proposta_enviada_cliente NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS taxa_juros_moratorios NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS qtd_salarios_minimos NUMERIC(15,4),
  ADD COLUMN IF NOT EXISTS calculo_json JSONB;

-- Adicionar índice para buscar precatórios com cálculo
CREATE INDEX IF NOT EXISTS idx_precatorios_calculo_completo 
  ON precatorios(id) 
  WHERE calculo_json IS NOT NULL;

-- Adicionar comentários para documentação
COMMENT ON COLUMN precatorios.irpf_total IS 'Total de IRPF calculado';
COMMENT ON COLUMN precatorios.pss_total IS 'Total de PSS calculado';
COMMENT ON COLUMN precatorios.valor_liquido_credor IS 'Valor líquido após todos os descontos';
COMMENT ON COLUMN precatorios.menor_proposta IS 'Menor proposta calculada';
COMMENT ON COLUMN precatorios.maior_proposta IS 'Maior proposta calculada';
COMMENT ON COLUMN precatorios.proposta_enviada_cliente IS 'Proposta efetivamente enviada ao cliente (editável por comercial)';
COMMENT ON COLUMN precatorios.taxa_juros_moratorios IS 'Taxa de juros moratórios aplicada';
COMMENT ON COLUMN precatorios.qtd_salarios_minimos IS 'Quantidade de salários mínimos';
COMMENT ON COLUMN precatorios.calculo_json IS 'JSON completo com todos os detalhes do cálculo';
