-- Adiciona coluna natureza (Alimentar / Comum)
ALTER TABLE precatorios
ADD COLUMN IF NOT EXISTS natureza TEXT CHECK (natureza IN ('Alimentar', 'Comum'));

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_precatorios_natureza ON precatorios(natureza);
