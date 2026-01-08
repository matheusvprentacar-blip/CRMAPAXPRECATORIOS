# FASE 5: IA de Extração de Dados de Documentos

## 🎯 OBJETIVO

Criar um sistema de IA que:
1. Recebe uploads de documentos (PDF/imagem)
2. Extrai informações relevantes automaticamente
3. Preenche campos do precatório
4. Mostra painel de revisão antes de salvar
5. Mantém trilha de auditoria completa

---

## 📋 ESPECIFICAÇÃO COMPLETA

### 1. UX/UI - Onde Fica no Card

#### Bloco 1: "Documentos do Precatório"
**Localização:** Tab "Documentos" (já existe)

**Funcionalidades:**
- ✅ Upload com tipo de documento (dropdown)
- ✅ Marcação obrigatório/opcional
- ✅ Lista de arquivos com metadados
- ✅ Download/visualizar
- ✅ Indicador de quem pertence (Credor/Cônjuge/Advogado/Processual)

#### Bloco 2: "IA - Extração Automática" (NOVO)
**Localização:** Nova seção na tab "Documentos"

**Componentes:**
```
┌─────────────────────────────────────────┐
│ 🤖 Extração Automática de Dados         │
├─────────────────────────────────────────┤
│ [Processar Documentos] (botão)          │
│                                          │
│ Status: ⏳ Processando... (3/5)         │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ Campos Extraídos (18)               │ │
│ │                                     │ │
│ │ ✓ Número Precatório: 123456        │ │
│ │   Confiança: 98% | Fonte: oficio.pdf│ │
│ │   [✓] Aplicar                       │ │
│ │                                     │ │
│ │ ⚠ CPF Credor: 123.456.789-00       │ │
│ │   Confiança: 65% | Fonte: rg.pdf   │ │
│ │   [✓] Aplicar                       │ │
│ │                                     │ │
│ │ ❌ Conflito: Valor Principal        │ │
│ │   Opção 1: R$ 100.000 (oficio.pdf) │ │
│ │   Opção 2: R$ 105.000 (calculo.pdf)│ │
│ │   [Selecionar]                      │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ [Salvar Extração] [Descartar]          │
└─────────────────────────────────────────┘
```

---

## 🗄️ ESTRUTURA DE DADOS

### Tabela 1: `precatorio_documentos` (já existe - expandir)
```sql
CREATE TABLE precatorio_documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  precatorio_id UUID REFERENCES precatorios(id) ON DELETE CASCADE,
  
  -- Tipo e classificação
  tipo_documento tipo_documento_enum NOT NULL,
  pertence_a TEXT CHECK (pertence_a IN ('credor', 'conjuge', 'advogado', 'processual', 'outros')),
  obrigatorio BOOLEAN DEFAULT false,
  
  -- Storage
  storage_path TEXT NOT NULL,
  storage_url TEXT,
  mime_type TEXT,
  tamanho_bytes INTEGER,
  
  -- Metadados
  observacoes TEXT,
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Status de processamento IA
  processado_ia BOOLEAN DEFAULT false,
  processado_ia_at TIMESTAMPTZ,
  erro_processamento TEXT
);

CREATE INDEX idx_precatorio_documentos_precatorio ON precatorio_documentos(precatorio_id);
CREATE INDEX idx_precatorio_documentos_tipo ON precatorio_documentos(tipo_documento);
CREATE INDEX idx_precatorio_documentos_processado ON precatorio_documentos(processado_ia);
```

### Tabela 2: `precatorio_extracoes` (NOVA)
```sql
CREATE TABLE precatorio_extracoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  precatorio_id UUID REFERENCES precatorios(id) ON DELETE CASCADE,
  
  -- Status
  status TEXT CHECK (status IN ('processando', 'concluido', 'erro', 'aplicado')) DEFAULT 'processando',
  
  -- Resultado
  result_json JSONB, -- Todos os campos extraídos
  total_campos INTEGER DEFAULT 0,
  campos_alta_confianca INTEGER DEFAULT 0,
  campos_baixa_confianca INTEGER DEFAULT 0,
  conflitos INTEGER DEFAULT 0,
  
  -- Documentos processados
  documentos_ids UUID[] DEFAULT '{}',
  
  -- Auditoria
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES usuarios(id),
  
  -- Erro
  erro_mensagem TEXT
);

CREATE INDEX idx_precatorio_extracoes_precatorio ON precatorio_extracoes(precatorio_id);
CREATE INDEX idx_precatorio_extracoes_status ON precatorio_extracoes(status);
```

