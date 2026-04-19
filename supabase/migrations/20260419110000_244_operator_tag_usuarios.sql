BEGIN;

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS operator_tag TEXT;

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_operator_tag_check;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_operator_tag_check
  CHECK (
    operator_tag IS NULL
    OR operator_tag IN ('operador', 'freelancer', 'externo')
  );

UPDATE public.usuarios
SET operator_tag = 'operador'
WHERE operator_tag IS NULL
  AND role && ARRAY['operador_comercial', 'operador']::TEXT[];

CREATE INDEX IF NOT EXISTS idx_usuarios_operator_tag
  ON public.usuarios (operator_tag)
  WHERE operator_tag IS NOT NULL;

COMMENT ON COLUMN public.usuarios.operator_tag IS
  'Tag operacional usada para distribuicao rapida no atendimento (operador, freelancer, externo).';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'precatorios'
      AND policyname = 'operador_atendimento_select'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY operador_atendimento_select ON public.precatorios
        FOR SELECT
        TO authenticated
        USING (
          origem = 'atendimento'
          AND (responsavel = auth.uid() OR dono_usuario_id = auth.uid())
          AND EXISTS (
            SELECT 1
            FROM public.usuarios
            WHERE id = auth.uid()
              AND role && ARRAY['operador_comercial', 'operador']::TEXT[]
          )
        )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'precatorios'
      AND policyname = 'operador_atendimento_update'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY operador_atendimento_update ON public.precatorios
        FOR UPDATE
        TO authenticated
        USING (
          origem = 'atendimento'
          AND (responsavel = auth.uid() OR dono_usuario_id = auth.uid())
          AND EXISTS (
            SELECT 1
            FROM public.usuarios
            WHERE id = auth.uid()
              AND role && ARRAY['operador_comercial', 'operador']::TEXT[]
          )
        )
    $policy$;
  END IF;
END
$$;

COMMIT;
