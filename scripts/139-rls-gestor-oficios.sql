-- Script 139: Add RLS for Gestor de Oficios
-- Grants permissions for role 'gestor_oficio' to view and update relevant precatorios

BEGIN;

-- 1. SELECT Policy (View 'aguardando_oficio' or assigned)
DROP POLICY IF EXISTS "Gestor Oficios ve seus e aguardando" ON public.precatorios;
CREATE POLICY "Gestor Oficios ve seus e aguardando"
ON public.precatorios FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid()
    AND (
      'gestor_oficio' = ANY(u.role) 
      OR 'gestor_oficio' = u.role::text
      -- Also include admin just in case they rely on this specific policy (though admin usually has own)
      OR 'admin' = ANY(u.role)
      OR 'admin' = u.role::text
    )
  )
  AND (
    status_kanban = 'aguardando_oficio'
    OR responsavel_oficio_id = auth.uid()
    -- Admins see all via other policies, but good to be safe if coverage is shared
  )
);

-- 2. UPDATE Policy
DROP POLICY IF EXISTS "Gestor Oficios atualiza seus" ON public.precatorios;
CREATE POLICY "Gestor Oficios atualiza seus"
ON public.precatorios FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid()
    AND (
      'gestor_oficio' = ANY(u.role) 
      OR 'gestor_oficio' = u.role::text
    )
  )
  AND (
    status_kanban = 'aguardando_oficio'
    OR responsavel_oficio_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid()
    AND (
      'gestor_oficio' = ANY(u.role) 
      OR 'gestor_oficio' = u.role::text
    )
  )
);

COMMIT;
