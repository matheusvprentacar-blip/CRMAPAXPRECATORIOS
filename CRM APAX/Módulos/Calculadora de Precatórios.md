---
title: Calculadora de Precatórios
tags:
  - modulo
  - calculo
  - calculadora
aliases:
  - Calculadora de Precatórios
---

# Calculadora de Precatórios

## Visão Geral

Rota: `/calcular`  
Role: `operador_calculo`  
Arquivo principal: `components/calculador-precatorios.tsx`

Calculadora multi-step que guia o operador por **8 etapas ativas** para calcular o valor atualizado de um precatório judicial, aplicar deduções, gerar propostas de aquisição e persistir a versão final.

## Componente Principal

`components/calculador-precatorios.tsx` (~32KB)

Orquestra todos os steps, mantém o estado global do cálculo e chama `calcularPrecatorio()` da engine.

## Steps e Componentes

```
components/steps/
├── step-dados-basicos.tsx      ← Passo 1
├── step-indices.tsx            ← Passo 2
├── step-atualizacao-monetaria.tsx ← Passo 3
├── step-pss.tsx                ← Passo 4
├── step-irpf.tsx               ← Passo 5
├── step-honorarios.tsx         ← Passo 6
├── step-propostas.tsx          ← Passo 7
└── step-resumo.tsx             ← Passo 8
```

### Passo 1 — Dados Básicos (`StepDadosBasicos`)
- Tribunal, número do processo
- Período: data base → data de cálculo
- Dados do credor: nome, CPF/CNPJ
- Valor principal bruto

### Passo 2 — Índices (`StepIndices`)
- Seleção do modelo de cálculo (A, B ou C)
- Visualização dos índices mensais do período
- Componentes: `IndexBlock` (com índice) + `EmptyBlock` (sem dado)

### Passo 3 — Atualização Monetária (`StepAtualizacaoMonetaria`)
- Breakdown mensal da correção monetária
- Componente local: `CalcRow` (linha de cálculo com fórmula e valor)
- Spinner clay durante cálculo
- Total acumulado em destaque

### Passo 4 — PSS (`StepPSS`)
- Toggle para habilitar/desabilitar PSS
- Cálculo por faixas progressivas
- Componente custom: `Toggle` (sem shadcn Switch)

### Passo 5 — IRPF (`StepIRPF`)
- Toggle PSS + `SegmentedToggle` para tipo (isento/não isento)
- Tabela de faixas fiscais aplicadas
- Componentes: `Toggle` + `SegmentedToggle` (ambos nativos, sem shadcn)

### Passo 6 — Honorários (`StepHonorarios`)
- Percentual de honorários contratuais (input numérico)
- Toggle para incluir/excluir
- Grade de análise compacta

### Passo 7 — Propostas (`StepPropostas`)
- `SegmentedToggle` para menor/maior proposta
- Componente `ProposalKpi` com 4 métricas
- Preview completo do breakdown: bruto → deduções → líquido → proposta

### Passo 8 — Resumo (`StepResumo`)
- `SummaryKpi` em 4 tons: primary, danger, success, neutral
- Linhas de detalhe com componente `Row`
- Badge de desconto com `DiscountBadge`
- Botão exportar JSON (nativo)

## Ações Laterais

### Documentos
- Drawer lateral com `DocumentosViewer`
- Integração com `PdfUploadButton`
- Upload e leitura do ofício fora do stepper principal

### Guia do cálculo
- Drawer lateral com `GuiaCalculoViewer`
- Conteúdo lido da nota [[Fluxo de Cálculo]] por `/api/knowledge/calculo-flow`
- O vault também expõe [[Mapa Visual do Cálculo.canvas|Mapa Visual do Cálculo]], que usa a mesma nota como fonte para a visão em nós
- Alterações no Obsidian atualizam o guia informativo exibido na calculadora

## Componentes UI Compartilhados

`components/ui/calc/`

### `KpiCard`
Card de indicador com 4 tons:

| Tom | Cor | Uso |
|-----|-----|-----|
| `primary` | `#0e4d6a` | Valores principais |
| `danger` | `#dc2626` | Deduções |
| `success` | `#15803d` | Valores positivos |
| `neutral` | `#6b7280` | Informações |

### `SectionPanel`
Painel de seção com barra lateral colorida. Aceita `tone` para cor da barra.

### `StepFooter`
Navegação entre steps:
- Botão Voltar: clay ghost (background `#f0f1f5`)
- Botão Próximo: clay AC (background `#0e4d6a`)
- Loading: spinner CSS animado

## Padrão de Estilo (Clay)

```typescript
import type { CSSProperties } from "react"

const inputStyle: CSSProperties = {
  height: "38px",
  borderRadius: "11px",
  border: "1px solid rgba(0,0,0,0.09)",
  boxShadow: "inset 2px 2px 5px rgba(0,0,0,0.04),inset -2px -2px 4px rgba(255,255,255,0.8)",
  padding: "0 12px",
  fontSize: "14px",
}

const labelStyle: CSSProperties = {
  fontSize: "10px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#9ca3af",
}
```

> [!warning] CSSProperties
> Sempre importar como `import type { CSSProperties } from "react"` — não usar `React.CSSProperties` sem import do React.

## Engine de Cálculo

Veja [[Fluxo de Cálculo]] para detalhes completos da engine `calcularPrecatorio()`.

## Calculadoras Auxiliares

- `calculadora-juros-mora.tsx` — Juros de mora separados
- `calculadora-salarios-minimos.tsx` — Conversão em salários mínimos
- `tabela-juros-mora.tsx` — Tabela de referência de juros

## Veja também
- [[Fluxo de Cálculo]]
- [[Ciclo de Vida do Precatório]]
- [[Dashboard]]
