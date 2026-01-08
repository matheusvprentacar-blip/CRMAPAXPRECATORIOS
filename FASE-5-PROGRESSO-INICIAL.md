# 🤖 FASE 5: IA de Extração - Progresso Inicial

## ✅ O QUE JÁ FOI FEITO

### 1. **Estrutura do Banco de Dados** ✅
**Arquivo:** `scripts/68-tabelas-extracao-ia.sql`

**Tabelas criadas:**
- ✅ `precatorio_extracoes` - Armazena cada processamento de IA
- ✅ `precatorio_extracao_campos` - Armazena cada campo extraído
- ✅ Expansão de `precatorio_documentos` - Adiciona flags de processamento IA

**Funções SQL criadas:**
- ✅ `get_documentos_nao_processados()` - Lista documentos para processar
- ✅ `marcar_documentos_processados()` - Marca documentos como processados
- ✅ `get_ultima_extracao()` - Busca última extração de um precatório
- ✅ `get_campos_extracao()` - Lista campos de uma extração

**Features implementadas:**
- ✅ Cálculo automático de nível de confiança (alta/média/baixa)
- ✅ Detecção de conflitos entre documentos
- ✅ Auditoria completa (quem criou, quem aplicou, quando)
- ✅ RLS policies para segurança
- ✅ Índices para performance

### 2. **Types TypeScript** ✅
**Arquivo:** `lib/types/extracao.ts`

**Interfaces criadas:**
- ✅ `PrecatorioExtracao` - Tipo do banco
- ✅ `PrecatorioExtracaoCampo` - Tipo do banco
- ✅ `ExtractionResult` - Resultado da IA
- ✅ `FieldExtraction` - Campo extraído
- ✅ `ChecklistDocumentos` - Checklist de documentos
- ✅ `ConflitoCampo` - Conflito detectado
- ✅ Request/Response types para API

**Helpers criados:**
- ✅ `CAMPO_LABELS` - Labels amigáveis para campos
- ✅ `CAMPO_TIPOS` - Tipos de cada campo
- ✅ `getConfiancaColor()` - Cor por confiança
- ✅ `getConfiancaBadgeVariant()` - Variante de badge
- ✅ `getConfiancaIcon()` - Ícone por confiança
- ✅ `formatCampoValor()` - Formatação de valores

---

## 📋 PRÓXIMOS PASSOS

### **Etapa 1: API Routes** 🔄
Criar rotas para processar e aplicar extrações:

1. **`app/api/extract/process/route.ts`**
   - POST: Processar documentos de um precatório
   - Integração com provedor de IA
   - Salvar resultados no banco

2. **`app/api/extract/apply/route.ts`**
   - POST: Aplicar campos selecionados no precatório
   - Validação de dados
   - Atualização do card

3. **`app/api/extract/[id]/route.ts`**
   - GET: Buscar extração por ID
   - Retornar campos agrupados por confiança

### **Etapa 2: Utils de IA** 🔄
Criar funções auxiliares:

1. **`lib/utils/ia-provider.ts`**
   - Integração com OpenAI/Claude/Gemini
   - Prompt engineering
   - Parsing de resposta

2. **`lib/utils/normalizacao.ts`**
   - Normalizar CPF/CNPJ
   - Normalizar datas
   - Normalizar valores monetários
   - Normalizar nomes

3. **`lib/utils/ocr.ts`**
   - Extração de texto de PDFs
   - OCR para imagens
   - Pré-processamento

### **Etapa 3: Componentes React** 🔄
Criar interface visual:

1. **`components/extracao/botao-processar.tsx`**
   - Botão "Processar Documentos"
   - Loading state
   - Feedback visual

2. **`components/extracao/painel-revisao.tsx`**
   - Painel principal de revisão
   - Abas: Alta/Média/Baixa confiança
   - Lista de campos

3. **`components/extracao/campo-extraido.tsx`**
   - Card de campo individual
   - Checkbox para aplicar
   - Badge de confiança
   - Fonte do dado

4. **`components/extracao/conflito-resolver.tsx`**
   - Modal para resolver conflitos
   - Opções lado a lado
   - Seleção de valor correto

5. **`components/extracao/historico-extracoes.tsx`**
   - Lista de extrações anteriores
   - Status e estatísticas
   - Reprocessar

### **Etapa 4: Integração** 🔄
Conectar tudo:

1. Adicionar seção na tab "Documentos"
2. Conectar botão com API
3. Mostrar painel de revisão
4. Aplicar campos selecionados
5. Atualizar card do precatório

---

## 🎯 DECISÕES PENDENTES

### **1. Escolher Provedor de IA**

