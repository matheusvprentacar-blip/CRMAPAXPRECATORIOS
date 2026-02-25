BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- TENANCY FOUNDATION (reused by legal opinions module)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL DEFAULT 'member',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id ON public.tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_active ON public.tenant_members(tenant_id, is_active);

DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT id INTO v_tenant_id
  FROM public.tenants
  ORDER BY created_at
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    INSERT INTO public.tenants (name, slug)
    VALUES ('Tenant Principal', 'tenant-principal')
    RETURNING id INTO v_tenant_id;
  END IF;

  INSERT INTO public.tenant_members (tenant_id, user_id, member_role)
  SELECT
    v_tenant_id,
    u.id,
    CASE
      WHEN 'admin' = ANY(COALESCE(u.role, ARRAY[]::TEXT[])) OR 'gestor' = ANY(COALESCE(u.role, ARRAY[]::TEXT[]))
        THEN 'owner'
      ELSE 'member'
    END
  FROM public.usuarios u
  ON CONFLICT (tenant_id, user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.app_current_user_roles()
RETURNS TEXT[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(u.role, ARRAY[]::TEXT[])
  FROM public.usuarios u
  WHERE u.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.app_current_user_has_any_role(required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM unnest(COALESCE(public.app_current_user_roles(), ARRAY[]::TEXT[])) AS role_name
    WHERE role_name = ANY(required_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.app_user_in_tenant(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.app_current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_claim_tenant TEXT;
  v_claim_uuid UUID;
  v_tenant UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_claim_tenant := COALESCE(auth.jwt() ->> 'tenant_id', '');
  IF v_claim_tenant ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    v_claim_uuid := v_claim_tenant::UUID;
    IF EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.tenant_id = v_claim_uuid
        AND tm.user_id = v_user_id
        AND tm.is_active = TRUE
    ) THEN
      RETURN v_claim_uuid;
    END IF;
  END IF;

  SELECT tm.tenant_id
  INTO v_tenant
  FROM public.tenant_members tm
  WHERE tm.user_id = v_user_id
    AND tm.is_active = TRUE
  ORDER BY tm.created_at
  LIMIT 1;

  RETURN v_tenant;
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_current_user_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_current_user_has_any_role(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_user_in_tenant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_current_tenant_id() TO authenticated;

-- =====================================================
-- LEGAL OPINIONS DATA MODEL
-- =====================================================
CREATE TABLE IF NOT EXISTS public.legal_opinions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  precatorio_id UUID NOT NULL REFERENCES public.precatorios(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  assigned_to UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  priority TEXT NOT NULL DEFAULT 'media',
  due_date DATE NULL,
  executive_summary TEXT NULL,
  analysis TEXT NULL,
  recommendation TEXT NULL,
  conclusion TEXT NULL,
  checklist JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT legal_opinions_type_check CHECK (
    type = ANY (
      ARRAY[
        'risco_processual',
        'calculos',
        'titularidade_cessao',
        'prioridade',
        'penhoras_bloqueios',
        'documentos_compliance',
        'estrategia'
      ]::TEXT[]
    )
  ),
  CONSTRAINT legal_opinions_status_check CHECK (
    status = ANY (
      ARRAY['pendente', 'em_analise', 'concluido', 'rejeitado', 'arquivado']::TEXT[]
    )
  ),
  CONSTRAINT legal_opinions_priority_check CHECK (
    priority = ANY (
      ARRAY['baixa', 'media', 'alta', 'critica']::TEXT[]
    )
  ),
  CONSTRAINT legal_opinions_title_not_blank CHECK (length(trim(title)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_legal_opinions_tenant_status ON public.legal_opinions(tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_legal_opinions_precatorio ON public.legal_opinions(precatorio_id);
CREATE INDEX IF NOT EXISTS idx_legal_opinions_assigned_to ON public.legal_opinions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_legal_opinions_created_at ON public.legal_opinions(created_at DESC);

CREATE TABLE IF NOT EXISTS public.legal_opinion_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  legal_opinion_id UUID NOT NULL REFERENCES public.legal_opinions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT legal_opinion_comments_content_not_blank CHECK (length(trim(content)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_legal_opinion_comments_opinion_created ON public.legal_opinion_comments(legal_opinion_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.legal_opinion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  legal_opinion_id UUID NOT NULL REFERENCES public.legal_opinions(id) ON DELETE CASCADE,
  actor_id UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_opinion_events_opinion_created ON public.legal_opinion_events(legal_opinion_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_opinion_events_type ON public.legal_opinion_events(event_type);

CREATE TABLE IF NOT EXISTS public.legal_opinion_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  legal_opinion_id UUID NOT NULL REFERENCES public.legal_opinions(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL CHECK (size > 0),
  uploaded_by UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_opinion_attachments_opinion ON public.legal_opinion_attachments(legal_opinion_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_opinion_attachments_tenant ON public.legal_opinion_attachments(tenant_id);

DROP TRIGGER IF EXISTS trigger_legal_opinions_updated_at ON public.legal_opinions;
CREATE TRIGGER trigger_legal_opinions_updated_at
  BEFORE UPDATE ON public.legal_opinions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.log_legal_opinion_event(
  p_legal_opinion_id UUID,
  p_event_type TEXT,
  p_payload JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_tenant_id UUID;
BEGIN
  SELECT lo.tenant_id
  INTO v_tenant_id
  FROM public.legal_opinions lo
  WHERE lo.id = p_legal_opinion_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Legal opinion not found: %', p_legal_opinion_id;
  END IF;

  INSERT INTO public.legal_opinion_events (
    tenant_id,
    legal_opinion_id,
    actor_id,
    event_type,
    payload
  )
  VALUES (
    v_tenant_id,
    p_legal_opinion_id,
    auth.uid(),
    p_event_type,
    COALESCE(p_payload, '{}'::JSONB)
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_legal_opinions_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_legal_opinion_event(
      NEW.id,
      'created',
      jsonb_build_object(
        'status', NEW.status,
        'priority', NEW.priority
      )
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      PERFORM public.log_legal_opinion_event(
        NEW.id,
        'status_changed',
        jsonb_build_object(
          'from', OLD.status,
          'to', NEW.status
        )
      );
    ELSE
      PERFORM public.log_legal_opinion_event(
        NEW.id,
        'updated',
        jsonb_build_object('updated_at', NEW.updated_at)
      );
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_legal_opinions_audit ON public.legal_opinions;
CREATE TRIGGER trigger_legal_opinions_audit
  AFTER INSERT OR UPDATE ON public.legal_opinions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_legal_opinions_audit();

GRANT EXECUTE ON FUNCTION public.log_legal_opinion_event(UUID, TEXT, JSONB) TO authenticated;

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_opinions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_opinion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_opinion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_opinion_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_select_member ON public.tenants;
CREATE POLICY tenants_select_member
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (public.app_user_in_tenant(id));

DROP POLICY IF EXISTS tenant_members_select_member ON public.tenant_members;
CREATE POLICY tenant_members_select_member
  ON public.tenant_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.app_user_in_tenant(tenant_id)
  );

DROP POLICY IF EXISTS legal_opinions_select_member ON public.legal_opinions;
CREATE POLICY legal_opinions_select_member
  ON public.legal_opinions
  FOR SELECT
  TO authenticated
  USING (public.app_user_in_tenant(tenant_id));

DROP POLICY IF EXISTS legal_opinions_insert_member ON public.legal_opinions;
CREATE POLICY legal_opinions_insert_member
  ON public.legal_opinions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.app_user_in_tenant(tenant_id)
    AND requested_by = auth.uid()
  );

DROP POLICY IF EXISTS legal_opinions_update_member ON public.legal_opinions;
CREATE POLICY legal_opinions_update_member
  ON public.legal_opinions
  FOR UPDATE
  TO authenticated
  USING (
    public.app_user_in_tenant(tenant_id)
    AND (
      requested_by = auth.uid()
      OR assigned_to = auth.uid()
      OR public.app_current_user_has_any_role(ARRAY['admin', 'juridico', 'gestor'])
    )
  )
  WITH CHECK (
    public.app_user_in_tenant(tenant_id)
    AND (
      requested_by = auth.uid()
      OR assigned_to = auth.uid()
      OR public.app_current_user_has_any_role(ARRAY['admin', 'juridico', 'gestor'])
    )
  );

DROP POLICY IF EXISTS legal_opinions_delete_admin ON public.legal_opinions;
CREATE POLICY legal_opinions_delete_admin
  ON public.legal_opinions
  FOR DELETE
  TO authenticated
  USING (
    public.app_user_in_tenant(tenant_id)
    AND public.app_current_user_has_any_role(ARRAY['admin', 'gestor'])
  );

DROP POLICY IF EXISTS legal_opinion_comments_select_member ON public.legal_opinion_comments;
CREATE POLICY legal_opinion_comments_select_member
  ON public.legal_opinion_comments
  FOR SELECT
  TO authenticated
  USING (public.app_user_in_tenant(tenant_id));

DROP POLICY IF EXISTS legal_opinion_comments_insert_member ON public.legal_opinion_comments;
CREATE POLICY legal_opinion_comments_insert_member
  ON public.legal_opinion_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.app_user_in_tenant(tenant_id)
    AND author_id = auth.uid()
  );

DROP POLICY IF EXISTS legal_opinion_comments_update_author ON public.legal_opinion_comments;
CREATE POLICY legal_opinion_comments_update_author
  ON public.legal_opinion_comments
  FOR UPDATE
  TO authenticated
  USING (
    public.app_user_in_tenant(tenant_id)
    AND (
      author_id = auth.uid()
      OR public.app_current_user_has_any_role(ARRAY['admin', 'gestor'])
    )
  )
  WITH CHECK (
    public.app_user_in_tenant(tenant_id)
    AND (
      author_id = auth.uid()
      OR public.app_current_user_has_any_role(ARRAY['admin', 'gestor'])
    )
  );

DROP POLICY IF EXISTS legal_opinion_events_select_member ON public.legal_opinion_events;
CREATE POLICY legal_opinion_events_select_member
  ON public.legal_opinion_events
  FOR SELECT
  TO authenticated
  USING (public.app_user_in_tenant(tenant_id));

DROP POLICY IF EXISTS legal_opinion_events_insert_member ON public.legal_opinion_events;
CREATE POLICY legal_opinion_events_insert_member
  ON public.legal_opinion_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.app_user_in_tenant(tenant_id)
    AND (
      actor_id IS NULL
      OR actor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS legal_opinion_attachments_select_member ON public.legal_opinion_attachments;
CREATE POLICY legal_opinion_attachments_select_member
  ON public.legal_opinion_attachments
  FOR SELECT
  TO authenticated
  USING (public.app_user_in_tenant(tenant_id));

DROP POLICY IF EXISTS legal_opinion_attachments_insert_member ON public.legal_opinion_attachments;
CREATE POLICY legal_opinion_attachments_insert_member
  ON public.legal_opinion_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.app_user_in_tenant(tenant_id)
    AND uploaded_by = auth.uid()
  );

DROP POLICY IF EXISTS legal_opinion_attachments_delete_member ON public.legal_opinion_attachments;
CREATE POLICY legal_opinion_attachments_delete_member
  ON public.legal_opinion_attachments
  FOR DELETE
  TO authenticated
  USING (
    public.app_user_in_tenant(tenant_id)
    AND (
      uploaded_by = auth.uid()
      OR public.app_current_user_has_any_role(ARRAY['admin', 'gestor'])
    )
  );

GRANT SELECT ON public.tenants TO authenticated;
GRANT SELECT ON public.tenant_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_opinions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.legal_opinion_comments TO authenticated;
GRANT SELECT, INSERT ON public.legal_opinion_events TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.legal_opinion_attachments TO authenticated;

-- =====================================================
-- STORAGE (bucket + policies)
-- Path pattern: {tenant_id}/{legal_opinion_id}/{filename}
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'legal-opinions',
  'legal-opinions',
  FALSE,
  20971520,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = FALSE,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

DROP POLICY IF EXISTS legal_opinions_storage_select ON storage.objects;
CREATE POLICY legal_opinions_storage_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'legal-opinions'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND (storage.foldername(name))[2] IS NOT NULL
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND public.app_user_in_tenant(((storage.foldername(name))[1])::UUID)
    AND EXISTS (
      SELECT 1
      FROM public.legal_opinions lo
      WHERE lo.id = ((storage.foldername(name))[2])::UUID
        AND lo.tenant_id = ((storage.foldername(name))[1])::UUID
    )
  );

DROP POLICY IF EXISTS legal_opinions_storage_insert ON storage.objects;
CREATE POLICY legal_opinions_storage_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'legal-opinions'
    AND owner = auth.uid()
    AND (storage.foldername(name))[1] IS NOT NULL
    AND (storage.foldername(name))[2] IS NOT NULL
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND public.app_user_in_tenant(((storage.foldername(name))[1])::UUID)
    AND EXISTS (
      SELECT 1
      FROM public.legal_opinions lo
      WHERE lo.id = ((storage.foldername(name))[2])::UUID
        AND lo.tenant_id = ((storage.foldername(name))[1])::UUID
    )
  );

DROP POLICY IF EXISTS legal_opinions_storage_update ON storage.objects;
CREATE POLICY legal_opinions_storage_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'legal-opinions'
    AND (
      owner = auth.uid()
      OR public.app_current_user_has_any_role(ARRAY['admin', 'gestor'])
    )
  )
  WITH CHECK (
    bucket_id = 'legal-opinions'
    AND (
      owner = auth.uid()
      OR public.app_current_user_has_any_role(ARRAY['admin', 'gestor'])
    )
  );

DROP POLICY IF EXISTS legal_opinions_storage_delete ON storage.objects;
CREATE POLICY legal_opinions_storage_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'legal-opinions'
    AND (
      owner = auth.uid()
      OR public.app_current_user_has_any_role(ARRAY['admin', 'gestor'])
    )
  );

COMMENT ON TABLE public.legal_opinions IS 'Pareceres juridicos vinculados a precatorios com isolamento por tenant.';
COMMENT ON TABLE public.legal_opinion_comments IS 'Comentarios colaborativos do parecer juridico.';
COMMENT ON TABLE public.legal_opinion_events IS 'Trilha de auditoria de eventos do parecer juridico.';
COMMENT ON TABLE public.legal_opinion_attachments IS 'Metadados de anexos do parecer juridico armazenados no bucket legal-opinions.';

COMMIT;