### Tabela 3: `precatorio_extracao_campos` (NOVA - granular)
```sql
CREATE TABLE precatorio_extracao_campos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extracao_id UUID REFERENCES precatorio_extracoes(id) ON DELETE CASCADE,
  
  -- Campo
  campo_nome TEXT NOT NULL, -- Ex: 'numero_precatorio', 'credor_cpf_cnpj'
  campo_valor TEXT, -- Valor extraído (sempre string, converter depois)
  campo_tipo TEXT, -- 'string', 'number', 'date', 'boolean'
  
  -- Confiança
  confianca DECIMAL(5,2) CHECK (confianca >= 0 AND confianca <= 100),
  
  -- Fonte
  fonte_documento_id UUID REFERENCES precatorio_documentos(id),
  fonte_documento_nome TEXT,
  fonte_pagina INTEGER,
  fonte_snippet TEXT, -- Trecho do texto onde foi encontrado
  
  -- Status
  aplicado BOOLEAN DEFAULT false,
  conflito BOOLEAN DEFAULT false,
  conflito_com UUID[], -- IDs de outros campos conflitantes
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_extracao_campos_extracao ON precatorio_extracao_campos(extracao_id);
CREATE INDEX idx_extracao_campos_campo ON precatorio_extracao_campos(campo_nome);
CREATE INDEX idx_extracao_campos_confianca ON precatorio_extracao_campos(confianca);
```

---

## 🤖 CONTRATO DA IA (Schema de Saída)

### Formato JSON Padronizado
```typescript
interface ExtractionResult {
  precatorio_id: string
  status: 'success' | 'partial' | 'error'
  timestamp: string
  
  // Campos extraídos
  campos: {
    // Identificação
    numero_precatorio?: FieldExtraction
    numero_processo?: FieldExtraction
    numero_oficio?: FieldExtraction
    tribunal?: FieldExtraction
    devedor?: FieldExtraction
    esfera_devedor?: FieldExtraction
    
    // Partes
    credor_nome?: FieldExtraction
    credor_cpf_cnpj?: FieldExtraction
    credor_profissao?: FieldExtraction
    credor_estado_civil?: FieldExtraction
    credor_regime_casamento?: FieldExtraction
    
    conjuge_nome?: FieldExtraction
    conjuge_cpf_cnpj?: FieldExtraction
    
    advogado_nome?: FieldExtraction
    advogado_cpf_cnpj?: FieldExtraction
    advogado_oab?: FieldExtraction
    
    cessionario?: FieldExtraction
    titular_falecido?: FieldExtraction
    
    // Valores
    valor_principal?: FieldExtraction
    valor_juros?: FieldExtraction
    valor_selic?: FieldExtraction
    valor_atualizado?: FieldExtraction
    saldo_liquido?: FieldExtraction
    
    // Datas
    data_base?: FieldExtraction
    data_expedicao?: FieldExtraction
    data_calculo?: FieldExtraction
    
    // Dados bancários
    banco?: FieldExtraction
    agencia?: FieldExtraction
    conta?: FieldExtraction
    tipo_conta?: FieldExtraction
    titular_conta?: FieldExtraction
    
    // Endereço
    endereco_completo?: FieldExtraction
    cep?: FieldExtraction
    cidade?: FieldExtraction
    estado?: FieldExtraction
  }
  
  // Checklist de documentos
  checklist: {
    rg_credor: boolean
    cpf_credor: boolean
    comprovante_residencia: boolean
    certidao_casamento: boolean
    certidao_nascimento: boolean
    certidao_negativa_municipal: boolean
    certidao_negativa_estadual: boolean
    certidao_negativa_federal: boolean
    dados_bancarios: boolean
  }
  
  // Conflitos detectados
  conflitos: Array<{
    campo: string
    opcoes: Array<{
      valor: string
      fonte: string
      confianca: number
    }>
  }>
  
  // Metadados
  documentos_processados: Array<{
    id: string
    nome: string
    tipo: string
    paginas: number
  }>
  
  total_campos_extraidos: number
  campos_alta_confianca: number
  campos_baixa_confianca: number
}

interface FieldExtraction {
  valor: string | number | boolean | null
  confianca: number // 0-100
  fonte: {
    documento_id: string
    documento_nome: string
    pagina?: number
    snippet?: string // Trecho do texto
  }
  tipo: 'string' | 'number' | 'date' | 'boolean'
  normalizado: boolean // Se foi normalizado (ex: CPF com pontos removidos)
}
```

---

## 🔄 FLUXO TÉCNICO

### 1. Upload de Documentos
```
Usuario → Upload → Supabase Storage → precatorio_documentos
                                    ↓
                              Marca: processado_ia = false
```

### 2. Processamento IA
```
Usuario clica "Processar Documentos"
    ↓
POST /api/extract/precatorio
    ↓
1. Busca documentos não processados
2. Para cada documento:
   - Download do Storage
   - Extração de texto (OCR se imagem)
   - Análise com IA (GPT-4 Vision / Claude)
   - Normalização de dados
3. Detecta conflitos
4. Salva em precatorio_extracoes
5. Salva campos em precatorio_extracao_campos
    ↓
Retorna: extraction_id
```

