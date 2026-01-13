# ESPECIFICAÇÃO COMPLETA: KANBAN + GATES + CÁLCULO + JURÍDICO SOB DEMANDA

## 📋 Resumo Executivo

Sistema de Kanban com controle de fluxo (gates) que impede cálculo prematuro e adiciona análise jurídica sob demanda.

## 🎯 Objetivo

Evitar cálculo prematuro garantindo que:
- ✅ Credor demonstrou interesse
- ✅ Documentos mínimos estão OK
- ✅ Certidões estão OK ou não aplicáveis
- ✅ Dados mínimos de cálculo definidos
- ✅ Análise Jurídica só quando necessário (sob demanda)

## 📊 Colunas do Kanban (11 colunas)

1. **Entrada / Pré-cadastro** (`entrada`)
2. **Triagem (Interesse do credor)** (`triagem_interesse`)
3. **Documentos do credor** (`docs_credor`)
4. **Certidões** (`certidoes`)
5. **Pronto para Cálculo** (`pronto_calculo`)
6. **Cálculo em andamento** (`calculo_andamento`)
7. **Análise Jurídica** (sob demanda) (`analise_juridica`)
8. **Cálculo após Análise Jurídica** (`recalculo_pos_juridico`)
9. **Cálculo concluído** (`calculo_concluido`)
10. **Proposta / Negociação** (`proposta_negociacao`)
11. **Fechado** (`fechado`)

## 🔒 Regra Central: Cadeado da Área de Cálculos

### Botão "🔒 Área de cálculos" no card

**DESABILITADO** nas colunas:
- `entrada`
- `triagem_interesse`
- `docs_credor`
- `certidoes`

**HABILITADO** nas colunas:
- `pronto_calculo`
- `calculo_andamento`
- `analise_juridica`
- `recalculo_pos_juridico`
- `calculo_concluido`

**Tooltip quando desabilitado**:
```
"Cálculo bloqueado: 
- Interesse do credor não confirmado
- Documentos mínimos pendentes (3/8)
- Certidões pendentes (2/3)"
```

## 🚪 Gates por Coluna (Definition of Done)

### A) triagem_interesse → docs_credor
**Condição**: `interesse_status = "TEM_INTERESSE"`

**Exceção**: Se `interesse_status = "SEM_INTERESSE"` → permitir mover direto para `fechado` com motivo obrigatório

### B) docs_credor → certidoes
**Condições** (todos devem estar `RECEBIDO`):
- ✅ RG/Documento identificação
- ✅ CPF
- ✅ Estado civil (certidão correspondente)
- ✅ Comprovante de residência (≤ 30 dias)
- ✅ Dados bancários

### C) certidoes → pronto_calculo
**Condição**: Todas certidões exigidas = `RECEBIDO` OU `NAO_APLICAVEL` (com justificativa)

### D) pronto_calculo → calculo_andamento
**Condição**: `responsavel_calculo_id` preenchido

### E) calculo_andamento → analise_juridica (sob demanda)
**Condições**:
- Usuário = operador_calculo ou admin
- Preencher: `juridico_motivo` + `juridico_descricao_bloqueio`

### F) analise_juridica → recalculo_pos_juridico
**Condições**:
- `juridico_parecer_status` preenchido
- `juridico_parecer_texto` preenchido

**Exceção**: Se `juridico_parecer_status = "IMPEDIMENTO"` → permitir mover para `fechado`

### G) recalculo_pos_juridico → calculo_concluido
**Condição**: Resultado de cálculo salvo (versão criada)

### H) calculo_concluido → proposta_negociacao
**Condições**:
- `valor_atualizado` preenchido
- `saldo_liquido` preenchido
- `data_base_calculo` preenchida
- `premissas_calculo_resumo` preenchida

### I) proposta_negociacao → fechado
**Condição**: Motivo obrigatório

## 💾 Modelo de Dados

### Novos campos em `precatorios`

```sql
-- Status Kanban
status_kanban VARCHAR(50) -- enum das 11 colunas

-- Interesse
interesse_status VARCHAR(50) -- SEM_CONTATO | CONTATO_EM_ANDAMENTO | PEDIR_RETORNO | SEM_INTERESSE | TEM_INTERESSE
interesse_observacao TEXT

-- Cálculo
responsavel_calculo_id UUID
calculo_desatualizado BOOLEAN DEFAULT false
calculo_ultima_versao INTEGER DEFAULT 0

-- Jurídico (sob demanda)
juridico_motivo VARCHAR(50) -- PENHORA | CESSAO | HONORARIOS | HABILITACAO | DUVIDA_BASE_INDICE | OUTROS
juridico_descricao_bloqueio TEXT
juridico_parecer_status VARCHAR(50) -- APROVADO | AJUSTAR_DADOS | IMPEDIMENTO | RISCO_ALTO
juridico_parecer_texto TEXT

-- Resultado do cálculo (no card)
data_base_calculo DATE
valor_atualizado NUMERIC(15,2)
saldo_liquido NUMERIC(15,2)
premissas_calculo_resumo TEXT
calculo_pdf_url TEXT
```

