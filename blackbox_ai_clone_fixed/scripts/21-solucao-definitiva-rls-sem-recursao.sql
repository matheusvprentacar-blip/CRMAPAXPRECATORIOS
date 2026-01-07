-- ============================================
-- SOLUÇÃO DEFINITIVA: RLS SEM RECURSÃO
-- ============================================
-- Remove todas as policies antigas da tabela usuarios
-- e cria novas usando JWT app_metadata.role (SEM consultar usuarios)

-- 1) REMOVER TODAS AS POLICIES ANTIGAS
do $$
declare r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname='public' and tablename='usuarios'
  loop
    execute format('drop policy if exists %I on public.usuarios;', r.policyname);
  end loop;
end $$;

-- 2) GARANTIR QUE RLS ESTÁ ATIVO
alter table public.usuarios enable row level security;

-- 3) CRIAR POLICIES NOVAS SEM RECURSÃO
-- Usam apenas auth.uid() e auth.jwt() -> 'app_metadata' ->> 'role'

-- SELECT: usuário vê o próprio perfil OU admin vê tudo
create policy "usuarios_select_own_or_admin"
on public.usuarios
for select
using (
  id = auth.uid()
  or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- INSERT: usuário só pode criar o próprio perfil (id = auth.uid())
create policy "usuarios_insert_own"
on public.usuarios
for insert
with check (id = auth.uid());

-- UPDATE: usuário edita o próprio perfil OU admin edita tudo
create policy "usuarios_update_own_or_admin"
on public.usuarios
for update
using (
  id = auth.uid()
  or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  id = auth.uid()
  or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- DELETE: apenas admin pode deletar
create policy "usuarios_delete_admin_only"
on public.usuarios
for delete
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- 4) REMOVER FUNÇÃO is_admin() SE EXISTIR (causa recursão)
drop function if exists is_admin(uuid) cascade;
drop function if exists is_admin() cascade;
