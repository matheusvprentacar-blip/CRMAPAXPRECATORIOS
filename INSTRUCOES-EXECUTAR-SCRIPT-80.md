# 📋 Instruções: Executar Script 80 - Criar Bucket 'documentos'

## 🎯 Objetivo
Criar o bucket `documentos` no Supabase Storage para armazenar ofícios requisitórios e outros documentos.

---

## 📝 Passo a Passo

### 1. Acessar Supabase Dashboard
1. Acesse: https://supabase.com/dashboard
2. Faça login
3. Selecione seu projeto

### 2. Abrir SQL Editor
1. No menu lateral, clique em **"SQL Editor"**
2. Clique em **"New query"** ou **"+ New Query"**

### 3. Copiar e Colar o Script
1. Abra o arquivo: `scripts/80-criar-bucket-documentos.sql`
2. **Copie TODO o conteúdo** do script
3. **Cole** no SQL Editor do Supabase

### 4. Executar o Script
1. Clique em **"Run"** ou pressione **Ctrl+Enter** (Windows) / **Cmd+Enter** (Mac)
2. Aguarde a execução
3. Verifique se não há erros na saída

### 5. Verificar Resultado

Você deve ver na saída:

```
✅ Script 80 executado com sucesso!
Bucket "documentos" criado e configurado
Teste o upload em: /admin/precatorios
```

---

## 🔍 Verificações

### Verificar Bucket Criado
1. No menu lateral, clique em **"Storage"**
2. Você deve ver o bucket **"documentos"** na lista
3. Clique no bucket para abrir
4. Verifique se está marcado como **"Public"** (ícone de globo 🌐)

### Verificar Políticas
1. Clique no bucket **"documentos"**
2. Clique na aba **"Policies"**
3. Você deve ver 4 políticas:
   - ✅ Usuários autenticados podem fazer upload
   - ✅ Leitura pública de documentos
   - ✅ Usuários podem atualizar seus próprios arquivos
   - ✅ Usuários podem excluir seus próprios arquivos

---

## 🧪 Testar Upload

Após executar o script:

1. Acesse: http://localhost:3000/admin/precatorios
2. Clique em **"Upload de Ofícios"**
3. Selecione 1-2 PDFs de teste
4. Clique em **"Fazer Upload"**
5. Verifique se:
   - ✅ Upload é bem-sucedido
   - ✅ Precatórios aparecem na aba "Pendentes"
   - ✅ PDF é acessível via URL pública

---

## ⚠️ Troubleshooting

### Erro: "relation storage.buckets does not exist"
**Solução**: O Supabase Storage não está habilitado no projeto.
1. Vá em **Storage** no menu lateral
2. Clique em **"Enable Storage"** ou **"Get Started"**
3. Execute o script novamente

### Erro: "duplicate key value violates unique constraint"
**Solução**: O bucket já existe.
1. Vá em **Storage** > **documentos**
2. Verifique se as políticas estão configuradas
3. Se não, execute apenas a parte de políticas do script

### Erro: "permission denied for table buckets"
**Solução**: Você não tem permissões de admin.
1. Verifique se está logado como admin no Supabase
2. Ou execute via **SQL Editor** (tem mais permissões)

---

## 📊 Estrutura Final

Após executar o script, a estrutura será:

```
Supabase Storage
└── documentos/ (bucket público)
    ├── oficios/          (criado automaticamente no primeiro upload)
    ├── certidoes/        (criar conforme necessário)
    ├── contratos/        (criar conforme necessário)
    └── outros/           (criar conforme necessário)
```

---

## ✅ Checklist de Conclusão

- [ ] Script 80 executado sem erros
- [ ] Bucket `documentos` visível no Storage
- [ ] Bucket marcado como **público**
- [ ] 4 políticas criadas e ativas
- [ ] Teste de upload bem-sucedido
- [ ] Precatórios criados na aba "Pendentes"
- [ ] PDF acessível via URL pública

---

## 🚀 Próximos Passos

Após configurar o bucket:
1. Teste o upload de ofícios
2. Distribua para um operador
3. Operador preenche os dados
4. Verifique o fluxo completo
