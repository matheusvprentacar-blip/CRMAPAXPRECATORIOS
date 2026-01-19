-- Adiciona flags e campos para suportar cálculo externo manual
ALTER TABLE precatorios
ADD COLUMN IF NOT EXISTS calculo_externo boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS memoria_calculo_url text, -- Link para o upload do PDF/Excel
ADD COLUMN IF NOT EXISTS data_calculo_manual timestamp with time zone;

-- Garantir que os campos de proposta e valores suportem null ou sejam preenchidos
-- (Eles já existem, mas verificando para garantir)
-- ADD COLUMN IF NOT EXISTS proposta_menor_valor numeric(15,2);
-- ADD COLUMN IF NOT EXISTS proposta_maior_valor numeric(15,2);
-- ADD COLUMN IF NOT EXISTS base_liquida_final numeric(15,2); -- Novo campo para salvar a base exata

-- Comentário
COMMENT ON COLUMN precatorios.calculo_externo IS 'Indica se os valores foram inseridos manualmente (True) ou pela calculadora interna (False)';
