# Preflight - Migracao Supabase por Export/Import

Data da coleta: `2026-03-14`
Workspace: `CRMAPAXPRECATORIOS`

Status geral: `Parcialmente pronto`

Resumo:
- O projeto antigo esta acessivel via Supabase CLI.
- O caminho por `Project Transfer` deixou de ser o principal.
- Ha evidencias suficientes para preparar a migracao por export/import.
- Ainda faltam inventario final do projeto novo e verificacao remota completa dos buckets.

---

## 1. Projeto antigo acessivel

Projeto vinculado localmente:
- `OLD_PROJECT_REF`: `ldtildnelijndhswcmss`
- Nome visivel: `CRM APAX Investimentos`
- Regiao: `South America (Sao Paulo)`

Org visivel na autenticacao atual:
- `yzofmydcppktzspgpgfu`
- Nome: `matheus.vprentacar@gmail.com's Org`

Risco:
- a autenticacao atual nao demonstrou acesso a uma segunda org via CLI
- isso nao impede export/import
- isso impede automacao de transferencia entre orgs por esta sessao

---

## 2. Banco remoto - sinal basico

Saida de `inspect db db-stats`:
- Database Size: `56 MB`
- Total Index Size: `14 MB`
- Total Table Size: `21 MB`
- WAL Size: `128 MB`
- Hit rate de tabela e indice: `1.00`

Interpretacao:
- banco de tamanho pequeno a medio para migracao logica
- sem indicio imediato de volume impeditivo para dump logico

Limite encontrado:
- `inspect db table-stats` excedeu o timeout padrao
- recomendacao: rerodar em janela propria se quiser ranking detalhado de tabelas antes do cutover

---

## 3. Backups fisicos

Saida de `supabase backups list`:
- `WALG`: `true`
- `PITR`: `false`
- `EARLIEST TIMESTAMP`: `0`
- `LATEST TIMESTAMP`: `0`

Interpretacao:
- nao tratar PITR como estrategia primaria de rollback neste projeto
- o rollback operacional deve continuar sendo "voltar a app para o projeto antigo"

---

## 4. Edge Functions

Functions ativas no projeto remoto antigo:
- `admin-actions`
- `comunicados-ai`

Functions presentes localmente no repositorio:
- `admin-actions`
- `ai-extract`
- `analyze-excel`
- `comunicados-ai`
- `import-excel`
- `import-json`
- `market-refresh`

Achado importante:
- remoto e repositorio `nao` estao alinhados
- a migracao nao pode assumir que "deploy everything local" replica fielmente o ambiente antigo

Recomendacao:
- baixar as functions remotas do projeto antigo antes do deploy no projeto novo
- decidir explicitamente se as functions locais adicionais devem ou nao entrar no novo projeto

---

## 5. Secrets remotos

Secrets listados no projeto antigo:
- `OPENAI_API_KEY`
- `SUPABASE_ANON_KEY`
- `SUPABASE_DB_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`

Observacao:
- os nomes foram confirmados
- os valores `nao` devem ser copiados para documentacao versionada

Recomendacao:
- montar um arquivo `.env` temporario apenas na hora da carga no projeto novo
- apagar o arquivo apos `supabase secrets set`

---

## 6. Buckets e storage

Buckets inferidos pelo codigo e scripts do projeto:
- `documentos`
- `logos`
- `precatorios-documentos`
- `precatorios-pdf`
- `ocr-uploads`
- `comunicados`
- `documents`
- `legal-opinions`

Evidencias:
- bucket `legal-opinions` aparece em migration recente
- bucket `logos` aparece em script SQL
- buckets `ocr-uploads`, `comunicados`, `documents`, `precatorios-documentos`, `precatorios-pdf` aparecem no codigo

Limite encontrado:
- `supabase storage ls` com `--experimental` nao respondeu dentro do timeout para confirmar buckets remotos

Risco:
- lista acima e forte, mas ainda precisa de confirmacao final no projeto antigo

Recomendacao:
- confirmar buckets no Dashboard antes do cutover
- tratar storage como fase separada e obrigatoria da migracao

---

## 7. Migrations e customizacoes

Migrations locais em `supabase/migrations`:
- `17` arquivos

Customizacoes detectadas:
- uso intenso de `auth.uid()` e `auth.jwt()`
- politicas e bucket em `storage.objects` e `storage.buckets`
- criacao do bucket `legal-opinions` em migration

Achado importante:
- ha customizacao real em `storage`
- isso exige verificacao extra apos restore do banco e apos migracao dos arquivos

Nao houve evidencia local clara de customizacao pesada em:
- `cron`
- `pg_cron`
- `vault`
- `realtime publication`

Observacao:
- ausencia de evidencia local nao substitui confirmacao final no Dashboard e no banco remoto

---

## 8. Aplicacao - dependencias sensiveis ao cutover

Dependencias claras da aplicacao:
- `Auth`
- `Storage`
- `Edge Functions`
- banco com RLS

Buckets claramente usados pelo codigo:
- `ocr-uploads`
- `comunicados`
- `documents`
- `precatorios-documentos`
- `precatorios-pdf`
- `logos`

Risco:
- se qualquer um desses buckets ou politicas faltar no projeto novo, a aplicacao sobe mas quebra em runtime

---

## 9. Pendencias antes da execucao

- [ ] criar projeto novo e registrar `NEW_PROJECT_REF`
- [ ] obter `NEW_DB_URL`
- [ ] confirmar buckets reais no projeto antigo
- [ ] definir estrategia para `JWT secret`
- [ ] baixar functions remotas do projeto antigo
- [ ] montar arquivo temporario de secrets para o projeto novo
- [ ] validar extensoes e configuracoes do projeto novo

---

## 10. Conclusao operacional

Este projeto esta `apto para preparacao de export/import`, com tres alertas principais:

1. `storage` precisa migracao propria e confirmacao manual
2. `functions` remotas e locais nao batem
3. `PITR` nao deve ser assumido como rollback pratico

Proximo passo recomendado:
- usar `docs/SUPABASE_EXPORT_IMPORT_COMMANDS.md`
- executar export do projeto antigo
- preparar o projeto novo antes de qualquer cutover
