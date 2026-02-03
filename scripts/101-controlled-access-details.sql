-- scripts/101-controlled-access-details.sql
-- RPC para buscar detalhes do precatório pelo ID ignorando RLS
-- Somente para roles privilegiados (admin, gestor, gestor_oficio, gestor_certidoes)
-- [UPDATED] Robust role check (JSONB or TEXT[])

create or replace function public.buscar_precatorio_por_id_acesso_controlado(p_id uuid)
returns setof public.precatorios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_roles text[];
  v_role_data jsonb;
begin
  -- RECUPERAÇÃO DE ROLES SUPER ROBUSTA
  begin
    select to_jsonb(u.role) into v_role_data
    from public.usuarios u
    where u.id = auth.uid();
    
    if v_role_data is null then
      v_user_roles := array[]::text[];
    elsif jsonb_typeof(v_role_data) = 'array' then
      select array_agg(x) into v_user_roles from jsonb_array_elements_text(v_role_data) t(x);
    else
      -- Tenta pegar direto como array nativo
      select u.role into v_user_roles
      from public.usuarios u
      where u.id = auth.uid();
    end if;
  exception when others then
    begin
        select u.role::text[] into v_user_roles
        from public.usuarios u
        where u.id = auth.uid();
    exception when others then
        v_user_roles := array[]::text[];
    end;
  end;

  -- Validação de role (suporta array)
  if not (
    'admin' = ANY(v_user_roles) or
    'gestor' = ANY(v_user_roles) or
    'gestor_oficio' = ANY(v_user_roles) or
    'gestor_certidoes' = ANY(v_user_roles)
  ) then
    raise exception 'Acesso negado';
  end if;

  return query
  select * from public.precatorios where id = p_id;
end;
$$;

-- Permissões
revoke all on function public.buscar_precatorio_por_id_acesso_controlado(uuid) from public;
grant execute on function public.buscar_precatorio_por_id_acesso_controlado(uuid) to authenticated;
