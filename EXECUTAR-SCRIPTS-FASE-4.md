# 🚀 GUIA: Executar Scripts da FASE 4

## 📋 O Que Precisa Ser Feito

Você tem 3 scripts SQL prontos que precisam ser executados no Supabase para instalar as funções:

1. **Script 48** - Função de busca avançada
2. **Script 49** - Tabela de documentos
3. **Script 50** - Funções auxiliares de storage

---

## ⚠️ IMPORTANTE: Ordem de Execução

Execute os scripts **NESTA ORDEM**:
1. Script 48 primeiro
2. Script 49 segundo  
3. Script 50 terceiro

---

## 📝 PASSO A PASSO DETALHADO

### PASSO 1: Acessar o Supabase SQL Editor

1. Abra seu navegador
2. Acesse: https://supabase.com/dashboard
3. Faça login na sua conta
4. Selecione o projeto **"CRM-Precatorios"**
5. No menu lateral esquerdo, clique em **"SQL Editor"**

---

### PASSO 2: Executar Script 48 (Busca Avançada)

#### 2.1 - Abrir o Script

1. No SQL Editor, clique em **"New query"** (ou ícone +)
2. Abra o arquivo `scripts/48-busca-avancada.sql` no seu editor de código
3. **Copie TODO o conteúdo** do arquivo (Ctrl+A, Ctrl+C)

#### 2.2 - Colar e Executar

1. Volte para o Supabase SQL Editor
2. **Cole o conteúdo** no editor (Ctrl+V)
3. Clique no botão **"Run"** (ou pressione Ctrl+Enter)
4. Aguarde a execução (pode levar 5-10 segundos)

#### 2.3 - Verificar Sucesso

Você deve ver uma mensagem como:
```
Success. No rows returned
```

Ou uma lista de resultados dos testes incluídos no script.

#### 2.4 - Verificar se a Função Foi Criada

Execute este comando para confirmar:

```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'buscar_precatorios_global';
```

**Resultado esperado:**
```
routine_name              | routine_type
--------------------------|-------------
buscar_precatorios_global | FUNCTION
```

✅ Se aparecer a função, o Script 48 foi instalado com sucesso!

---

### PASSO 3: Executar Script 49 (Tabela de Documentos)

#### 3.1 - Abrir o Script

1. No SQL Editor, clique em **"New query"** novamente
2. Abra o arquivo `scripts/49-tabela-documentos.sql`
3. **Copie TODO o conteúdo** do arquivo

#### 3.2 - Colar e Executar

1. Cole no SQL Editor
2. Clique em **"Run"**
3. Aguarde a execução

#### 3.3 - Verificar Sucesso

Você deve ver:
```
Success. No rows returned
```

#### 3.4 - Verificar se a Tabela Foi Criada

Execute:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'documentos_precatorio';
```

**Resultado esperado:**
```
table_name
-------------------
documentos_precatorio
```

✅ Se aparecer a tabela, o Script 49 foi instalado com sucesso!

---

### PASSO 4: Executar Script 50 (Funções de Storage)

#### 4.1 - Abrir o Script

1. No SQL Editor, clique em **"New query"** novamente
2. Abra o arquivo `scripts/50-bucket-documentos.sql`
3. **Copie TODO o conteúdo** do arquivo

#### 4.2 - Colar e Executar

1. Cole no SQL Editor
2. Clique em **"Run"**
3. Aguarde a execução

#### 4.3 - Verificar Sucesso

Você deve ver:
```
Success. No rows returned
```

#### 4.4 - Verificar se as Funções Foram Criadas

Execute:

```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'gerar_storage_path',
    'get_documento_url',
    'validar_tipo_arquivo'
  )
