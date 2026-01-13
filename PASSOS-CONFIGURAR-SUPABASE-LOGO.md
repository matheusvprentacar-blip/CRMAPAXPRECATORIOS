# Passos para Configurar o Logo da Empresa no Supabase

## ✅ O que precisa ser feito

Para a funcionalidade de Logo da Empresa funcionar, você precisa executar **1 script SQL** no Supabase.

## 📝 Passo a Passo

### 1. Acessar o Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Faça login na sua conta
3. Selecione seu projeto

### 2. Abrir o SQL Editor

1. No menu lateral esquerdo, clique em **"SQL Editor"**
2. Clique em **"New query"** (ou use uma query existente)

### 3. Executar o Script 75

1. Abra o arquivo: `scripts/75-adicionar-logo-empresa.sql`
2. Copie TODO o conteúdo do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **"Run"** (ou pressione Ctrl+Enter)

### 4. Verificar se funcionou

Você deve ver a mensagem:
```
Script 75 executado com sucesso!
```

### 5. Verificar o Bucket

1. No menu lateral, clique em **"Storage"**
2. Você deve ver um bucket chamado **"logos"**
3. Se não aparecer, execute o script novamente

## 🔍 O que o Script 75 faz?

1. **Cria a tabela** `configuracoes_sistema`:
   - `logo_url` - URL do logo
   - `nome_empresa` - Nome da empresa
   - `subtitulo_empresa` - Subtítulo

2. **Cria o bucket** `logos` no Storage:
   - Público (qualquer um pode ver)
   - Upload apenas para admin

3. **Cria policies de segurança**:
   - Leitura pública
   - Upload/Update/Delete apenas admin

4. **Cria trigger** para `updated_at`

## ✅ Após Executar o Script

1. Reinicie a aplicação (se estiver rodando)
2. Faça login como **admin**
3. Acesse **"Configurações"** no menu lateral
4. Faça upload do logo
5. O logo aparecerá no sidebar

## ⚠️ Troubleshooting

### Erro: "relation configuracoes_sistema already exists"
**Solução**: A tabela já existe. Tudo OK!

### Erro: "bucket logos already exists"
**Solução**: O bucket já existe. Tudo OK!

### Logo não aparece após upload
**Soluções**:
1. Limpe o cache do navegador (Ctrl+Shift+R)
2. Verifique se o bucket "logos" é público:
   - Storage → logos → Settings → Public bucket = ON
3. Verifique se a URL foi salva:
   ```sql
   SELECT * FROM configuracoes_sistema;
   ```

### Erro de permissão ao fazer upload
**Soluções**:
1. Verifique se você está logado como admin
2. Execute este SQL para verificar:
   ```sql
   SELECT 
     auth.uid() as user_id,
     auth.jwt() -> 'app_metadata' ->> 'role' as role
   FROM usuarios
   WHERE id = auth.uid();
   ```
3. Se role não for 'admin', execute:
   ```sql
   -- Substitua SEU_EMAIL pelo seu email
   UPDATE auth.users
   SET raw_app_meta_data = 
     raw_app_meta_data || '{"role": "admin"}'::jsonb
   WHERE email = 'SEU_EMAIL@example.com';
   ```

## 📚 Documentação Relacionada

- `GUIA-CONFIGURAR-LOGO-EMPRESA.md` - Guia completo de uso
- `scripts/75-adicionar-logo-empresa.sql` - Script SQL
- `app/(dashboard)/configuracoes/page.tsx` - Código da página

## 🎯 Resumo Rápido

```bash
# 1. Abrir Supabase Dashboard
# 2. SQL Editor → New query
# 3. Copiar scripts/75-adicionar-logo-empresa.sql
# 4. Colar e executar (Run)
# 5. Verificar mensagem de sucesso
# 6. Acessar /configuracoes como admin
# 7. Fazer upload do logo
```

Pronto! Seu sistema agora tem logo personalizado! 🎉
