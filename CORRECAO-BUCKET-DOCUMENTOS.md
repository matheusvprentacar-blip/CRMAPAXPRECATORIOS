# 🔧 Correção: Bucket 'documentos' não encontrado

## ❌ Erro Identificado
```
StorageApiError: Bucket not found
Failed to load resource: the server responded with a status of 400
```

## ✅ Solução: Criar Bucket no Supabase

### Passo 1: Acessar Supabase Storage
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. No menu lateral, clique em **Storage**

### Passo 2: Criar Bucket 'documentos'
1. Clique em **"New bucket"** ou **"Create a new bucket"**
2. Preencha:
   - **Name**: `documentos`
   - **Public bucket**: ✅ **Marque como público** (para gerar URLs públicas)
   - **File size limit**: 50 MB (ou conforme necessário)
   - **Allowed MIME types**: `application/pdf` (ou deixe vazio para todos)

3. Clique em **"Create bucket"**

### Passo 3: Configurar Políticas (Policies)

Após criar o bucket, configure as políticas de acesso:

#### 3.1. Política de Upload (INSERT)
```sql
-- Permitir upload para usuários autenticados
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos');
```

#### 3.2. Política de Leitura (SELECT)
```sql
-- Permitir leitura pública
CREATE POLICY "Leitura pública de documentos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documentos');
```

#### 3.3. Política de Exclusão (DELETE)
```sql
-- Permitir exclusão apenas para o dono
CREATE POLICY "Usuários podem excluir seus próprios arquivos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documentos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Passo 4: Criar Pasta 'oficios'

Após criar o bucket:
1. Clique no bucket `documentos`
2. Clique em **"Create folder"** ou **"New folder"**
3. Nome: `oficios`
4. Clique em **"Create"**

---

## 🧪 Testar Novamente

Após criar o bucket e configurar as políticas:

1. Acesse: http://localhost:3000/admin/precatorios
2. Clique em **"Upload de Ofícios"**
3. Selecione 1-2 PDFs de teste
4. Clique em **"Fazer Upload"**
5. Verifique se os precatórios aparecem na aba **"Pendentes"**

---

## 📋 Checklist

- [ ] Bucket `documentos` criado
- [ ] Bucket marcado como **público**
- [ ] Políticas de INSERT, SELECT, DELETE configuradas
- [ ] Pasta `oficios/` criada dentro do bucket
- [ ] Teste de upload realizado com sucesso
- [ ] Precatórios aparecem na aba "Pendentes"
- [ ] PDF acessível via URL pública

---

## 🔍 Verificar URLs Geradas

Após o upload bem-sucedido, as URLs devem seguir o padrão:
```
https://[PROJECT_ID].supabase.co/storage/v1/object/public/documentos/oficios/[FILENAME].pdf
```

Exemplo:
```
https://ldtildnelijndhswcmss.supabase.co/storage/v1/object/public/documentos/oficios/1768109387622-teste1.pdf
```

---

## ⚠️ Troubleshooting

### Erro: "Bucket not found"
- Verifique se o bucket foi criado com o nome exato: `documentos`
- Verifique se está no projeto correto do Supabase

### Erro: "Access denied"
- Verifique se as políticas foram criadas corretamente
- Verifique se o bucket está marcado como público

### Erro: "File too large"
- Aumente o limite de tamanho do bucket
- Ou reduza o tamanho dos PDFs de teste
