-- Criar bucket para PDFs de precatórios
insert into storage.buckets (id, name, public)
values ('precatorios-pdf', 'precatorios-pdf', false)
on conflict (id) do nothing;

-- Policy: permitir upload para usuários autenticados
create policy "Usuários podem fazer upload de PDFs"
on storage.objects for insert
to authenticated
with check (bucket_id = 'precatorios-pdf');

-- Policy: permitir leitura para usuários autenticados
create policy "Usuários podem ler PDFs"
on storage.objects for select
to authenticated
using (bucket_id = 'precatorios-pdf');

-- Policy: permitir update para usuários autenticados (caso precise substituir)
create policy "Usuários podem atualizar PDFs"
on storage.objects for update
to authenticated
using (bucket_id = 'precatorios-pdf');

-- Policy: permitir delete apenas para admin
create policy "Apenas admin pode deletar PDFs"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'precatorios-pdf' 
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);
