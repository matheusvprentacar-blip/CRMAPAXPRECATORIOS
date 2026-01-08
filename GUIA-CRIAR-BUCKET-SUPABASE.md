# 📦 GUIA: Criar Bucket no Supabase Storage

## 🎯 Objetivo

Criar o bucket `precatorios-documentos` no Supabase Storage para armazenar os documentos dos precatórios.

---

## 📋 Passo a Passo

### PASSO 1: Acessar o Supabase Dashboard

1. Abra seu navegador
2. Acesse: https://supabase.com/dashboard
3. Faça login na sua conta
4. Selecione o projeto **"CRM-Precatorios"** (ou o nome que você deu)

---

### PASSO 2: Navegar até Storage

1. No menu lateral esquerdo, procure por **"Storage"** (ícone de pasta 📁)
2. Clique em **"Storage"**
3. Você verá a lista de buckets existentes (pode estar vazia)

---

### PASSO 3: Criar Novo Bucket

1. Clique no botão **"New bucket"** (ou "Create a new bucket")
2. Uma modal/formulário será aberta

---

### PASSO 4: Configurar o Bucket

Preencha os campos conforme abaixo:

#### 📝 Configurações Básicas:

**Name (Nome):**
```
precatorios-documentos
```
⚠️ **IMPORTANTE:** Use exatamente este nome (sem espaços, tudo minúsculo)

**Public bucket (Bucket público):**
```
❌ NÃO marque esta opção
```
O bucket deve ser **PRIVADO** para segurança

---

#### 🔒 Configurações de Segurança:

**File size limit (Limite de tamanho):**
```
10485760
```
(Isso equivale a 10MB em bytes)

**Allowed MIME types (Tipos de arquivo permitidos):**
```
application/pdf
image/jpeg
image/jpg
image/png
application/msword
application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

⚠️ **DICA:** Cole cada tipo em uma linha separada, ou separe por vírgula se o campo permitir.

---

### PASSO 5: Criar o Bucket

1. Revise todas as configurações
2. Clique no botão **"Create bucket"** (ou "Save")
3. Aguarde a confirmação (geralmente aparece uma mensagem de sucesso)

---

### PASSO 6: Verificar se o Bucket foi Criado

1. Você deve ver o bucket **"precatorios-documentos"** na lista
2. Clique no nome do bucket para abri-lo
3. Você verá uma tela vazia (sem arquivos ainda)

---

## 🔐 PASSO 7: Configurar Policies (Permissões)

Agora você precisa configurar as policies de acesso ao bucket.

### Configurar Policies (Permissões)

**IMPORTANTE:** Por enquanto, vamos deixar o bucket SEM policies customizadas. O Supabase já cria policies padrão que funcionam para usuários autenticados.

**Opção 1: Usar Policies Padrão (Recomendado)**
1. Não faça nada - o bucket já está funcional
2. Apenas usuários autenticados poderão acessar
3. Isso é suficiente para começar

**Opção 2: Criar Policies Customizadas (Avançado)**

Se você quiser criar policies mais específicas depois:

1. Acesse: Storage > precatorios-documentos > Policies
2. Clique em "New Policy"
3. Escolha um template ou crie do zero
4. Configure as permissões desejadas

⚠️ **NOTA:** As policies customizadas podem ser complexas. Recomendamos começar sem elas e adicionar depois se necessário.

---

## ✅ PASSO 8: Verificar Configuração

### Verificar Bucket:

1. Vá em **Storage** > **precatorios-documentos**
2. Você deve ver:
   - Nome: `precatorios-documentos`
   - Status: Private (🔒)
   - Size limit: 10 MB
   - Policies: 4 policies criadas

### Verificar Policies:

1. Clique na aba **"Policies"**
2. Você deve ver 4 policies:
   - ✅ Ver documentos dos precatórios acessíveis (SELECT)
   - ✅ Upload de documentos para precatórios acessíveis (INSERT)
   - ✅ Atualizar próprios documentos ou admin (UPDATE)
   - ✅ Remover próprios documentos ou admin (DELETE)

---

## 🧪 PASSO 9: Testar o Bucket

### Teste Manual (Opcional):

1. Clique no bucket **"precatorios-documentos"**
2. Tente fazer upload de um arquivo de teste
3. Se der erro de permissão, está correto! (bucket privado)
4. As permissões funcionarão via código quando o usuário estiver autenticado

---

## 📊 Estrutura de Pastas (Automática)

Quando você fizer upload via código, a estrutura será criada automaticamente:

```
precatorios-documentos/
├── {precatorio-id-1}/
│   ├── oficio_requisitorio/
│   │   └── 20250115_143022_oficio.pdf
│   ├── credor_rg/
│   │   ├── 20250115_143530_rg_frente.jpg
│   │   └── 20250115_143545_rg_verso.jpg
│   └── credor_cpf/
│       └── 20250115_143600_cpf.pdf
├── {precatorio-id-2}/
│   └── ...
└── ...
```

---

## ❌ Problemas Comuns

### Erro: "Bucket name already exists"
**Solução:** O bucket já foi criado. Verifique na lista de buckets.

### Erro: "Invalid MIME type"
**Solução:** Verifique se copiou corretamente os tipos MIME permitidos.

### Erro: "Policy syntax error"
**Solução:** Verifique se copiou a policy SQL completa, sem cortar nenhuma parte.

### Não consigo criar policies
**Solução:** Use a Opção B (SQL Editor) para criar as policies via script.

---

## 📝 Checklist Final

Antes de continuar, verifique:

- [ ] Bucket `precatorios-documentos` criado
- [ ] Bucket configurado como **PRIVADO**
- [ ] Limite de tamanho: **10MB**
- [ ] MIME types configurados (6 tipos)
- [ ] 4 policies criadas (SELECT, INSERT, UPDATE, DELETE)
- [ ] Policies testadas (ou prontas para teste via código)

---

## 🎉 Pronto!

Seu bucket está configurado e pronto para uso!

**Próximos passos:**
1. Executar scripts SQL 48 e 49 no SQL Editor
2. Testar upload de documentos via código
3. Integrar componentes UI nas páginas

---

## 📞 Precisa de Ajuda?

Se tiver algum problema:
1. Tire um screenshot da tela
2. Copie a mensagem de erro (se houver)
3. Me avise para eu ajudar!

---

**Data:** Janeiro 2025  
**Versão:** 1.0  
**Status:** ✅ Guia Completo
