---
title: Dashboard
tags:
  - modulo
  - dashboard
  - kpis
aliases:
  - Dashboard
---

# Dashboard

## Visão Geral

Rota: `/dashboard`  
Role: Todos (escopo varia por role)  
Arquivo: `app/(dashboard)/dashboard/page.tsx`

Painel executivo com KPIs, gráficos e métricas operacionais. Carrega dados em paralelo via `Promise.all()` de 7 fontes distintas.

## Abas

| Aba | Conteúdo |
|-----|---------|
| **Overview** | KPIs principais, kanban, financeiro, SLA |
| **Detalhes** | Complexidade, gargalos, performance |
| **Operação** | Distribuição de operadores, precatórios críticos |

## Filtro de Período

| Opção | Período |
|-------|---------|
| Últimos 30 dias | `30d` |
| Últimos 90 dias | `90d` |
| Últimos 6 meses | `180d` |
| Últimos 12 meses | `365d` |
| Todo o período | `all` |

## Fontes de Dados (7 queries paralelas)

```typescript
const [kpis, complexity, bottlenecks, performance, operators, critical, propostaCompilada] =
  await Promise.all([
    fetchKpis(supabase, range),           // RPC: dashboard_kpis
    fetchComplexityData(supabase),        // SELECT nivel_complexidade
    fetchBottlenecksData(supabase),       // SELECT tipo_atraso, sla_status
    fetchPerformanceData(supabase),       // 3 queries de SLA/tempo
    fetchOperatorsData(supabase, ...),    // JOIN precatorios + usuarios
    fetchCriticalData(supabase),          // RPC: get_critical_precatorios
    fetchPropostaCompiladaData(supabase), // SELECT proposta_maior_valor
  ])
```

## Cache de KPIs

> [!tip] Cache implementado
> KPIs são cacheados em memória por **10 minutos** por chave `dashboard_kpis_{period}_{userId}`.
> O botão "Atualizar" (↺) força o bypass do cache.

Arquivo de cache: `lib/cache/client-cache.ts`

## Escopo por Role

| Role | Vê |
|------|-----|
| `admin`, `gestor`, `financeiro`, `gestor_*` | Todos os precatórios |
| Demais | Apenas onde aparece como responsável |

O filtro de scope é aplicado como `.or("dono_usuario_id.eq.X,criado_por.eq.X,...")` nas queries.

## Componentes do Dashboard

```
components/dashboard/
├── metric-card.tsx           ← Card de métrica individual
├── financial-overview.tsx    ← Gráfico financeiro
├── complexity-overview.tsx   ← Gráfico de complexidade
├── delay-bottlenecks.tsx     ← Gargalos de atraso
├── performance-metrics.tsx   ← Métricas de SLA/performance
├── operator-distribution.tsx ← Distribuição por operador
└── critical-precatorios.tsx  ← Tabela de críticos
```

## KPIs Principais (aba Overview)

- Total de precatórios
- Total de credores
- Valor principal total
- Valor atualizado total
- Saldo líquido total
- Total de propostas

### Kanban
- Quantidade por status do kanban
- Valor por status do kanban

### Financeiro
- PSS total deduzido
- IRPF total (isentos + não isentos)
- Honorários total
- Adiantamentos total

### Cálculo
- Em cálculo / Pronto para calcular / Concluídos
- Tempo médio de cálculo

## Paleta de Gráficos

```
#0e4d6a  ← petróleo (primário)
#1a6080  ← petróleo claro
#2578a0  ← petróleo mais claro
#15803d  ← verde semântico
#1d4ed8  ← azul semântico
#92400e  ← âmbar semântico
```

## Veja também
- [[Visão Geral]]
- [[Papéis e Permissões]]
- [[Tabelas Principais]]
