# Runbook - Migracao Segura Supabase por Export/Import

Objetivo: migrar um projeto Supabase antigo para um projeto novo com o menor risco operacional possivel quando `Project Transfer` nao e viavel.

Escopo:
- banco de dados
- historico de migrations
- auth
- storage
- edge functions
- secrets e configuracoes criticas

Fora de escopo:
- mudanca de codigo da aplicacao
- merge de ambientes
- mudanca de modelo de dados durante a migracao

Referencias oficiais:
- Backup and restore: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- Migration guides: https://supabase.com/docs/guides/platform/migrating-within-supabase
- Auth users migration: https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects
- Edge Functions migration: https://supabase.com/docs/guides/troubleshooting/transfer-edge-function-from-one-project-to-another

---

## 1. Dados da operacao

- Projeto antigo:
- `OLD_PROJECT_REF`:
- Projeto novo:
- `NEW_PROJECT_REF`:
- Regiao antiga:
- Regiao nova:
- Responsavel tecnico:
- Janela planejada:
- Status: `Nao iniciado | Em andamento | Concluido | Rollback`

---

## 2. Estrategia segura

Use esta ordem:

1. preparar projeto novo
2. congelar escrita no antigo
3. exportar `roles`, `schema`, `data` e `supabase_migrations`
4. restaurar no novo
5. migrar storage
6. migrar functions
7. recriar secrets e configuracoes
8. validar tudo no novo
9. trocar variaveis da aplicacao
10. manter projeto antigo intacto ate estabilizar

Principio: nao misturar migracao estrutural com refactor. Primeiro copiar, depois melhorar.

---

## 3. Preflight obrigatorio

### 3.1 Projeto novo

- [ ] Criado na conta/organizacao destino
- [ ] Mesma regiao do antigo, salvo decisao explicita em contrario
- [ ] Plano compativel com o projeto antigo
- [ ] Extensoes necessarias habilitadas
- [ ] Credenciais do banco novo disponiveis

### 3.2 Projeto antigo

- [ ] Credenciais do banco antigo disponiveis
- [ ] Backup adicional validado
- [ ] Secrets e configuracoes inventariados
- [ ] Buckets e politicas inventariados
- [ ] Functions ativas inventariadas

### 3.3 Janela

- [ ] Deploy congelado
- [ ] Migrations congeladas
- [ ] Integracoes externas congeladas
- [ ] Time avisado
- [ ] Janela de cutover aprovada

Se qualquer item falhar, nao iniciar.

---

## 4. Export do banco antigo

Arquivos recomendados:

- `roles.sql`
- `schema.sql`
- `data.sql`
- `history_schema.sql`
- `history_data.sql`

Exportar nesta ordem:

1. roles
2. schema
3. data
4. historico de migrations

Observacoes:
- `data.sql` deve usar `--use-copy`
- prefira export com leitura congelada
- se houver rotinas em execucao alterando o banco, pare antes

---

## 5. Preparacao do projeto novo

Antes do restore:

- [ ] Confirmar acesso ao banco novo
- [ ] Confirmar extensoes exigidas pelo projeto
- [ ] Confirmar schemas especiais necessarios
- [ ] Confirmar se `auth`, `storage` ou `realtime` tiveram customizacao
- [ ] Confirmar se sera mantido ou nao o `JWT secret`

Decisao critica sobre `JWT secret`:

- Se `manter o JWT secret antigo`:
  - sessoes existentes podem continuar validas
  - chaves do projeto novo serao regeneradas
- Se `nao manter`:
  - usuarios mantem conta e senha
  - sessoes antigas expiram e exigem novo login

---

## 6. Restore do banco no projeto novo

Restore recomendado:

1. `roles.sql`
2. `schema.sql`
3. `data.sql` com `session_replication_role = replica`
4. `history_schema.sql`
5. `history_data.sql`

Regras:

- usar `--single-transaction`
- usar `ON_ERROR_STOP=1`
- revisar erros de ownership, principalmente `supabase_admin`
- se houver roles customizadas com login, redefinir senhas depois

