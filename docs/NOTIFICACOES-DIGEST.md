# Digest semanal de notificacoes

Este projeto inclui a funcao RPC `weekly_digest_generate()` para gerar um resumo semanal por responsavel.

## Supabase Scheduled Triggers (preferencial)
1) Acesse o painel do Supabase > Database > Scheduled Triggers.
2) Crie um novo job semanal com o cron abaixo:
   - `0 9 * * 1` (segunda-feira, 09:00 BRT - ajuste conforme seu fuso)
3) SQL do job:
   - `select public.weekly_digest_generate();`

## Cron externo (Vercel Cron / servidor)
Se o seu plano nao tiver Scheduled Triggers:
1) Crie uma rota protegida no Next.js (ex.: `/api/cron/weekly-digest`) que execute:
   - `supabase.rpc("weekly_digest_generate")` usando a service_role key.
2) Agende via Vercel Cron (ou outro scheduler) para rodar 1x por semana.

Observacao: a funcao faz dedupe e nao gera digests duplicados no mesmo periodo.
