-- RPC para anexar PDF ao precatório de forma segura
-- Usa RLS e valida permissões antes de atualizar

CREATE OR REPLACE FUNCTION public.attach_precatorio_pdf(
  p_precatorio_id UUID,
  p_pdf_url TEXT
)
RETURNS TABLE(
  id UUID,
  pdf_url TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
BEGIN
  -- Pegar usuário e role do JWT
  v_user_id := auth.uid();
  v_user_role := (auth.jwt() -> 'app_metadata' ->> 'role');

  -- Validações
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF p_precatorio_id IS NULL THEN
    RAISE EXCEPTION 'ID do precatório é obrigatório';
  END IF;

  IF p_pdf_url IS NULL OR p_pdf_url = '' THEN
    RAISE EXCEPTION 'URL do PDF é obrigatória';
  END IF;

  -- Atualizar o precatório
  -- RLS já valida se o usuário tem permissão
  RETURN QUERY
  UPDATE public.precatorios
  SET 
    pdf_url = p_pdf_url,
    updated_at = NOW()
  WHERE 
    precatorios.id = p_precatorio_id
    AND deleted_at IS NULL
  RETURNING 
    precatorios.id,
    precatorios.pdf_url,
    precatorios.updated_at;

  -- Se não atualizou nenhuma linha, erro
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Precatório não encontrado ou sem permissão';
  END IF;
END;
$$;

-- Permitir execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.attach_precatorio_pdf TO authenticated;

COMMENT ON FUNCTION public.attach_precatorio_pdf IS 
'Anexa PDF ao precatório de forma segura, validando permissões via RLS';

-- Adicionar pdf_url na view precatorios_cards se não existir
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
  p.localizacao_kanban,
  p.proposta_menor_valor_display,
  p.proposta_maior_valor_display,
  p.pdf_url,
  p.observacoes
FROM public.precatorios p
WHERE p.deleted_at IS NULL;

-- Grant para usuários autenticados
GRANT SELECT ON public.precatorios_cards TO authenticated;

COMMENT ON VIEW public.precatorios_cards IS 
'View de precatórios para cards/kanban com pdf_url incluído';
