-- Adiciona suporte ao status/localização 'sem_interesse' se ainda não existir
-- Nota: 'sem_interesse' precisará ser adicionado ao Frontend como coluna

-- Adiciona colunas para o fluxo de "Sem Interesse"
ALTER TABLE precatorios
ADD COLUMN IF NOT EXISTS motivo_sem_interesse TEXT,
ADD COLUMN IF NOT EXISTS data_recontato DATE;

-- Index para facilitar a busca de precatórios agendados para recontato
CREATE INDEX IF NOT EXISTS idx_precatorios_data_recontato ON precatorios(data_recontato) WHERE data_recontato IS NOT NULL;
