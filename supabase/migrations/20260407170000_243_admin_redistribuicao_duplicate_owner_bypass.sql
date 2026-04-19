BEGIN;

CREATE OR REPLACE FUNCTION public.validar_dono_numero_precatorio_processo()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_owner UUID;
  v_is_admin_like BOOLEAN := FALSE;
  v_is_admin_assignment_redistribution BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_is_admin_like := COALESCE(public.user_is_admin_like(auth.uid()), FALSE)
      OR COALESCE(public.jwt_is_admin_like(), FALSE);

    v_is_admin_assignment_redistribution :=
      v_is_admin_like
      AND NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at
      AND NEW.numero_processo IS NOT DISTINCT FROM OLD.numero_processo
      AND NEW.numero_precatorio IS NOT DISTINCT FROM OLD.numero_precatorio
      AND (
        NEW.dono_usuario_id IS DISTINCT FROM OLD.dono_usuario_id
        OR NEW.responsavel IS DISTINCT FROM OLD.responsavel
        OR NEW.responsavel_calculo_id IS DISTINCT FROM OLD.responsavel_calculo_id
        OR COALESCE(NEW.distribuido_por_admin, FALSE) IS TRUE
      );

    -- Admin pode redistribuir sem herdar a regra de "mesmo processo = mesmo dono".
    -- A protecao continua ativa para inserts e para edicao dos numeros do processo/precatório.
    IF v_is_admin_assignment_redistribution THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_owner := COALESCE(NEW.dono_usuario_id, NEW.criado_por);

  IF v_owner IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.dono_usuario_id := v_owner;

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

COMMIT;
