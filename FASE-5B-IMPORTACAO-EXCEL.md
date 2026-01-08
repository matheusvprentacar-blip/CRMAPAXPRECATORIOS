# FASE 5B - IMPORTAÇÃO EM MASSA VIA EXCEL COM IA

## 🎯 OBJETIVO

Permitir que **todos os operadores** (não só admin) possam criar múltiplos precatórios de uma vez através do upload de planilhas Excel, com IA detectando automaticamente a estrutura dos dados.

---

## 📋 REQUISITOS

### **Funcionalidades:**
1. ✅ Upload de arquivo Excel (.xlsx, .xls)
2. ✅ IA detecta estrutura automaticamente (linhas ou colunas)
3. ✅ Preview dos dados antes de criar
4. ✅ Validação de dados (CPF, valores, datas)
5. ✅ Criação em lote com feedback
6. ✅ Tratamento de erros individuais
7. ✅ Disponível para todos os operadores

### **Casos de Uso:**

#### **Caso 1: Dados em Linhas (Mais Comum)**
```
| Nome Credor    | CPF           | Valor      | Data Base  |
|----------------|---------------|------------|------------|
| João Silva     | 123.456.789-00| 50.000,00  | 01/01/2020 |
| Maria Santos   | 987.654.321-00| 75.000,00  | 15/03/2021 |
```

#### **Caso 2: Dados em Colunas**
```
| Campo          | Precatório 1  | Precatório 2  |
|----------------|---------------|---------------|
| Nome Credor    | João Silva    | Maria Santos  |
| CPF            | 123.456.789-00| 987.654.321-00|
| Valor          | 50.000,00     | 75.000,00     |
```

#### **Caso 3: Formato Livre**
IA detecta automaticamente onde estão os dados

---

## 🏗️ ARQUITETURA

```
Frontend (Upload)
    ↓
API /api/import/excel/analyze
    ↓
Gemini AI (Detecta estrutura)
    ↓
Preview (Usuário revisa)
    ↓
API /api/import/excel/create
    ↓
Criação em lote no Supabase
    ↓
Feedback de sucesso/erro
```

---

## 📁 ARQUIVOS A CRIAR

### **Backend:**
1. `app/api/import/excel/analyze/route.ts` - Analisar Excel
2. `app/api/import/excel/create/route.ts` - Criar precatórios
3. `lib/utils/excel-parser.ts` - Parser de Excel
4. `lib/utils/excel-validator.ts` - Validação de dados

### **Frontend:**
5. `components/import/upload-excel.tsx` - Upload de arquivo
6. `components/import/preview-table.tsx` - Preview dos dados
7. `components/import/import-modal.tsx` - Modal completo
8. `app/(dashboard)/import/page.tsx` - Página de importação

### **Database:**
9. `scripts/70-tabela-importacoes.sql` - Histórico de importações

---

## 🔄 FLUXO COMPLETO

### **1. Upload**
- Usuário seleciona arquivo Excel
- Frontend envia para API

### **2. Análise (IA)**
- Gemini analisa estrutura
- Detecta se dados estão em linhas ou colunas
- Identifica campos automaticamente
- Retorna dados estruturados

### **3. Preview**
- Mostra tabela com dados detectados
- Permite editar campos
- Mostra validações (CPF válido, etc.)
- Usuário confirma ou cancela

### **4. Criação**
- Cria precatórios um por um
- Mostra progresso em tempo real
- Continua mesmo se um falhar
- Retorna resumo (X criados, Y com erro)

### **5. Resultado**
- Lista precatórios criados
- Lista erros (se houver)
- Opção de baixar relatório

---

## 📊 CAMPOS DETECTADOS

### **Obrigatórios:**
- Nome do credor
- CPF/CNPJ do credor
- Valor principal

### **Opcionais:**
- Número do precatório
- Número do processo
- Tribunal
- Devedor
- Data base
- Advogado
- Dados bancários
- Endereço
- Etc.

---

## ✅ VALIDAÇÕES

### **CPF/CNPJ:**
- Formato válido
- Dígitos verificadores corretos

### **Valores:**
- Números válidos
- Maior que zero

### **Datas:**
- Formato válido
- Não futuras

### **Campos Obrigatórios:**
- Nome não vazio
- CPF/CNPJ presente
- Valor presente

---

## 🎨 INTERFACE

### **Página de Importação:**
```
┌─────────────────────────────────────┐
│  📊 Importar Precatórios via Excel  │
├─────────────────────────────────────┤
│                                     │
│  [📁 Selecionar Arquivo Excel]     │
│                                     │
│  Formatos aceitos: .xlsx, .xls     │
│  Tamanho máximo: 10MB               │
│                                     │
│  💡 Dica: A IA detecta              │
│  automaticamente a estrutura!       │
│                                     │
└─────────────────────────────────────┘
```

### **Preview:**
```
┌─────────────────────────────────────┐
│  ✅ 15 precatórios detectados       │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Nome    │ CPF    │ Valor    │   │
│  ├─────────────────────────────┤   │
│  │ João    │ 123... │ 50.000   │ ✅│
│  │ Maria   │ 987... │ 75.000   │ ✅│
│  │ Pedro   │ inválido│ 30.000  │ ⚠️│
│  └─────────────────────────────┘   │
│                                     │
│  [❌ Cancelar]  [✅ Criar Todos]   │
└─────────────────────────────────────┘
```

### **Progresso:**
```
┌─────────────────────────────────────┐
│  ⏳ Criando precatórios...          │
├─────────────────────────────────────┤
│                                     │
│  ████████████░░░░░░░░  60% (9/15)  │
│                                     │
│  ✅ João Silva - Criado             │
│  ✅ Maria Santos - Criado           │
│  ❌ Pedro Costa - Erro: CPF inválido│
│  ⏳ Ana Oliveira - Processando...   │
│                                     │
└─────────────────────────────────────┘
```

---

## 💡 INTELIGÊNCIA DA IA

### **Detecção Automática:**
1. **Orientação dos dados** (linhas vs colunas)
2. **Cabeçalhos** (primeira linha/coluna)
3. **Tipos de dados** (texto, número, data)
4. **Mapeamento de campos** (qual coluna é o CPF, etc.)

### **Prompt para Gemini:**
```
Analise esta planilha Excel e:
1. Detecte se os dados estão em linhas ou colunas
2. Identifique os cabeçalhos
3. Mapeie cada campo para o schema de precatório
4. Retorne JSON estruturado com todos os precatórios
```

---

## 🚀 IMPLEMENTAÇÃO

### **Prioridade Alta:**
1. Parser de Excel (xlsx)
2. API de análise com Gemini
3. Componente de upload
4. Preview básico

### **Prioridade Média:**
5. Validações completas
6. Criação em lote
7. Feedback de progresso

### **Prioridade Baixa:**
8. Histórico de importações
9. Download de relatório
10. Templates de exemplo

---

## 📦 DEPENDÊNCIAS

```bash
npm install xlsx  # Parser de Excel
```

---

## 🎯 PRÓXIMOS PASSOS

1. Criar parser de Excel
2. Criar API de análise
3. Criar componente de upload
4. Testar com planilhas reais
5. Ajustar prompt da IA
6. Implementar preview
7. Implementar criação em lote

---

**Status:** 📝 Planejamento Completo - Pronto para Implementar
