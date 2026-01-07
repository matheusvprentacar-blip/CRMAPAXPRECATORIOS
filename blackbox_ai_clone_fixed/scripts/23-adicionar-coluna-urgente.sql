-- Adicionar coluna urgente para marcar precatórios prioritários
ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS urgente BOOLEAN DEFAULT false;

-- Criar índice para melhorar performance de ordenação
CREATE INDEX IF NOT EXISTS idx_precatorios_urgente 
ON public.precatorios(urgente, created_at);

-- Comentário
COMMENT ON COLUMN public.precatorios.urgente IS 'Indica se o precatório é urgente e deve ser priorizado na fila';
