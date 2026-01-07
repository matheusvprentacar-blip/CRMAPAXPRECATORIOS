-- Script SQL ÚNICO: VIEW + POLICY para precatorios_cards
-- Garante que o frontend receba: valores, placeholders, pdf_url e nomes (criador/responsável/cálculo)

BEGIN;

-- 1) POLICY SELECT na tabela base (regra única de visibilidade)
DROP POLICY IF EXISTS "precatorios_select_creator_or_comercial_or_calculo_or_admin" ON public.precatorios;

CREATE POLICY "precatorios_select_creator_or_comercial_or_calculo_or_admin"
ON public.precatorios
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND (
    criado_por = auth.uid()
    OR responsavel = auth.uid()
    OR responsavel_calculo_id = auth.uid()
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'operador_calculo'
      AND status IN ('em_calculo','calculado')
    )
  )
);

-- 2) VIEW para alimentar Kanban/Lista/Cards (com nomes + valores + pdf)
DROP VIEW IF EXISTS public.precatorios_cards CASCADE;

CREATE OR REPLACE VIEW public.precatorios_cards AS
SELECT
  p.id,
  p.titulo,
  p.numero_precatorio,
  p.numero_processo,
  p.numero_oficio,
  p.credor_nome,
  p.credor_cpf_cnpj,
  p.devedor,
  p.esfera_devedor,
  p.status,
  p.prioridade,
  p.localizacao_kanban,
  p.created_at,
  p.updated_at,
  p.criado_por,
  p.responsavel,
  p.responsavel_calculo_id,
  p.operador_calculo,

  -- Valores principais no card (sempre mostrar valor_principal; valor_atualizado quando houver)
  p.valor_principal,
  p.valor_atualizado,
  p.valor_juros,
  p.valor_selic,

  -- Propostas (campos corretos)
  p.proposta_menor_valor,
  p.proposta_maior_valor,
  p.proposta_menor_percentual,
  p.proposta_maior_percentual,

  -- PDF
  p.pdf_url,

  -- Display/placeholder (não quebra UI)
  CASE
    WHEN COALESCE(p.valor_atualizado,0) > 0 THEN 'Valor atualizado'
    WHEN COALESCE(p.valor_principal,0) > 0 THEN 'Valor principal'
    ELSE 'Valor'
  END AS valor_label,

  CASE
    WHEN COALESCE(p.valor_atualizado,0) > 0 THEN to_char(p.valor_atualizado, 'FM999G999G999G999G990D00')
    WHEN COALESCE(p.valor_principal,0) > 0 THEN to_char(p.valor_principal, 'FM999G999G999G999G990D00')
    ELSE 'Aguardando'
  END AS valor_display,

  CASE
    WHEN COALESCE(p.proposta_menor_valor,0) > 0 THEN to_char(p.proposta_menor_valor, 'FM999G999G999G999G990D00')
    ELSE NULL
  END AS proposta_menor_valor_display,

  CASE
    WHEN COALESCE(p.proposta_maior_valor,0) > 0 THEN to_char(p.proposta_maior_valor, 'FM999G999G999G999G990D00')
    ELSE NULL
  END AS proposta_maior_valor_display,

  -- Nomes (resolve IDs para nome/email)
  u_criador.nome AS criador_nome,
  u_criador.email AS criador_email,
  u_resp.nome AS responsavel_nome,
  u_calc.nome AS responsavel_calculo_nome,
  u_oper.nome AS operador_calculo_nome

FROM public.precatorios p
LEFT JOIN public.usuarios u_criador ON p.criado_por = u_criador.id
LEFT JOIN public.usuarios u_resp    ON p.responsavel = u_resp.id
LEFT JOIN public.usuarios u_calc    ON p.responsavel_calculo_id = u_calc.id
LEFT JOIN public.usuarios u_oper    ON p.operador_calculo = u_oper.id
WHERE p.deleted_at IS NULL;

GRANT SELECT ON public.precatorios_cards TO authenticated;

COMMIT;
