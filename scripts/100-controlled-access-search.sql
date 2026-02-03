-- scripts/100-controlled-access-search.sql
-- Busca privilegiada (ignora RLS) APENAS para papéis autorizados
-- Retorna poucos campos e exige termo mínimo.
-- [UPDATED] Normaliza termo de busca E trata roles de forma defensiva (JSONB ou ARRAY)

create or replace function public.buscar_precatorios_acesso_controlado(p_termo text)
returns table (
  id uuid,
  numero_precatorio text,
  numero_processo text,
  credor_nome text,
  status text,
  localizacao_kanban text,
  responsavel_nome text,
  responsavel_calculo_nome text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_roles text[];
  v_role_data jsonb;
  v_role_text text;
  v_term_raw text;
  v_term_clean text;
begin
  -- sanitização básica
  v_term_raw := trim(coalesce(p_termo, ''));
  v_term_clean := regexp_replace(v_term_raw, '\D', '', 'g');

  if length(v_term_raw) < 3 then
    return;
  end if;

  -- RECUPERAÇÃO DE ROLES SUPER ROBUSTA
  -- Tenta pegar como jsonb primeiro (caso seja array json) ou text normal
  begin
    select to_jsonb(u.role) into v_role_data
    from public.usuarios u
    where u.id = auth.uid();
    
    -- Se for null, array vazio
    if v_role_data is null then
      v_user_roles := array[]::text[];
    -- Se for um array JSON ["admin", "gestor"]
    elsif jsonb_typeof(v_role_data) = 'array' then
      select array_agg(x) into v_user_roles from jsonb_array_elements_text(v_role_data) t(x);
    -- Se for string simples "admin" ou array nativo postgres convertido pra json
    else
      -- Tenta pegar direto como array nativo
      select u.role into v_user_roles
      from public.usuarios u
      where u.id = auth.uid();
    end if;
  exception when others then
    -- Fallback final: tenta como text[] direto
    begin
        select u.role::text[] into v_user_roles
        from public.usuarios u
        where u.id = auth.uid();
    exception when others then
        -- Se falhar conversão, assume vazio para seguranca
        v_user_roles := array[]::text[];
    end;
  end;

  -- DEBUG (aparece no log do supabase se necessário, mas aqui só validamos)
  
  -- Validação de role
  if not (
    'admin' = ANY(v_user_roles) or
    'gestor' = ANY(v_user_roles) or
    'gestor_oficio' = ANY(v_user_roles) or
    'gestor_certidoes' = ANY(v_user_roles)
  ) then
    raise exception 'Acesso negado - Permissões insuficientes. Suas roles: %', v_user_roles;
  end if;

  -- BUSCA GLOBAL
  return query
  select
    p.id,
    p.numero_precatorio,
    p.numero_processo,
    p.credor_nome,
    p.status,
    p.localizacao_kanban,
    u_resp.nome as responsavel_nome,
    u_calc.nome as responsavel_calculo_nome,
    p.created_at
  from public.precatorios p
  left join public.usuarios u_resp on p.responsavel = u_resp.id
  left join public.usuarios u_calc on p.responsavel_calculo_id = u_calc.id
  where
    (
      -- Busca por nome (usa termo original)
      p.credor_nome ilike '%' || v_term_raw || '%'
      
      -- Busca por número (usa termo limpo se tiver pelo menos 3 digitos)
      OR (
        length(v_term_clean) >= 3 AND (
          regexp_replace(p.numero_precatorio, '\D', '', 'g') ILIKE '%' || v_term_clean || '%'
          OR 
          regexp_replace(p.numero_processo, '\D', '', 'g') ILIKE '%' || v_term_clean || '%'
        )
      )

      -- Fallback
      OR p.numero_precatorio ilike '%' || v_term_raw || '%'
      OR p.numero_processo ilike '%' || v_term_raw || '%'
    )
  order by p.created_at desc
  limit 25;
end;
$$;

-- Permissões
revoke all on function public.buscar_precatorios_acesso_controlado(text) from public;
grant execute on function public.buscar_precatorios_acesso_controlado(text) to authenticated;
