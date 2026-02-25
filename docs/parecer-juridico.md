# Modulo Parecer Juridico

## O que foi adicionado

- Estrutura de banco para pareceres juridicos multiempresa:
  - `legal_opinions`
  - `legal_opinion_comments`
  - `legal_opinion_events`
  - `legal_opinion_attachments`
  - base de tenant: `tenants` e `tenant_members`
- RLS por tenant para tabelas e bucket `legal-opinions`.
- APIs em `app/api/legal-opinions/*` para CRUD, comentarios, eventos e anexos.
- Interface:
  - Lista do modulo em `/parecer-juridico`
  - Detalhe em `/parecer-juridico/detalhes?id=<uuid>`
  - Compatibilidade de rota em `/parecer-juridico/[id]`
  - Aba integrada no detalhe de precatorio (`tab=juridico`)

## Como aplicar no Supabase

1. Rode a migration:
   - `supabase db push`
   - ou aplique manualmente `supabase/migrations/20260225170000_227_legal_opinions_module.sql`
2. (Opcional DEV) rode seed:
   - `scripts/228-seed-legal-opinions-dev.sql`

## Como testar rapido

1. Acesse `/parecer-juridico` e confirme carregamento da lista.
2. Clique em `Solicitar Parecer`, preencha e salve.
3. Abra um precatorio em `/precatorios/detalhes?id=<id>&tab=juridico` e valide o painel.
4. No detalhe do parecer, adicione comentario e anexo.
5. Baixe o anexo e confirme que a extensao original foi preservada.

