-- Migration 235: Adiciona campo origem_lead na tabela precatorios
-- Rastreia a origem do lead (canal de captação) para fins de CRM e análise de funil.

ALTER TABLE precatorios
  ADD COLUMN IF NOT EXISTS origem_lead TEXT;

-- Índice para facilitar relatórios por canal de origem
CREATE INDEX IF NOT EXISTS idx_precatorios_origem_lead ON precatorios(origem_lead);

-- Atualiza a view listar_clientes_resumo para expor origem_lead quando todos os
-- precatórios de um credor têm a mesma origem (campo informativo, não agg).
-- A view não é recriada aqui pois depende do schema existente; o campo estará
-- disponível via SELECT * FROM precatorios diretamente.
