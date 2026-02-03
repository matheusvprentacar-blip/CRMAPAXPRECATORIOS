-- ==============================================================================
-- MIGRATION: 163-delete-precatorio-item.sql
-- PURPOSE: Allow deleting checklist items via RPC
-- ==============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.excluir_item_precatorio(p_item_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_precatorio_id UUID;
BEGIN
  SELECT precatorio_id INTO v_precatorio_id
  FROM public.precatorio_itens
  WHERE id = p_item_id;

  IF v_precatorio_id IS NULL THEN
    RETURN FALSE;
  END IF;

  DELETE FROM public.precatorio_itens
  WHERE id = p_item_id;

  INSERT INTO public.precatorio_auditoria (
    precatorio_id,
    acao,
    para,
    payload_json,
    user_id
  ) VALUES (
    v_precatorio_id,
    'EXCLUIR_ITEM',
    p_item_id::TEXT,
    jsonb_build_object('item_id', p_item_id),
    auth.uid()
  );

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.excluir_item_precatorio(UUID) TO authenticated;

COMMIT;

SELECT 'Script 163 executado com sucesso! Item de checklist pode ser excluido.' as status;
