# Comandos - Migracao Supabase por Export/Import

Este arquivo concentra comandos base com placeholders. Ajuste os valores antes de executar.

Nao commitar:
- senhas
- `service_role`
- `db_url`
- `JWT secret`

---

## 1. Variaveis de trabalho

```powershell
$OLD_PROJECT_REF = "<OLD_PROJECT_REF>"
$NEW_PROJECT_REF = "<NEW_PROJECT_REF>"

$OLD_DB_URL = "<OLD_DB_URL_PERCENT_ENCODED>"
$NEW_DB_URL = "<NEW_DB_URL_PERCENT_ENCODED>"

$EXPORT_DIR = ".\\supabase-migration-export"
$STORAGE_DIR = ".\\supabase-storage-export"
$FUNCTIONS_DIR = ".\\supabase-functions-export"

New-Item -ItemType Directory -Force -Path $EXPORT_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $STORAGE_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $FUNCTIONS_DIR | Out-Null
```

---

## 2. Export do banco antigo

```powershell
npx supabase db dump --db-url $OLD_DB_URL -f "$EXPORT_DIR\\roles.sql" --role-only
npx supabase db dump --db-url $OLD_DB_URL -f "$EXPORT_DIR\\schema.sql"
npx supabase db dump --db-url $OLD_DB_URL -f "$EXPORT_DIR\\data.sql" --data-only --use-copy

npx supabase db dump --db-url $OLD_DB_URL -f "$EXPORT_DIR\\history_schema.sql" --schema supabase_migrations
npx supabase db dump --db-url $OLD_DB_URL -f "$EXPORT_DIR\\history_data.sql" --schema supabase_migrations --data-only --use-copy
```

Opcional para revisar sem executar:

```powershell
npx supabase db dump --db-url $OLD_DB_URL --dry-run
```

---

## 3. Restore no banco novo

Revise antes:
- linhas com `OWNER TO "supabase_admin"`
- statements com ownership de roles inexistentes

```powershell
psql `
  --single-transaction `
  --variable ON_ERROR_STOP=1 `
  --file "$EXPORT_DIR\\roles.sql" `
  --file "$EXPORT_DIR\\schema.sql" `
  --command "SET session_replication_role = replica;" `
  --file "$EXPORT_DIR\\data.sql" `
  --dbname $NEW_DB_URL

psql `
  --single-transaction `
  --variable ON_ERROR_STOP=1 `
  --file "$EXPORT_DIR\\history_schema.sql" `
  --file "$EXPORT_DIR\\history_data.sql" `
  --dbname $NEW_DB_URL
```

---

## 4. Listar backups fisicos do projeto antigo

```powershell
npx supabase backups list --project-ref $OLD_PROJECT_REF
```

---

## 5. Inventario de functions remotas

```powershell
npx supabase functions list --project-ref $OLD_PROJECT_REF
npx supabase functions list --project-ref $NEW_PROJECT_REF
```

Baixar functions do projeto antigo:

```powershell
npx supabase functions download --project-ref $OLD_PROJECT_REF --use-api
Copy-Item -Recurse -Force ".\\supabase\\functions" $FUNCTIONS_DIR
```

Deploy no projeto novo:

```powershell
npx supabase functions deploy admin-actions --project-ref $NEW_PROJECT_REF --use-api
npx supabase functions deploy comunicados-ai --project-ref $NEW_PROJECT_REF --use-api
```

Se quiser implantar tudo que existir localmente, rode por funcao e evite `--prune` na primeira passada.

---

## 6. Inventario e carga de secrets

Listar apenas nomes no projeto antigo:

```powershell
npx supabase secrets list --project-ref $OLD_PROJECT_REF
```

Aplicar no projeto novo por arquivo `.env` temporario:

```powershell
npx supabase secrets set --project-ref $NEW_PROJECT_REF --env-file ".\\migration-secrets.env"
```

Formato do arquivo temporario:

```env
OPENAI_API_KEY=<VALUE>
SUPABASE_URL=<VALUE>
SUPABASE_ANON_KEY=<VALUE>
SUPABASE_SERVICE_ROLE_KEY=<VALUE>
SUPABASE_DB_URL=<VALUE>
```

Apague o arquivo temporario depois do uso.

---

## 7. Migracao de storage

Observacao: `storage cp` exige `--experimental`.

Como o CLI opera contra um projeto por vez, o caminho mais seguro e usar a maquina local como intermediaria.

### 7.1 Baixar do projeto antigo

Exemplos por bucket:

```powershell
npx supabase --experimental storage cp -r ss:///documentos "$STORAGE_DIR\\documentos"
npx supabase --experimental storage cp -r ss:///logos "$STORAGE_DIR\\logos"
npx supabase --experimental storage cp -r ss:///precatorios-documentos "$STORAGE_DIR\\precatorios-documentos"
npx supabase --experimental storage cp -r ss:///precatorios-pdf "$STORAGE_DIR\\precatorios-pdf"
npx supabase --experimental storage cp -r ss:///ocr-uploads "$STORAGE_DIR\\ocr-uploads"
npx supabase --experimental storage cp -r ss:///comunicados "$STORAGE_DIR\\comunicados"
npx supabase --experimental storage cp -r ss:///documents "$STORAGE_DIR\\documents"
npx supabase --experimental storage cp -r ss:///legal-opinions "$STORAGE_DIR\\legal-opinions"
```

### 7.2 Subir para o projeto novo

Depois de trocar o link ou o perfil autenticado para o projeto novo:

```powershell
npx supabase --experimental storage cp -r "$STORAGE_DIR\\documentos" ss:///documentos
npx supabase --experimental storage cp -r "$STORAGE_DIR\\logos" ss:///logos
npx supabase --experimental storage cp -r "$STORAGE_DIR\\precatorios-documentos" ss:///precatorios-documentos
npx supabase --experimental storage cp -r "$STORAGE_DIR\\precatorios-pdf" ss:///precatorios-pdf
npx supabase --experimental storage cp -r "$STORAGE_DIR\\ocr-uploads" ss:///ocr-uploads
npx supabase --experimental storage cp -r "$STORAGE_DIR\\comunicados" ss:///comunicados
npx supabase --experimental storage cp -r "$STORAGE_DIR\\documents" ss:///documents
npx supabase --experimental storage cp -r "$STORAGE_DIR\\legal-opinions" ss:///legal-opinions
```

Se algum bucket nao existir, crie antes no projeto novo.

---

## 8. Validacoes uteis

Projeto e orgs:

```powershell
npx supabase projects list
npx supabase orgs list
```

Banco:

```powershell
npx supabase inspect db db-stats
```

Secrets:

```powershell
npx supabase secrets list --project-ref $NEW_PROJECT_REF
```

Functions:

```powershell
npx supabase functions list --project-ref $NEW_PROJECT_REF
```

---

## 9. Checklist de cutover

```powershell
# 1. Atualize env vars da aplicacao para o projeto novo
# 2. Rode deploy da aplicacao
# 3. Teste login, leitura, escrita, storage e functions
```

---

## 10. Itens que exigem verificacao manual no Dashboard

- SMTP
- OAuth providers
- Redirect URLs
- JWT secret
- politicas e estado de buckets
- webhooks
- cron jobs