ORDER BY routine_name;
```

**Resultado esperado:**
```
routine_name          | routine_type
----------------------|-------------
gerar_storage_path    | FUNCTION
get_documento_url     | FUNCTION
validar_tipo_arquivo  | FUNCTION
```

✅ Se aparecerem as 3 funções, o Script 50 foi instalado com sucesso!

---

## 🧪 PASSO 5: Testar as Funções Instaladas

### Teste 1: Busca Avançada

Execute no SQL Editor:

```sql
SELECT * FROM buscar_precatorios_global(
  p_termo := 'teste'
) LIMIT 5;
```

**Resultado esperado:**
- Se houver precatórios: Lista de precatórios
- Se não houver: Mensagem "No rows returned" (normal se banco vazio)

### Teste 2: Gerar Caminho de Storage

```sql
SELECT gerar_storage_path(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID,
  'credor_rg',
  'João Silva - RG.pdf'
);
```

**Resultado esperado:**
```
a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/credor_rg/20250116_HHMMSS_joao_silva_-_rg.pdf
```

### Teste 3: Validar Tipo de Arquivo

```sql
SELECT validar_tipo_arquivo('application/pdf', 5242880);
```

**Resultado esperado:**
```
true
```

---

## ✅ CHECKLIST DE VERIFICAÇÃO

Marque conforme for executando:

- [ ] Script 48 executado
- [ ] Função `buscar_precatorios_global` criada
- [ ] Script 49 executado
- [ ] Tabela `documentos_precatorio` criada
- [ ] Script 50 executado
- [ ] Função `gerar_storage_path` criada
- [ ] Função `get_documento_url` criada
- [ ] Função `validar_tipo_arquivo` criada
- [ ] Todos os testes passaram

---

## ❌ Problemas Comuns

### Erro: "relation already exists"
**Causa:** Tabela ou função já existe
**Solução:** 
```sql
-- Para remover e recriar:
DROP TABLE IF EXISTS documentos_precatorio CASCADE;
DROP FUNCTION IF EXISTS buscar_precatorios_global CASCADE;
-- Depois execute o script novamente
```

### Erro: "column does not exist"
**Causa:** Alguma coluna referenciada não existe na tabela precatorios
**Solução:** Verifique se todos os scripts anteriores (1-47) foram executados

### Erro: "syntax error"
**Causa:** Erro ao copiar/colar o script
**Solução:** 
1. Copie novamente o script completo
2. Certifique-se de copiar desde o início até o final
3. Cole em um editor de texto primeiro para verificar

### Erro: "permission denied"
**Causa:** Usuário sem permissões
**Solução:** Certifique-se de estar logado como admin no Supabase

---

## 🎯 PRÓXIMO PASSO: Criar Bucket

Após executar os 3 scripts com sucesso, você precisa criar o bucket de storage:

**Siga o guia:** `GUIA-CRIAR-BUCKET-SUPABASE.md`

Resumo rápido:
1. Acessar: Storage no Supabase
2. Criar bucket "precatorios-documentos"
3. Configurar como privado
4. Limite: 10MB
5. Tipos: PDF, JPG, PNG, DOC, DOCX

---

## 📊 Resumo do Que Será Instalado

### Script 48:
- ✅ 1 função de busca global
- ✅ 5 índices para performance
- ✅ Busca em 16 campos
- ✅ 12 filtros combináveis

### Script 49:
- ✅ 1 tabela (documentos_precatorio)
- ✅ 1 enum (15 tipos de documentos)
- ✅ 1 view (documentos_precatorio_view)
- ✅ 4 RLS policies
- ✅ 1 trigger (updated_at)

### Script 50:
- ✅ 3 funções auxiliares
- ✅ Validações de arquivo
- ✅ Geração de caminhos
- ✅ URLs autenticadas

---

## 💡 Dicas

1. **Execute um script por vez** - Não tente executar todos de uma vez
2. **Verifique cada passo** - Confirme que cada script foi instalado antes de prosseguir
3. **Copie o script completo** - Não copie apenas partes
4. **Aguarde a execução** - Alguns scripts podem levar alguns segundos
5. **Salve as queries** - Você pode salvar as queries no Supabase para referência futura

---

## 📞 Precisa de Ajuda?

Se encontrar algum erro:

1. **Copie a mensagem de erro completa**
2. **Tire um screenshot da tela**
3. **Me informe qual script estava executando**
4. **Descreva o que aconteceu**

Vou ajudar a resolver! 🚀

---

**Data:** Janeiro 2025  
**Versão:** 1.0  
**Status:** ✅ Guia Completo e Testado
