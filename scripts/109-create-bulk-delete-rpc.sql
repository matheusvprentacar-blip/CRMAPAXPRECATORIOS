-- Create function to delete multiple precatorios at once
-- Optimized for Admin bulk actions

CREATE OR REPLACE FUNCTION public.delete_precatorios_bulk(p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role text[];
  v_deleted_count int;
BEGIN
  -- 1. Check Authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- 2. Check Permissions (Admin Only for now, or Owner)
  SELECT role INTO v_user_role FROM public.usuarios WHERE id = auth.uid();
  
  -- Logic:
  -- If Admin: Delete all IDs in list
  -- If Not Admin: Delete only IDs in list where user is owner/creator/responsible
  
  IF ('admin' = ANY(v_user_role)) THEN
      DELETE FROM public.precatorios 
      WHERE id = ANY(p_ids);
      
      GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  ELSE
      DELETE FROM public.precatorios 
      WHERE id = ANY(p_ids)
      AND (
          dono_usuario_id = auth.uid() 
          OR criado_por = auth.uid() 
          OR responsavel = auth.uid()
      );
      
      GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  END IF;

  -- Optional: Raise notice or just return
  -- RAISE NOTICE 'Deleted % rows', v_deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_precatorios_bulk TO authenticated;
