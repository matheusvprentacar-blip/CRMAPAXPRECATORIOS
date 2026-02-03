-- ============================================
-- SCRIPT 185: Ajustar roles da Erica
-- ============================================
-- Usuario ID: c09b57b1-19d5-4b5e-926a-d1c497914f2d
-- Roles desejadas: operador_comercial, gestor_oficio, gestor_certidoes
-- Atualiza public.usuarios e auth.users (app_metadata)
-- ============================================

BEGIN;

-- 0) Garantir coluna role como array (text[])
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'usuarios'
      AND column_name = 'role'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE public.usuarios
      ALTER COLUMN role TYPE text[]
      USING CASE
        WHEN role IS NULL THEN NULL
        ELSE ARRAY[role]
      END;

    ALTER TABLE public.usuarios
      ALTER COLUMN role SET DEFAULT ARRAY['operador_comercial']::text[];
  END IF;
END $$;

-- 1) Permitir 3 roles (remove limite antigo, se existir)
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS max_two_roles;

-- (Opcional) manter um limite maximo de 3 roles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'usuarios'
      AND column_name = 'role'
      AND data_type = 'ARRAY'
  ) THEN
    -- So cria a constraint se todos os usuarios estao <= 3 roles
    IF NOT EXISTS (
      SELECT 1 FROM public.usuarios WHERE array_length(role, 1) > 3
    ) THEN
      ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS max_three_roles;
      ALTER TABLE public.usuarios
        ADD CONSTRAINT max_three_roles
        CHECK (
          array_length(role, 1) IS NOT NULL
          AND array_length(role, 1) >= 1
          AND array_length(role, 1) <= 3
        );
    END IF;
  END IF;
END $$;

-- 2) Atualizar roles na tabela usuarios
UPDATE public.usuarios
SET role = ARRAY['operador_comercial', 'gestor_oficio', 'gestor_certidoes']::text[]
WHERE id = 'c09b57b1-19d5-4b5e-926a-d1c497914f2d';

-- 3) Atualizar app_metadata no auth.users (JWT)
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '["operador_comercial","gestor_oficio","gestor_certidoes"]'::jsonb
)
WHERE id = 'c09b57b1-19d5-4b5e-926a-d1c497914f2d';

-- 4) Verificacao rapida
SELECT id, nome, email, role
FROM public.usuarios
WHERE id = 'c09b57b1-19d5-4b5e-926a-d1c497914f2d';

SELECT id, email, raw_app_meta_data -> 'role' AS role
FROM auth.users
WHERE id = 'c09b57b1-19d5-4b5e-926a-d1c497914f2d';

COMMIT;