| Provedor | Custo/Doc | Qualidade | Velocidade | Recomendação |
|----------|-----------|-----------|------------|--------------|
| **OpenAI GPT-4 Vision** | $0.01-0.03 | ⭐⭐⭐⭐⭐ | Média | ✅ Melhor qualidade |
| **Anthropic Claude 3** | $0.008-0.024 | ⭐⭐⭐⭐⭐ | Rápida | ✅ Bom custo-benefício |
| **Google Gemini Pro** | $0.0025-0.0075 | ⭐⭐⭐⭐ | Rápida | ✅ Mais barato |
| **OCR + GPT-3.5** | $0.001-0.005 | ⭐⭐⭐ | Lenta | Economia |

**Recomendação:** Começar com **Claude 3** (bom equilíbrio) ou **Gemini Pro** (mais barato).

### **2. Estratégia de Processamento**

**Opção A: Processamento Síncrono**
- ✅ Simples de implementar
- ✅ Feedback imediato
- ❌ Usuário espera (pode demorar)

**Opção B: Processamento Assíncrono (Background Job)**
- ✅ Não trava interface
- ✅ Pode processar em lote
- ❌ Mais complexo
- ❌ Precisa de polling/websocket

**Recomendação:** Começar com **Síncrono** (mais simples), migrar para Assíncrono depois se necessário.

### **3. OCR para PDFs**

**Opção A: PDF.js (JavaScript)**
- ✅ Roda no servidor Next.js
- ✅ Gratuito
- ❌ Só extrai texto (não OCR de imagens)

**Opção B: Tesseract.js (OCR)**
- ✅ OCR completo
- ✅ Gratuito
- ❌ Mais lento
- ❌ Qualidade variável

**Opção C: Usar IA diretamente (GPT-4 Vision/Claude)**
- ✅ Melhor qualidade
- ✅ Entende contexto
- ❌ Mais caro

**Recomendação:** **PDF.js** para PDFs com texto + **IA Vision** para imagens/PDFs escaneados.

---

## 📊 ESTIMATIVA DE TEMPO

| Etapa | Tempo Estimado | Complexidade |
|-------|----------------|--------------|
| API Routes | 4-6 horas | Média |
| Utils de IA | 6-8 horas | Alta |
| Componentes React | 8-10 horas | Média |
| Integração | 2-4 horas | Baixa |
| Testes e Ajustes | 4-6 horas | Média |
| **TOTAL** | **24-34 horas** | **3-4 dias** |

---

## 🚀 PLANO DE AÇÃO IMEDIATO

### **Fase 5.1: Backend (Hoje)**
1. ✅ Executar script 68 no Supabase
2. 🔄 Criar API route de processamento
3. 🔄 Integrar com provedor de IA
4. 🔄 Testar com documento real

### **Fase 5.2: Frontend (Amanhã)**
1. 🔄 Criar componente botão processar
2. 🔄 Criar painel de revisão
3. 🔄 Criar cards de campos
4. 🔄 Integrar na tab Documentos

### **Fase 5.3: Refinamento (Depois)**
1. 🔄 Resolver conflitos
2. 🔄 Histórico de extrações
3. 🔄 Melhorar prompts da IA
4. 🔄 Otimizar performance

---

## 💡 PRÓXIMA AÇÃO

**Você precisa decidir:**

1. **Qual provedor de IA usar?**
   - OpenAI GPT-4 Vision
   - Anthropic Claude 3
   - Google Gemini Pro
   - Outro?

2. **Você tem API key do provedor escolhido?**
   - Se não, precisa criar conta e obter key

3. **Quer começar com qual funcionalidade?**
   - Processamento completo (mais demorado)
   - Apenas estrutura visual (mais rápido)
   - Mock/simulação primeiro (para testar UX)

**Me diga suas preferências e continuamos! 🚀**

---

## 📚 RECURSOS ÚTEIS

### **Documentação dos Provedores:**
- OpenAI: https://platform.openai.com/docs/guides/vision
- Anthropic: https://docs.anthropic.com/claude/docs
- Google: https://ai.google.dev/gemini-api/docs

### **Exemplos de Prompts:**
```
Você é um assistente especializado em extrair dados de documentos jurídicos brasileiros, especificamente precatórios.

Analise o documento fornecido e extraia as seguintes informações:
- Número do precatório
- Nome do credor
- CPF/CNPJ do credor
- Valor principal
- Data de expedição
[...]

Para cada campo extraído, forneça:
1. O valor encontrado
2. Sua confiança (0-100%)
3. A página onde encontrou
4. Um trecho do texto original

Retorne no formato JSON especificado.
```

---

**Status:** 🟡 EM PROGRESSO  
**Próximo:** Decidir provedor de IA e criar API routes  
**Bloqueio:** Nenhum
