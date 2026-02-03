-- RESET FINANCEIRO
-- Objetivo: zerar a aba Financeiro (limpa todas as transacoes).
-- ATENCAO: operacao irreversivel. Use apenas em ambiente seguro.

BEGIN;

-- 1) Limpa todas as transacoes financeiras
DELETE FROM public.financial_transactions;

-- 2) (Opcional) Limpa tabela legada de RH financeiro
-- DELETE FROM public.hr_financials;

-- 3) (Opcional) Se quiser apagar fechamento gravado nos precatorios,
-- descomente o bloco abaixo:
-- UPDATE public.precatorios
-- SET
--   fechamento_valor_compra = NULL,
--   fechamento_comissao_operador = NULL,
--   fechamento_comissao_apax = NULL,
--   fechamento_escritura = NULL,
--   fechamento_procuracao = NULL,
--   fechamento_funrejus = NULL,
--   fechamento_certidoes = NULL,
--   fechamento_certidao_central = NULL,
--   fechamento_autenticacao = NULL,
--   fechamento_data = NULL,
--   fechamento_status = NULL
-- WHERE fechamento_data IS NOT NULL
--   OR fechamento_status IS NOT NULL;

COMMIT;
