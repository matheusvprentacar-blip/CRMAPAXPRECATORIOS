-- =====================================================
-- SCRIPT 113: Adicionar Dados Bancários
-- =====================================================
-- Descrição: Adiciona colunas para armazenar dados bancários do credor/cliente
--            na tabela precatorios.
-- =====================================================

ALTER TABLE public.precatorios
ADD COLUMN IF NOT EXISTS banco TEXT,
ADD COLUMN IF NOT EXISTS agencia TEXT,
ADD COLUMN IF NOT EXISTS conta TEXT,
ADD COLUMN IF NOT EXISTS tipo_conta TEXT, -- 'corrente', 'poupanca', 'pagamento'
ADD COLUMN IF NOT EXISTS chave_pix TEXT,
ADD COLUMN IF NOT EXISTS tipo_chave_pix TEXT, -- 'cpf', 'cnpj', 'email', 'telefone', 'aleatoria'
ADD COLUMN IF NOT EXISTS observacoes_bancarias TEXT;

-- Comentários para documentação
COMMENT ON COLUMN public.precatorios.banco IS 'Nome ou Código do Banco';
COMMENT ON COLUMN public.precatorios.agencia IS 'Número da Agência';
COMMENT ON COLUMN public.precatorios.conta IS 'Número da Conta com Dígito';
COMMENT ON COLUMN public.precatorios.tipo_conta IS 'Tipo da Conta: corrente, poupanca, etc';
COMMENT ON COLUMN public.precatorios.chave_pix IS 'Chave PIX do cliente';