### 3. Revisão pelo Usuário
```
Interface mostra:
- Campos extraídos com confiança
- Conflitos para resolver
- Campos faltantes
    ↓
Usuario revisa e marca campos para aplicar
```

### 4. Aplicação no Card
```
Usuario clica "Salvar Extração"
    ↓
POST /api/extract/apply
    ↓
1. Valida campos selecionados
2. UPDATE precatorios SET ...
3. Marca: applied_at, applied_by
4. Cria atividade de auditoria
    ↓
Card atualizado!
```

---

## 📝 REGRAS DE NEGÓCIO

### 1. Nunca Sobrescrever Automaticamente
- Tudo vai para revisão
- Usuario decide o que aplicar
- Campos já preenchidos são destacados

### 2. Confiança por Campo
- **Alta (>80%)**: Verde ✓
- **Média (50-80%)**: Amarelo ⚠
- **Baixa (<50%)**: Vermelho ❌

### 3. Conflitos
- Se mesmo campo em 2+ documentos com valores diferentes
- Mostrar todas as opções
- Usuario escolhe qual usar

### 4. Auditoria Completa
- Quem extraiu
- Quando extraiu
- Quem aplicou
- Quando aplicou
- Quais campos foram aplicados
- De quais documentos vieram

### 5. Normalização
- CPF/CNPJ: apenas dígitos
- Datas: YYYY-MM-DD
- Valores: number (sem R$, pontos, vírgulas)
- Nomes: Title Case

---

## 🛠️ IMPLEMENTAÇÃO

### Fase 5.1: Backend (Scripts SQL)
1. `scripts/52-tabela-extracoes.sql` - Criar tabelas
2. `scripts/53-funcoes-extracao.sql` - Funções auxiliares
3. `scripts/54-rls-extracoes.sql` - Policies de segurança

### Fase 5.2: API Routes
1. `app/api/extract/precatorio/route.ts` - Processar documentos
2. `app/api/extract/apply/route.ts` - Aplicar extração
3. `app/api/extract/[id]/route.ts` - Buscar extração

### Fase 5.3: Types
1. `lib/types/extracao.ts` - Tipos TypeScript
2. `lib/utils/extracao-ia.ts` - Utils de IA
3. `lib/utils/normalizacao.ts` - Normalização de dados

### Fase 5.4: Componentes
1. `components/extracao/botao-processar.tsx` - Botão processar
2. `components/extracao/painel-revisao.tsx` - Painel de revisão
3. `components/extracao/campo-extraido.tsx` - Card de campo
4. `components/extracao/conflito-resolver.tsx` - Resolver conflito
5. `components/extracao/historico-extracoes.tsx` - Histórico

### Fase 5.5: Integração
1. Adicionar seção na tab "Documentos"
2. Conectar com API
3. Testar fluxo completo

---

## 🎯 RESULTADO FINAL

### O que o usuário vai ter:
1. **Upload inteligente** - Marca tipo de documento
2. **Processamento automático** - IA extrai tudo
3. **Revisão visual** - Vê o que foi extraído
4. **Aplicação seletiva** - Escolhe o que usar
5. **Auditoria completa** - Sabe de onde veio cada dado
6. **Checklist automático** - Vê o que falta
7. **Zero digitação** - Excel vira passado!

### Métricas esperadas:
- ⏱️ **Tempo de cadastro**: 30 min → 5 min
- 📊 **Precisão**: >90% dos campos
- ✅ **Campos preenchidos**: 18-25 por precatório
- 🎯 **Satisfação**: Operadores felizes!

---

## 📚 PRÓXIMOS PASSOS

1. **Confirmar aprovação** do plano
2. **Escolher provedor de IA**:
   - OpenAI GPT-4 Vision
   - Anthropic Claude 3
   - Google Gemini Pro Vision
3. **Implementar backend** (scripts SQL)
4. **Criar API routes**
5. **Desenvolver componentes**
6. **Integrar na interface**
7. **Testar com documentos reais**
8. **Ajustar prompts da IA**
9. **Deploy e treinamento**

---

## 💰 CONSIDERAÇÕES

### Custos de IA:
- GPT-4 Vision: ~$0.01-0.03 por documento
- Claude 3: ~$0.008-0.024 por documento
- Gemini Pro: ~$0.0025-0.0075 por documento

### Alternativas:
- Usar OCR local (Tesseract) + GPT-3.5 (mais barato)
- Processar em lote (reduz custos)
- Cache de resultados (evita reprocessamento)

---

**Pronto para começar a FASE 5?** 🚀