### Nova tabela: `precatorio_itens`

```sql
CREATE TABLE precatorio_itens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  precatorio_id UUID REFERENCES precatorios(id),
  tipo_grupo VARCHAR(20), -- DOC_CREDOR | CERTIDAO
  nome_item VARCHAR(200),
  status_item VARCHAR(20), -- PENDENTE | SOLICITADO | RECEBIDO | INCOMPLETO | VENCIDO | NAO_APLICAVEL
  validade DATE,
  observacao TEXT,
  arquivo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Nova tabela: `precatorio_calculos` (histórico/versões)

```sql
CREATE TABLE precatorio_calculos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  precatorio_id UUID REFERENCES precatorios(id),
  versao INTEGER,
  data_base DATE,
  valor_atualizado NUMERIC(15,2),
  saldo_liquido NUMERIC(15,2),
  premissas_json JSONB,
  premissas_resumo TEXT,
  arquivo_pdf_url TEXT,
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Nova tabela: `precatorio_auditoria`

```sql
CREATE TABLE precatorio_auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  precatorio_id UUID REFERENCES precatorios(id),
  acao VARCHAR(50), -- MOVE_COLUNA | UPDATE_CAMPO | UPLOAD_DOC | CONCLUIR_CALCULO
  de VARCHAR(100),
  para VARCHAR(100),
  payload_json JSONB,
  user_id UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 📝 Itens Padrão (Criar Automaticamente)

### Documentos do Credor (tipo_grupo = 'DOC_CREDOR')
1. RG
2. CPF
3. Certidão de casamento (ou nascimento se solteiro)
4. Averbação (se divórcio)
5. Comprovante de residência (≤ 30 dias)
6. Profissão do credor
7. Profissão do cônjuge
8. Dados bancários (agência/conta)

### Certidões (tipo_grupo = 'CERTIDAO')
1. Certidão negativa municipal
2. Certidão negativa estadual
3. Certidão negativa federal

## 📤 Exportar Cálculo pro Card

Quando operador clicar "Concluir cálculo":

1. Criar registro em `precatorio_calculos`:
   - versao = `calculo_ultima_versao + 1`
   - Salvar todos os dados do cálculo
   
2. Atualizar `precatorios`:
   - `data_base_calculo`, `valor_atualizado`, `saldo_liquido`, `premissas_calculo_resumo`
   - `calculo_ultima_versao` = nova versão
   - `calculo_desatualizado` = false
   - `status_kanban` = 'calculo_concluido'

3. Criar auditoria

## ⚠️ Regra: Cálculo Desatualizado

**Triggers que setam `calculo_desatualizado = true`**:

1. Qualquer item de Documentos volta para PENDENTE/INCOMPLETO
2. Qualquer Certidão fica VENCIDO/PENDENTE
3. Mudança em campos críticos do precatório

**Consequências**:
- Bloqueia mover para `proposta_negociacao`
- Mostra badge "Cálculo desatualizado"
- Botão "Reabrir para recalcular" → move para `pronto_calculo` ou `recalculo_pos_juridico`

## 👥 Permissões por Perfil

### Admin
- Tudo

### Operador Comercial
- Move: `entrada` → `triagem_interesse` → `docs_credor` → `certidoes` → `pronto_calculo`
- NÃO acessa Área de Cálculos

### Operador Cálculo
- Acessa Área de Cálculos (colunas liberadas)
- Move: `pronto_calculo` → `calculo_andamento` → `analise_juridica` → `recalculo_pos_juridico` → `calculo_concluido`

### Jurídico
- Só atua em `analise_juridica`
- Preenche parecer e devolve para `recalculo_pos_juridico`
- Não acessa Área de Cálculos

## 🎨 UI/UX

### Kanban
**Cards mostram**:
- Nome/Título
- Devedor/Tribunal
- Badge Interesse
- Badge Docs (ex.: "Docs: 6/8")
- Badge Certidões (ex.: "Cert.: 2/3")
- Badge "Cálculo desatualizado" (se true)
- Botão 🔒 Área de cálculos (sempre visível, habilitado/desabilitado conforme regras)

### Modal de Detalhes
**Abas**:
1. Geral
2. Triagem (interesse)
3. Documentos do credor (lista + upload)
4. Certidões (lista + validade + upload)
5. Jurídico (quando aplicável)
6. Histórico (auditoria + versões)

### Área de Cálculos
- Entrada só pelo botão do card (quando permitido)
- Botão "Voltar ao Kanban" obrigatório
- Ao concluir: exporta pro card + volta para Kanban em `calculo_concluido`

## 💬 Mensagens/Tooltips Padrão

```
"Cálculo bloqueado: o card ainda não está em 'Pronto para Cálculo'."
"Cálculo bloqueado: Interesse não confirmado."
"Cálculo bloqueado: Documentos mínimos pendentes."
"Cálculo bloqueado: Certidões pendentes/vencidas."
"Encaminhado ao Jurídico: aguarde parecer para prosseguir com o cálculo."
"Atenção: houve mudança em Documentos/Certidões. Recalcule antes de propor."
```

## 🎯 Casos Especiais

### Sem interesse na Triagem
- Move para `fechado` com motivo "Sem interesse" (obrigatório)

### Impedimento jurídico
- `analise_juridica` → `fechado` com motivo "Impedimento jurídico"

### Risco alto
- Permitir seguir, mas exigir confirmação admin para avançar `recalculo_pos_juridico` → `calculo_concluido`

### Certidão vencida
- Automaticamente marcar item VENCIDO
- Setar `calculo_desatualizado = true` se já tinha cálculo concluído

## ✅ Critérios de Aceite

- [ ] Não consigo abrir Área de Cálculos fora das colunas permitidas
- [ ] Usuário sem permissão (comercial) não abre cálculo mesmo em coluna permitida
- [ ] Não consigo avançar de Triagem sem TEM_INTERESSE
- [ ] Não consigo avançar de Docs sem mínimos recebidos
- [ ] Não consigo avançar de Certidões sem tudo ok/NA
- [ ] Operador de cálculo consegue acionar Jurídico com motivo+descrição
- [ ] Jurídico só devolve com parecer preenchido
- [ ] Concluir cálculo cria versão + exporta campos pro card + move para calculo_concluido
- [ ] Se docs/certidões mudarem depois, calculo_desatualizado = true e bloqueia proposta
- [ ] Tudo gera auditoria

## 📦 Arquivos a Criar/Modificar

### Scripts SQL
1. `scripts/76-kanban-gates-schema.sql` - Novos campos e tabelas
2. `scripts/77-kanban-gates-functions.sql` - Funções de validação de gates
3. `scripts/78-kanban-gates-triggers.sql` - Triggers para calculo_desatualizado
4. `scripts/79-kanban-gates-seed.sql` - Criar itens padrão

### Backend/API
1. `app/api/kanban/move/route.ts` - Validar gates antes de mover
2. `app/api/kanban/items/route.ts` - CRUD de itens (docs/certidões)
3. `app/api/calculo/export/route.ts` - Exportar cálculo pro card
4. `app/api/juridico/parecer/route.ts` - Salvar parecer jurídico

### Frontend
1. `app/(dashboard)/kanban/page.tsx` - Atualizar com 11 colunas + gates
2. `components/kanban/card.tsx` - Badges + botão cadeado
3. `components/kanban/modal-detalhes.tsx` - Modal com abas
4. `components/kanban/gate-validator.tsx` - Validação visual de gates
5. `components/kanban/interesse-form.tsx` - Form de triagem
6. `components/kanban/itens-checklist.tsx` - Lista de docs/certidões
7. `components/kanban/juridico-form.tsx` - Form de análise jurídica
8. `lib/utils/kanban-gates.ts` - Lógica de validação de gates

## 🚀 Fases de Implementação Sugeridas

### Fase 1: Estrutura Base
- Scripts SQL (76-79)
- Novos campos e tabelas
- Itens padrão

### Fase 2: Gates e Validações
- Funções de validação
- API de movimentação
- Triggers

### Fase 3: UI Kanban
- 11 colunas
- Cards com badges
- Botão cadeado

### Fase 4: Modal e Checklists
- Modal de detalhes
- Abas
- Upload de itens

### Fase 5: Jurídico e Cálculo
- Form jurídico
- Exportar cálculo
- Versões

### Fase 6: Auditoria e Testes
- Auditoria completa
- Testes de gates
- Validação final

## 📝 Notas Importantes

Esta é uma especificação COMPLETA e COMPLEXA que requer:
- Múltiplos scripts SQL
- Novas tabelas e campos
- Lógica de negócio complexa
- Validações em múltiplas camadas
- UI/UX significativamente diferente

**Recomendação**: Criar uma nova task separada para esta implementação, pois é um projeto grande que pode levar vários dias de desenvolvimento.
