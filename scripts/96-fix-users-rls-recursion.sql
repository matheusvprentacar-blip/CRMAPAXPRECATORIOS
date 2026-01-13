-- CORREÇÃO DE RECURSÃO RLS
-- Policies que consultam a própria tabela ('usuarios') podem criar loops infinitos.
-- A solução é usar uma função SECURITY DEFINER que ignora o RLS para fazer a verificação.

-- 1. Função segura para verificar roles do usuário atual
CREATE OR REPLACE FUNCTION public.current_user_has_role(required_role text)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com permissões do dono (ignora RLS)
SET search_path = public -- Segurança recomendada
AS $$
DECLARE
  v_roles text[];
BEGIN
  -- Verificar se usuário está autenticado
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Buscar roles direto da tabela (sem passar pelo RLS pois é function secure)
  SELECT role INTO v_roles
  FROM public.usuarios
  WHERE id = auth.uid();

  IF v_roles IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN required_role = ANY(v_roles);
END;
$$;

-- 2. Função segura para verificar QUALQUER role de um array
CREATE OR REPLACE FUNCTION public.current_user_has_any_role(required_roles text[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roles text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role INTO v_roles
  FROM public.usuarios
  WHERE id = auth.uid();

  IF v_roles IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verifica intersecção de arrays
  RETURN v_roles && required_roles; 
END;
$$;

-- 3. Recriar policies da tabela USUARIOS usando as funções seguras

-- Habilitar RLS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- 3.1. Usuário vê a si mesmo (Mantém, pois é simples e direta via ID)
DROP POLICY IF EXISTS "Usuarios podem ver seus proprios dados" ON public.usuarios;
CREATE POLICY "Usuarios podem ver seus proprios dados"
ON public.usuarios FOR SELECT
TO authenticated
USING (id = auth.uid());

-- 3.2. Admin vê todos (Usa função segura)
DROP POLICY IF EXISTS "Admin pode ver todos usuarios" ON public.usuarios;
CREATE POLICY "Admin pode ver todos usuarios"
ON public.usuarios FOR SELECT
TO authenticated
USING (
  public.current_user_has_role('admin')
);

-- 3.3. Gestores vêem todos (Usa função segura)
DROP POLICY IF EXISTS "Gestores podem ver todos usuarios" ON public.usuarios;
CREATE POLICY "Gestores podem ver todos usuarios"
ON public.usuarios FOR SELECT
TO authenticated
USING (
  public.current_user_has_any_role(ARRAY['gestor_certidoes', 'gestor_oficio', 'operador_comercial', 'operador_calculo', 'gestor'])
);

-- 3.4. Permitir Atualização (Update) própria e por Admin
DROP POLICY IF EXISTS "Usuarios podem atualizar seus proprios dados" ON public.usuarios;
CREATE POLICY "Usuarios podem atualizar seus proprios dados"
ON public.usuarios FOR UPDATE
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "Admin pode atualizar qualquer usuario" ON public.usuarios;
CREATE POLICY "Admin pode atualizar qualquer usuario"
ON public.usuarios FOR UPDATE
TO authenticated
USING (
  public.current_user_has_role('admin')
);

-- Conceder permissão de execução nas funções para todos autenticados
GRANT EXECUTE ON FUNCTION public.current_user_has_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_any_role TO authenticated;
