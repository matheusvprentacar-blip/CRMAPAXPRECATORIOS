-- SCRIPT CONSOLIDADO DE CORREÇÃO (HELPER FUNCTIONS + RLS)
-- Garante que as funções de segurança existem antes de serem usadas.

-- 1. Criação das Funções de Segurança (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.current_user_has_role(required_role text)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roles text[];
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  SELECT role INTO v_roles FROM public.usuarios WHERE id = auth.uid();
  IF v_roles IS NULL THEN RETURN FALSE; END IF;
  RETURN required_role = ANY(v_roles);
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_any_role(required_roles text[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roles text[];
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  SELECT role INTO v_roles FROM public.usuarios WHERE id = auth.uid();
  IF v_roles IS NULL THEN RETURN FALSE; END IF;
  RETURN v_roles && required_roles; 
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_has_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_any_role TO authenticated;

-- 2. Recriação das Policies da Tabela USUARIOS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios podem ver seus proprios dados" ON public.usuarios;
CREATE POLICY "Usuarios podem ver seus proprios dados" ON public.usuarios FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Admin pode ver todos usuarios" ON public.usuarios;
CREATE POLICY "Admin pode ver todos usuarios" ON public.usuarios FOR SELECT TO authenticated USING (public.current_user_has_role('admin'));

DROP POLICY IF EXISTS "Gestores podem ver todos usuarios" ON public.usuarios;
CREATE POLICY "Gestores podem ver todos usuarios" ON public.usuarios FOR SELECT TO authenticated USING (public.current_user_has_any_role(ARRAY['gestor_certidoes', 'gestor_oficio', 'operador_comercial', 'operador_calculo', 'gestor']));

-- 3. Recriação das Policies da Tabela PRECATORIOS (Admin Delete/Update/Select)
-- Garante acesso total ao Admin
DROP POLICY IF EXISTS "Admin pode deletar precatorios" ON precatorios;
CREATE POLICY "Admin pode deletar precatorios" ON precatorios FOR DELETE TO authenticated USING (public.current_user_has_role('admin'));

DROP POLICY IF EXISTS "Operadores podem inserir precatorios" ON precatorios;
CREATE POLICY "Operadores podem inserir precatorios" ON precatorios FOR INSERT TO authenticated WITH CHECK (public.current_user_has_any_role(ARRAY['admin', 'operador_comercial', 'operador']));

DROP POLICY IF EXISTS "Admin pode ver todos precatorios" ON precatorios;
CREATE POLICY "Admin pode ver todos precatorios" ON precatorios FOR SELECT TO authenticated USING (public.current_user_has_role('admin'));

DROP POLICY IF EXISTS "Admin pode atualizar todos precatorios" ON precatorios;
CREATE POLICY "Admin pode atualizar todos precatorios" ON precatorios FOR UPDATE TO authenticated USING (public.current_user_has_role('admin'));
