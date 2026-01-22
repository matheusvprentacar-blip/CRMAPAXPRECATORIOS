-- Migration: Create economic_indices table for Calculator V2

CREATE TABLE IF NOT EXISTS public.economic_indices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- 'selic_mensal', 'ipca_e_mensal', 'ipca_mensal'
    reference_date DATE NOT NULL, -- Sempre dia 01 do mês (ex: 2024-01-01)
    value NUMERIC(10, 6) NOT NULL, -- Valor decimal (ex: 0.54 para 0.54%)
    is_percentual BOOLEAN DEFAULT true, -- Se o valor é % ou fator absoluto
    source VARCHAR(100), -- 'bacen', 'ibge', 'tjpr'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Evita duplicidade para o mesmo tipo e data
    CONSTRAINT unique_index_entry UNIQUE(type, reference_date)
);

-- Índices para busca rápida em queries de range
CREATE INDEX IF NOT EXISTS idx_indices_lookup ON public.economic_indices(type, reference_date);

-- Comentários para documentação
COMMENT ON TABLE public.economic_indices IS 'Tabela oficial de índices econômicos para a Calculadora V2';
COMMENT ON COLUMN public.economic_indices.type IS 'Tipo do índice (selic_mensal, ipca_e_mensal, etc)';
COMMENT ON COLUMN public.economic_indices.reference_date IS 'Data de referência (sempre dia 1 do mês)';
COMMENT ON COLUMN public.economic_indices.value IS 'Valor do índice (se percentual, 1.0 = 1%)';

-- RLS Policies (Leitura Pública para autenticados, Escrita restrita)
ALTER TABLE public.economic_indices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos autenticados podem ler indices"
ON public.economic_indices FOR SELECT
TO authenticated
USING (true);

-- Apenas admins/system podem inserir (via script ou job)
-- Ajuste conforme as roles do seu sistema. Por enquanto, permissivo para facilitar migração,
-- ou restrinja se tiver certeza da role de admin.
CREATE POLICY "Admins podem gerenciar indices"
ON public.economic_indices FOR ALL
TO authenticated
USING (
  -- Exemplo genérico, ajuste se tiver função is_admin() ou similar
  EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'gestor_calculo')
  )
);
