-- Migration 161: Calculator History Schema (Task 1.2)
-- Tabela para auditar e versionar cada execução de cálculo

CREATE TABLE IF NOT EXISTS public.precatorio_calculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relacionamento
    precatorio_id UUID NOT NULL REFERENCES public.precatorios(id) ON DELETE CASCADE,
    
    -- Versionamento
    calc_version INTEGER NOT NULL DEFAULT 1, -- Versão incremental do cálculo para este precatório
    rule_version TEXT NOT NULL, -- Ex: 'v2.0-ec113' ou 'v2.1-cnj207'
    
    -- Dados Completos (Snapshots)
    inputs JSONB NOT NULL, -- O que entrou (DadosEntrada)
    outputs JSONB NOT NULL, -- O que saiu (ResultadoCalculo: valor_atualizado, liquido, etc)
    detalhamento JSONB, -- Memória detalhada (array de meses, etc)
    
    -- Rastreabilidade de Índices
    indices_snapshot JSONB, -- Cópia dos índices usados (para garantir reprodutibilidade)
    indices_hash TEXT, -- Hash SHA256 dos índices para comparação rápida
    
    -- Auditoria
    created_by UUID REFERENCES auth.users(id), -- Quem disparou
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadados
    is_active BOOLEAN DEFAULT true, -- Se é o cálculo "vigente"
    execution_time_ms INTEGER -- Performance tracking
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_precatorio_calculos_precatorio_id 
    ON public.precatorio_calculos(precatorio_id);

CREATE INDEX IF NOT EXISTS idx_precatorio_calculos_created_at 
    ON public.precatorio_calculos(created_at);

-- RLS
ALTER TABLE public.precatorio_calculos ENABLE ROW LEVEL SECURITY;

-- Leitura: Usuários com acesso ao precatório podem ver os cálculos
CREATE POLICY "Calculos_Select_Access" 
    ON public.precatorio_calculos FOR SELECT 
    TO authenticated 
    USING (
        -- Simplificação: Se tenho acesso ao precatório pai, tenho acesso ao cálculo
        EXISTS ( SELECT 1 FROM public.precatorios p WHERE p.id = precatorio_id )
        -- Poderia refinar com policies da tabela precatorios se necessário
    );

-- Inserção: Autenticados podem criar (ao rodar a calculadora)
CREATE POLICY "Calculos_Insert_Authenticated" 
    ON public.precatorio_calculos FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

COMMENT ON TABLE public.precatorio_calculos IS 'Histórico imutável de execuções da calculadora (V2)';
