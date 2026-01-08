-- =====================================================
-- CORREÇÃO COMPLETA: Role no JWT + RLS Fila Global
-- =====================================================

-- 1) Função para sincronizar role de usuarios → auth.users.app_metadata
create or replace function sync_user_role_to_auth()
returns trigger
language plpgsql
security definer
as $$
begin
  -- atualiza app_metadata no Auth
  update auth.users
  set raw_app_meta_data = jsonb_set(
    coalesce(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(NEW.role)
  )
  where id = NEW.id;
  
  return NEW;
end;
$$;

-- 2) Trigger para sincronizar automaticamente quando role mudar
drop trigger if exists sync_role_trigger on public.usuarios;
create trigger sync_role_trigger
after insert or update of role on public.usuarios
for each row
execute function sync_user_role_to_auth();

-- 3) Sincronizar roles existentes (executar uma vez)
do $$
declare
  r record;
begin
  for r in select id, role from public.usuarios where role is not null loop
    update auth.users
    set raw_app_meta_data = jsonb_set(
      coalesce(raw_app_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(r.role)
    )
    where id = r.id;
  end loop;
end;
$$;

-- 4) Policy SELECT com fila global para operador_calculo
drop policy if exists "precatorios_select_with_global_queue" on public.precatorios;

create policy "precatorios_select_with_global_queue"
on public.precatorios
for select
using (
  deleted_at is null
  and (
    -- Admin vê tudo
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    
    -- Qualquer um vê o que criou
    or criado_por = auth.uid()
    
    -- Comercial vê os atribuídos
    or responsavel = auth.uid()
    
    -- Cálculo vê os atribuídos especificamente
    or responsavel_calculo_id = auth.uid()
    or operador_calculo = auth.uid()
    
    -- FILA GLOBAL: operador_calculo vê todos em_calculo e calculado
    or (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'operador_calculo'
      and status in ('em_calculo', 'calculado')
    )
  )
);

-- 5) Garantir que view também reflete essa policy
drop view if exists public.precatorios_cards;
create or replace view public.precatorios_cards as
select
  p.*,
  -- Campos display para propostas
  coalesce(to_char(p.proposta_menor_valor, 'FM999G999G999D00'), 'Aguardando') as proposta_menor_valor_display,
  coalesce(to_char(p.proposta_maior_valor, 'FM999G999G999D00'), 'Aguardando') as proposta_maior_valor_display,
  coalesce(to_char(p.proposta_menor_percentual, 'FM990D00') || '%', 'Aguardando') as proposta_menor_percentual_display,
  coalesce(to_char(p.proposta_maior_percentual, 'FM990D00') || '%', 'Aguardando') as proposta_maior_percentual_display,
  -- Campos display para datas
  coalesce(to_char(p.data_calculo, 'DD/MM/YYYY'), 'Aguardando') as data_calculo_display,
  coalesce(p.dados_calculo, 'Aguardando cálculo') as dados_calculo_display
from public.precatorios p
where p.deleted_at is null;

-- Comentário final
comment on function sync_user_role_to_auth is 
'Sincroniza automaticamente o role de public.usuarios para auth.users.app_metadata';
