-- Script 122: Fix RLS for Precatorios Update (Combined Fix)
-- Covers: Operador de Calculo and Gestor de Certidoes
-- Status: Updates Gestor Certidoes to allow move to 'calculo_concluido'

BEGIN;

-------------------------------------------------------------------------------
-- 1. OPERADOR DE CALCULO
-------------------------------------------------------------------------------
-- Drop existing policies
DROP POLICY IF EXISTS "Operador Calculo atualiza seus" ON public.precatorios;
DROP POLICY IF EXISTS "Operador Calculo ve apenas seus" ON public.precatorios;

-- Create robust SELECT policy
CREATE POLICY "Operador Calculo ve apenas seus" 
ON public.precatorios 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios u 
    WHERE u.id = auth.uid() 
    AND (
       'operador_calculo' = ANY(u.role) 
       OR 'operador_calculo' = u.role::text
    )
  )
  AND (
    responsavel_calculo_id = auth.uid()
    OR
    -- Allow viewing unassigned cards in calculation phases
    (responsavel_calculo_id IS NULL AND status_kanban IN ('pronto_calculo', 'calculo_andamento', 'calculo_concluido'))
  )
);

-- Create robust UPDATE policy
CREATE POLICY "Operador Calculo atualiza seus" 
ON public.precatorios 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios u 
    WHERE u.id = auth.uid() 
    AND (
       'operador_calculo' = ANY(u.role) 
       OR 'operador_calculo' = u.role::text
    )
  )
  AND (
    -- Can update if responsible
    responsavel_calculo_id = auth.uid()
    OR 
    -- OR if in calculation phase (even if unassigned)
    status_kanban IN ('pronto_calculo', 'calculo_andamento', 'calculo_concluido')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuarios u 
    WHERE u.id = auth.uid() 
    AND (
       'operador_calculo' = ANY(u.role) 
       OR 'operador_calculo' = u.role::text
    )
  )
  AND (
    -- Allow maintaining responsibility or releasing it (null)
    responsavel_calculo_id = auth.uid()
    OR responsavel_calculo_id IS NULL
  )
);

-------------------------------------------------------------------------------
-- 2. GESTOR DE CERTIDOES
-------------------------------------------------------------------------------
-- Drop existing policies
DROP POLICY IF EXISTS "Gestor Certidoes atualiza pool e seus" ON public.precatorios;
DROP POLICY IF EXISTS "Gestor Certidoes ve pool e seus" ON public.precatorios;

-- Create robust SELECT policy
CREATE POLICY "Gestor Certidoes ve pool e seus" 
ON public.precatorios 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios u 
    WHERE u.id = auth.uid() 
    AND (
       'gestor_certidoes' = ANY(u.role) 
       OR 'gestor_certidoes' = u.role::text
    )
  )
  AND (
    responsavel_certidoes_id = auth.uid() 
    OR status_kanban = 'certidoes'
  )
);

-- Create robust UPDATE policy (fixes the transition issue)
CREATE POLICY "Gestor Certidoes atualiza pool e seus" 
ON public.precatorios 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios u 
    WHERE u.id = auth.uid() 
    AND (
       'gestor_certidoes' = ANY(u.role) 
       OR 'gestor_certidoes' = u.role::text
    )
  )
  AND (
    responsavel_certidoes_id = auth.uid() 
    OR status_kanban = 'certidoes'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuarios u 
    WHERE u.id = auth.uid() 
    AND (
       'gestor_certidoes' = ANY(u.role) 
       OR 'gestor_certidoes' = u.role::text
    )
  )
  AND (
    -- Allow keeping it in certidoes OR moving to calculo_concluido (Calculado)
    status_kanban = 'certidoes'
    OR status_kanban = 'calculo_concluido'
  )
);

COMMIT;
