-- Allow INSERT on precatorios for authenticated users
DROP POLICY IF EXISTS "Permitir inserção de precatórios" ON public.precatorios;

CREATE POLICY "Permitir inserção de precatórios"
ON public.precatorios
FOR INSERT
TO authenticated
WITH CHECK (true);
