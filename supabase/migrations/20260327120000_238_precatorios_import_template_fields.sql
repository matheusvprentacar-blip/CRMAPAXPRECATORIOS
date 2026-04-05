BEGIN;

ALTER TABLE public.precatorios
  ADD COLUMN IF NOT EXISTS credor_data_nascimento DATE,
  ADD COLUMN IF NOT EXISTS credor_profissao TEXT,
  ADD COLUMN IF NOT EXISTS credor_estado_civil TEXT,
  ADD COLUMN IF NOT EXISTS conjuge_nome TEXT,
  ADD COLUMN IF NOT EXISTS conjuge_cpf_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS advogado_oab TEXT,
  ADD COLUMN IF NOT EXISTS advogado_telefone TEXT,
  ADD COLUMN IF NOT EXISTS herdeiro TEXT,
  ADD COLUMN IF NOT EXISTS herdeiro_cpf TEXT,
  ADD COLUMN IF NOT EXISTS herdeiro_telefone TEXT,
  ADD COLUMN IF NOT EXISTS herdeiro_endereco TEXT,
  ADD COLUMN IF NOT EXISTS banco TEXT,
  ADD COLUMN IF NOT EXISTS agencia TEXT,
  ADD COLUMN IF NOT EXISTS conta TEXT,
  ADD COLUMN IF NOT EXISTS tipo_conta TEXT,
  ADD COLUMN IF NOT EXISTS chave_pix TEXT,
  ADD COLUMN IF NOT EXISTS tipo_chave_pix TEXT,
  ADD COLUMN IF NOT EXISTS observacoes_bancarias TEXT,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS raw_text TEXT,
  ADD COLUMN IF NOT EXISTS pontos_importantes JSONB,
  ADD COLUMN IF NOT EXISTS detalhes JSONB;

COMMENT ON COLUMN public.precatorios.credor_data_nascimento IS 'Data de nascimento do credor importada por template.';
COMMENT ON COLUMN public.precatorios.credor_profissao IS 'Profissao declarada do credor.';
COMMENT ON COLUMN public.precatorios.credor_estado_civil IS 'Estado civil declarado do credor.';
COMMENT ON COLUMN public.precatorios.conjuge_nome IS 'Nome do conjuge relacionado ao credor.';
COMMENT ON COLUMN public.precatorios.conjuge_cpf_cnpj IS 'CPF/CNPJ do conjuge relacionado ao credor.';
COMMENT ON COLUMN public.precatorios.advogado_oab IS 'Numero da OAB do advogado principal.';
COMMENT ON COLUMN public.precatorios.advogado_telefone IS 'Telefone do advogado principal.';
COMMENT ON COLUMN public.precatorios.herdeiro IS 'Nome do herdeiro principal informado no template.';
COMMENT ON COLUMN public.precatorios.herdeiro_cpf IS 'CPF do herdeiro principal informado no template.';
COMMENT ON COLUMN public.precatorios.herdeiro_telefone IS 'Telefone do herdeiro principal informado no template.';
COMMENT ON COLUMN public.precatorios.herdeiro_endereco IS 'Endereco do herdeiro principal informado no template.';
COMMENT ON COLUMN public.precatorios.banco IS 'Banco informado para pagamento.';
COMMENT ON COLUMN public.precatorios.agencia IS 'Agencia bancaria informada para pagamento.';
COMMENT ON COLUMN public.precatorios.conta IS 'Conta bancaria informada para pagamento.';
COMMENT ON COLUMN public.precatorios.tipo_conta IS 'Tipo da conta bancaria informada para pagamento.';
COMMENT ON COLUMN public.precatorios.chave_pix IS 'Chave PIX informada para pagamento.';
COMMENT ON COLUMN public.precatorios.tipo_chave_pix IS 'Tipo da chave PIX informada.';
COMMENT ON COLUMN public.precatorios.observacoes_bancarias IS 'Observacoes complementares sobre os dados bancarios.';
COMMENT ON COLUMN public.precatorios.observacoes IS 'Observacoes livres consolidadas do precatorio.';
COMMENT ON COLUMN public.precatorios.raw_text IS 'Texto bruto extraido de OCR ou importacao.';
COMMENT ON COLUMN public.precatorios.pontos_importantes IS 'Lista estruturada de pontos importantes importados do template.';
COMMENT ON COLUMN public.precatorios.detalhes IS 'Metadados estruturados adicionais importados do template.';

COMMIT;
