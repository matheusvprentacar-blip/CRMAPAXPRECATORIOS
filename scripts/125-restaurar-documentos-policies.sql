-- Restaurar Policies de Documentos (Pós-Migração de Roles Array)
-- Referência: Bug onde Admin não consegue fazer upload em precatórios de outros
-- Motivo: Script 92 removeu policies e Script 93 restaurou apenas de precatorios

-- 1. Habilitar RLS (garantia)
ALTER TABLE public.documentos_precatorio ENABLE ROW LEVEL SECURITY;

-- 2. Limpar policies antigas
DROP POLICY IF EXISTS "Ver documentos dos precatórios acessíveis" ON public.documentos_precatorio;
DROP POLICY IF EXISTS "Anexar documentos aos precatórios acessíveis" ON public.documentos_precatorio;
DROP POLICY IF EXISTS "Atualizar próprios documentos ou admin" ON public.documentos_precatorio;
DROP POLICY IF EXISTS "Remover próprios documentos ou admin" ON public.documentos_precatorio;
DROP POLICY IF EXISTS "update_documentos" ON public.documentos_precatorio;

-- 3. Policy: SELECT (Ver documentos)
CREATE POLICY "Ver documentos"
ON public.documentos_precatorio
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.precatorios p
    WHERE p.id = documentos_precatorio.precatorio_id
    AND (
      -- Admin vê tudo (checagem array segura)
      EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid()
        AND 'admin' = ANY(u.role)
      )
      OR
      -- Criador/Responsável pelo Precatório
      p.criado_por = auth.uid() OR
      p.responsavel = auth.uid() OR
      
      -- Responsáveis técnicos
      p.responsavel_calculo_id = auth.uid() OR
      p.responsavel_certidoes_id = auth.uid() OR
      p.responsavel_oficio_id = auth.uid() OR
      p.responsavel_juridico_id = auth.uid() OR

      -- Quem enviou o documento (caso não seja dono do precatório)
      documentos_precatorio.enviado_por = auth.uid()
    )
  )
);

-- 4. Policy: INSERT (Upload)
-- Admin pode inserir em QUALQUER precatório.
-- Outros usuários apenas nos que têm acesso.
CREATE POLICY "Inserir documentos"
ON public.documentos_precatorio
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.precatorios p
    WHERE p.id = documentos_precatorio.precatorio_id
    AND (
      -- Admin insere em qualquer lugar
      EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid()
        AND 'admin' = ANY(u.role)
      )
      OR
      -- Donos/Responsáveis
      p.criado_por = auth.uid() OR
      p.responsavel = auth.uid() OR
      p.responsavel_calculo_id = auth.uid() OR
      p.responsavel_certidoes_id = auth.uid() OR
      p.responsavel_oficio_id = auth.uid() OR
      p.responsavel_juridico_id = auth.uid()
    )
  )
);

-- 5. Policy: UPDATE (Edição)
CREATE POLICY "Atualizar documentos"
ON public.documentos_precatorio
FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL
  AND (
    -- Admin edita qualquer um
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid()
      AND 'admin' = ANY(u.role)
    )
    OR
    -- Autor do documento edita o seu
    enviado_por = auth.uid()
  )
);

-- 6. Policy: DELETE (Remoção)
CREATE POLICY "Remover documentos"
ON public.documentos_precatorio
FOR DELETE
TO authenticated
USING (
  -- Admin remove qualquer um
  EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid()
    AND 'admin' = ANY(u.role)
  )
  OR
  -- Autor do documento remove o seu
  enviado_por = auth.uid()
);

-- soft delete update handled by UPDATE policy generally, or separate if using deleted_at logic explicitly via UPDATE.
-- The UPDATE policy covers soft delete via "UPDATE set deleted_at = ..."

-- Verificação
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'documentos_precatorio';
