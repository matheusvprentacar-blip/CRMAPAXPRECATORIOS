-- Atualizar VIEW precatorios_cards para incluir nomes de usuários via LEFT JOIN
-- Objetivo: o frontend não precisa fazer consultas separadas para buscar nomes

DROP VIEW IF EXISTS public.precatorios_cards CASCADE;

CREATE OR REPLACE VIEW public.precatorios_cards AS
SELECT
  p.id,
  p.titulo,
  p.numero_processo,
  p.numero_precatorio,
  p.credor_nome,
  p.valor_principal,
  p.valor_atualizado,
  p.status,
  p.prioridade,
  p.created_at,
  p.updated_at,
  p.criado_por,
  p.responsavel,
  p.responsavel_calculo_id,
  p.operador_calculo,
  p.localizacao_kanban,
  -- Adicionar campos de propostas (nomes corretos)
  p.proposta_menor_valor AS proposta_menor_valor,
  p.proposta_maior_valor AS proposta_maior_valor,
  -- Manter compatibilidade com display fields
  p.proposta_menor_valor_display,
  p.proposta_maior_valor_display,
  p.pdf_url,
  p.observacoes,
  -- Adicionar nomes dos usuários via LEFT JOIN
  u_criador.nome AS criador_nome,
  u_criador.email AS criador_email,
  u_responsavel.nome AS responsavel_nome,
  u_responsavel.email AS responsavel_email,
  u_calculo.nome AS responsavel_calculo_nome,
  u_calculo.email AS responsavel_calculo_email,
  u_operador.nome AS operador_calculo_nome,
  u_operador.email AS operador_calculo_email
FROM public.precatorios p
  -- JOIN com usuarios para trazer nomes
  LEFT JOIN public.usuarios u_criador ON p.criado_por = u_criador.id
  LEFT JOIN public.usuarios u_responsavel ON p.responsavel = u_responsavel.id
  LEFT JOIN public.usuarios u_calculo ON p.responsavel_calculo_id = u_calculo.id
  LEFT JOIN public.usuarios u_operador ON p.operador_calculo = u_operador.id
WHERE p.deleted_at IS NULL;

-- Grant para usuários autenticados
GRANT SELECT ON public.precatorios_cards TO authenticated;

COMMENT ON VIEW public.precatorios_cards IS 
'View de precatórios para cards/kanban com nomes de usuários resolvidos via LEFT JOIN';

-- Verificar estrutura da view
\d public.precatorios_cards
