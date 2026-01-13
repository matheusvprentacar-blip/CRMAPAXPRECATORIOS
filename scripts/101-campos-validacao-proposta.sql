-- =====================================================
-- SCRIPT 101: Campos de Validação para Proposta
-- =====================================================
-- Descrição: Adiciona flags de validação e campos de controle
--            para o sistema de geração de propostas.
-- =====================================================

ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS validacao_calculo_ok BOOLEAN DEFAULT false;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS validacao_juridico_ok BOOLEAN DEFAULT false;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS validacao_comercial_ok BOOLEAN DEFAULT false;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS validacao_admin_ok BOOLEAN DEFAULT false;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS documento_codigo_interno TEXT;

-- Adicionar comentários explicativos
COMMENT ON COLUMN public.precatorios.validacao_calculo_ok IS 'Indica se o cálculo foi validado pelo operador de cálculo.';
COMMENT ON COLUMN public.precatorios.validacao_juridico_ok IS 'Indica se o jurídico validou o precatório.';
COMMENT ON COLUMN public.precatorios.validacao_comercial_ok IS 'Indica se o comercial validou o precatório.';
COMMENT ON COLUMN public.precatorios.validacao_admin_ok IS 'Indica se o admin validou o precatório.';
COMMENT ON COLUMN public.precatorios.documento_codigo_interno IS 'Código interno único gerado para a proposta.';