Se aparecer erro em linhas com `OWNER TO "supabase_admin"`:
- comentar antes de restaurar
- reaplicar ownership apenas se realmente necessario

---

## 7. Storage

Ponto critico: o dump do banco leva os metadados do storage, mas `nao` leva os arquivos dos buckets.

Fluxo seguro:

1. inventariar buckets
2. baixar objetos do projeto antigo para uma pasta local
3. subir objetos para o projeto novo
4. validar acesso publico/autenticado
5. validar politicas em `storage.objects`

Nunca considerar a migracao concluida sem validar os arquivos reais.

---

## 8. Edge Functions

Fluxo seguro:

1. baixar as functions realmente implantadas no projeto antigo
2. comparar com o repositorio local
3. decidir o que deve ir para o projeto novo
4. deploy no projeto novo
5. recriar secrets consumidos por cada function
6. testar endpoints e invocations

Nunca assumir que o repositorio local reflete exatamente o remoto.

---

## 9. Secrets e configuracoes

Migrar manualmente:

- [ ] Edge Function secrets
- [ ] SMTP
- [ ] OAuth providers
- [ ] Redirect URLs
- [ ] Webhooks
- [ ] Cron jobs
- [ ] chaves anon/service role usadas pela app

Nao copiar valores de secrets para documentacao versionada.

---

## 10. Validacao obrigatoria

### 10.1 Banco

- [ ] Aplicacao conecta ao banco novo
- [ ] Leitura simples funciona
- [ ] Escrita simples funciona
- [ ] RLS continua correta
- [ ] Functions SQL importantes funcionam

### 10.2 Auth

- [ ] Login funciona
- [ ] Recuperacao de senha funciona
- [ ] OAuth funciona, se existir
- [ ] Fluxo de sessao funciona como planejado

### 10.3 Storage

- [ ] Buckets existem
- [ ] Objetos migrados existem
- [ ] Upload funciona
- [ ] Download funciona
- [ ] URLs publicas ou signed URLs funcionam

### 10.4 Functions

- [ ] Functions implantadas existem no novo projeto
- [ ] Secrets necessarios existem
- [ ] Invocations criticas respondem

### 10.5 Aplicacao

- [ ] Variaveis apontando para o projeto novo
- [ ] Sem erro de CORS inesperado
- [ ] Sem erro de permissao inesperado
- [ ] Fluxos criticos da aplicacao validados

---

## 11. Cutover

So trocar a aplicacao para o projeto novo quando toda a validacao estiver aprovada.

Ordem recomendada:

1. atualizar variaveis de ambiente
2. redeploy da aplicacao
3. validar novamente em producao
4. monitorar erros por uma janela acordada

---

## 12. Rollback

Gatilhos:

- login quebrado
- banco novo com erros criticos
- storage indisponivel
- functions criticas indisponiveis
- dados ausentes ou inconsistentes

Passos:

1. [ ] parar novos deploys
2. [ ] restaurar env vars do projeto antigo
3. [ ] redeploy da aplicacao apontando para o projeto antigo
4. [ ] confirmar saude do ambiente antigo
5. [ ] preservar evidencias do erro no novo

Principio de rollback: o projeto antigo so pode ser desligado depois de estabilidade comprovada no novo.

---

## 13. Criterio de sucesso

- [ ] Banco antigo exportado sem erro
- [ ] Banco novo restaurado sem erro bloqueante
- [ ] Storage migrado
- [ ] Functions migradas
- [ ] Secrets e configuracoes recriados
- [ ] Auth validado
- [ ] Aplicacao validada no projeto novo
- [ ] Rollback desnecessario

---

## 14. Pos-operacao

- [ ] Registrar data e operador
- [ ] Salvar logs e artefatos da migracao
- [ ] Manter projeto antigo em retencao por periodo acordado
- [ ] Revisar necessidade de rotacao de chaves
- [ ] Atualizar documentacao interna
