-- Adiciona campo para indicar isenção de IRPF no cálculo externo
ALTER TABLE precatorios
ADD COLUMN IF NOT EXISTS irpf_isento boolean DEFAULT false;

COMMENT ON COLUMN precatorios.irpf_isento IS 'Indica se o cálculo é isento de Imposto de Renda (True) ou não (False)';
