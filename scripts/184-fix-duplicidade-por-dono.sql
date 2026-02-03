-- ============================================
-- SCRIPT 184: Corrigir duplicidade por dono
-- ============================================
-- Regra:
-- - O mesmo numero_processo/numero_precatorio pode existir varias vezes
--   APENAS se o dono for o mesmo.
-- - Se ja existir com dono diferente, bloquear.
-- ============================================

BEGIN;

-- 1) Remover indices UNIQUE que bloqueiam duplicidade do mesmo dono
DROP INDEX IF EXISTS public.idx_unique_numero_precatorio;
DROP INDEX IF EXISTS public.idx_unique_numero_processo;

-- 2) (Opcional) Manter indices simples para performance de busca
CREATE INDEX IF NOT EXISTS idx_precatorios_numero_precatorio
ON public.precatorios(numero_precatorio)
WHERE numero_precatorio IS NOT NULL AND numero_precatorio <> '' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_precatorios_numero_processo
ON public.precatorios(numero_processo)
WHERE numero_processo IS NOT NULL AND numero_processo <> '' AND deleted_at IS NULL;

-- 3) Remover trigger antes da funcao (evita erro de dependencia)
DROP TRIGGER IF EXISTS trg_validar_dono_numero_precatorio_processo ON public.precatorios;

-- 4) Funcao para validar dono por numero_processo/numero_precatorio
DROP FUNCTION IF EXISTS public.validar_dono_numero_precatorio_processo();

CREATE OR REPLACE FUNCTION public.validar_dono_numero_precatorio_processo()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_owner UUID;
BEGIN
  -- Ignora registros deletados (soft delete)
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Determina dono (dono_usuario_id tem prioridade; fallback para criado_por)
  v_owner := COALESCE(NEW.dono_usuario_id, NEW.criado_por);

  -- Sem dono definido: nao valida
  IF v_owner IS NULL THEN
    RETURN NEW;
  END IF;

  -- Garante que o dono fique preenchido quando possivel
  NEW.dono_usuario_id := v_owner;

  -- Validar numero_processo
  IF NEW.numero_processo IS NOT NULL AND NEW.numero_processo <> '' THEN
    IF EXISTS (
      SELECT 1
      FROM public.precatorios p
      WHERE p.id IS DISTINCT FROM NEW.id
        AND p.deleted_at IS NULL
        AND p.numero_processo = NEW.numero_processo
        AND COALESCE(p.dono_usuario_id, p.criado_por) IS DISTINCT FROM v_owner
    ) THEN
      RAISE EXCEPTION 'numero_processo % ja pertence a outro usuario', NEW.numero_processo
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  -- Validar numero_precatorio
  IF NEW.numero_precatorio IS NOT NULL AND NEW.numero_precatorio <> '' THEN
    IF EXISTS (
      SELECT 1
      FROM public.precatorios p
      WHERE p.id IS DISTINCT FROM NEW.id
        AND p.deleted_at IS NULL
        AND p.numero_precatorio = NEW.numero_precatorio
        AND COALESCE(p.dono_usuario_id, p.criado_por) IS DISTINCT FROM v_owner
    ) THEN
      RAISE EXCEPTION 'numero_precatorio % ja pertence a outro usuario', NEW.numero_precatorio
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 5) Trigger para aplicar a validacao
CREATE TRIGGER trg_validar_dono_numero_precatorio_processo
BEFORE INSERT OR UPDATE OF numero_processo, numero_precatorio, dono_usuario_id, criado_por, deleted_at
ON public.precatorios
FOR EACH ROW
EXECUTE FUNCTION public.validar_dono_numero_precatorio_processo();

COMMIT;
