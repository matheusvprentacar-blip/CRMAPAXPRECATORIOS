# FASE 3 - DASHBOARD ESTRATÉGICO

## 🎯 OBJETIVO

Transformar o Dashboard em um **Painel Estratégico** com indicadores operacionais reais que respondem:

1. ❓ Onde está o gargalo?
2. ❓ Quais precatórios estão travados e por quê?
3. ❓ Qual a carga por operador?
4. ❓ O que é simples vs complexo?
5. ❓ Qual o tempo médio e quais estouraram SLA?

---

## 📋 REGRAS OBRIGATÓRIAS

- ✅ NÃO criar novas páginas
- ✅ NÃO quebrar navegação atual
- ✅ NÃO alterar autenticação/permissões
- ✅ NÃO alterar lógica financeira dos cálculos
- ✅ Reutilizar dados existentes (status, score, SLA, atraso, responsável)

---

## 📦 BLOCOS A IMPLEMENTAR

### 1. VISÃO POR COMPLEXIDADE

**Objetivo:** Mostrar distribuição de precatórios por nível de complexidade

**Dados a Exibir:**
- Total Baixa Complexidade (score 0-30)
- Total Média Complexidade (score 31-60)
- Total Alta Complexidade (score 61-100)

**Formato:**
- Cards com números grandes
- Gráfico de pizza ou barras
- Percentual de cada categoria

**Query SQL:**
```sql
SELECT 
  nivel_complexidade,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentual
FROM precatorios
WHERE deleted_at IS NULL
GROUP BY nivel_complexidade;
```

---

### 2. GARGALOS POR MOTIVO DE ATRASO

**Objetivo:** Identificar os principais motivos que travam precatórios

**Dados a Exibir:**
- Motivo (tipo_atraso)
- Quantidade de precatórios
- Quantos com SLA estourado

**Formato:**
- Tabela ordenada (maior → menor)
- Badge de tipo de atraso
- Indicador de SLA crítico

**Query SQL:**
```sql
SELECT 
  tipo_atraso,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE sla_status = 'atrasado') as com_sla_estourado
FROM precatorios
WHERE tipo_atraso IS NOT NULL
  AND deleted_at IS NULL
GROUP BY tipo_atraso
ORDER BY total DESC;
```

---

### 3. PERFORMANCE OPERACIONAL (TEMPO)

**Objetivo:** Métricas de tempo e eficiência

**Dados a Exibir:**
- Tempo médio em fila (status = 'em_calculo')
- Tempo médio para finalizar (status = 'concluido')
- Quantidade com SLA estourado

**Formato:**
- Cards grandes com números
- Indicadores visuais (verde/amarelo/vermelho)
- Comparação com meta

**Query SQL:**
```sql
-- Tempo médio em fila
SELECT 
  AVG(EXTRACT(EPOCH FROM (NOW() - data_entrada_calculo)) / 3600) as horas_media
FROM precatorios
WHERE status = 'em_calculo'
  AND data_entrada_calculo IS NOT NULL
  AND deleted_at IS NULL;

-- Tempo médio para finalizar
SELECT 
  AVG(EXTRACT(EPOCH FROM (data_calculo - data_entrada_calculo)) / 3600) as horas_media
FROM precatorios
WHERE status = 'concluido'
  AND data_entrada_calculo IS NOT NULL
  AND data_calculo IS NOT NULL
  AND deleted_at IS NULL;

-- SLA estourado
SELECT COUNT(*) 
FROM precatorios
WHERE sla_status = 'atrasado'
  AND deleted_at IS NULL;
```

---

### 4. DISTRIBUIÇÃO POR OPERADOR

**Objetivo:** Carga de trabalho e performance por operador

**Dados a Exibir:**
- Operador: Nome
- Total em cálculo
- Total finalizados
- Total com atraso registrado
- Total com SLA estourado

**Formato:**
- Tabela com métricas por operador
- Se não for admin: mostrar apenas próprio desempenho
- Se for admin: mostrar todos

**Query SQL:**
```sql
-- Para admin (todos os operadores)
SELECT 
  u.nome as operador,
  COUNT(*) FILTER (WHERE p.status = 'em_calculo') as em_calculo,
  COUNT(*) FILTER (WHERE p.status = 'concluido') as finalizados,
  COUNT(*) FILTER (WHERE p.tipo_atraso IS NOT NULL) as com_atraso,
  COUNT(*) FILTER (WHERE p.sla_status = 'atrasado') as sla_estourado
FROM precatorios p
JOIN usuarios u ON p.responsavel_calculo_id = u.id
WHERE p.deleted_at IS NULL
GROUP BY u.id, u.nome
ORDER BY em_calculo DESC;

-- Para operador (apenas próprio)
SELECT 
  u.nome as operador,
  COUNT(*) FILTER (WHERE p.status = 'em_calculo') as em_calculo,
  COUNT(*) FILTER (WHERE p.status = 'concluido') as finalizados,
  COUNT(*) FILTER (WHERE p.tipo_atraso IS NOT NULL) as com_atraso,
  COUNT(*) FILTER (WHERE p.sla_status = 'atrasado') as sla_estourado
FROM precatorios p
JOIN usuarios u ON p.responsavel_calculo_id = u.id
WHERE p.responsavel_calculo_id = '<user_id>'
  AND p.deleted_at IS NULL
GROUP BY u.id, u.nome;
```

---

### 5. PRECATÓRIOS CRÍTICOS (LISTA INTELIGENTE)

**Objetivo:** Identificar precatórios que precisam atenção imediata

**Critérios de Criticidade:**
- Alta complexidade (score >= 61) OU
- SLA estourado (sla_status = 'atrasado') OU
- Atraso com impacto "alto"

**Dados a Exibir:**
- Título/Número
- Status
- Responsável
- Complexidade (badge)
- Tempo em fila / SLA
- Motivo atraso (se houver)

**Formato:**
- Lista ordenada por criticidade
- Badges visuais
- Link para detalhes

**Query SQL:**
```sql
SELECT 
  p.id,
  p.titulo,
  p.numero_precatorio,
  p.status,
  u.nome as responsavel,
  p.nivel_complexidade,
  p.score_complexidade,
  p.sla_status,
  p.sla_horas,
  p.tipo_atraso,
  p.impacto_atraso,
  p.motivo_atraso_calculo,
  EXTRACT(EPOCH FROM (NOW() - p.data_entrada_calculo)) / 3600 as horas_em_fila,
  -- Score de criticidade (quanto maior, mais crítico)
  (
    CASE WHEN p.nivel_complexidade = 'alta' THEN 30 ELSE 0 END +
    CASE WHEN p.sla_status = 'atrasado' THEN 40 ELSE 0 END +
    CASE WHEN p.impacto_atraso = 'alto' THEN 30 ELSE 0 END
  ) as score_criticidade
FROM precatorios p
LEFT JOIN usuarios u ON p.responsavel_calculo_id = u.id
WHERE p.deleted_at IS NULL
  AND (
    p.nivel_complexidade = 'alta' OR
    p.sla_status = 'atrasado' OR
    p.impacto_atraso = 'alto'
  )
ORDER BY score_criticidade DESC, p.created_at ASC
LIMIT 10;
```

---

## 🗂️ ESTRUTURA DE ARQUIVOS

### Scripts SQL (1 arquivo)
- `scripts/46-views-dashboard-estrategico.sql` - Views para métricas

### Componentes React (6 arquivos)
- `components/dashboard/complexity-overview.tsx` - Bloco 1
- `components/dashboard/delay-bottlenecks.tsx` - Bloco 2
- `components/dashboard/performance-metrics.tsx` - Bloco 3
- `components/dashboard/operator-distribution.tsx` - Bloco 4
- `components/dashboard/critical-precatorios.tsx` - Bloco 5
- `components/dashboard/metric-card.tsx` - Card reutilizável

### Páginas (1 arquivo atualizado)
- `app/(dashboard)/dashboard/page.tsx` - Dashboard principal

### Types (1 arquivo atualizado)
- `lib/types/dashboard.ts` - Interfaces das métricas

---

## 📊 LAYOUT DO DASHBOARD

```
┌─────────────────────────────────────────────────────────────┐
│ Dashboard Estratégico                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ [BLOCO 1: VISÃO POR COMPLEXIDADE]                           │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │  Baixa   │ │  Média   │ │   Alta   │ │  Gráfico │       │
│ │    45    │ │    32    │ │    18    │ │  Pizza   │       │
│ │   47%    │ │   34%    │ │   19%    │ │          │       │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│ [BLOCO 2: GARGALOS POR MOTIVO DE ATRASO]                    │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Motivo                    │ Total │ SLA Estourado     │  │
│ ├────────────────────────────────────────────────────────┤  │
│ │ 📄 Doc. Incompleta        │  12   │  5                │  │
│ │ 👤 Titular Falecido       │   8   │  3                │  │
│ │ ❓ Dúvida Jurídica        │   6   │  2                │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ [BLOCO 3: PERFORMANCE OPERACIONAL]                          │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│ │ Tempo Médio  │ │ Tempo Médio  │ │ SLA Estourado│        │
│ │   em Fila    │ │  Finalizar   │ │              │        │
│ │   18.5h      │ │    32.2h     │ │      8       │        │
│ └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                              │
│ [BLOCO 4: DISTRIBUIÇÃO POR OPERADOR]                        │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Operador      │ Em Cálculo │ Finalizados │ Atrasos   │  │
│ ├────────────────────────────────────────────────────────┤  │
│ │ Pedro Silva   │     8      │     45      │    3      │  │
│ │ Maria Santos  │     6      │     38      │    2      │  │
│ │ João Oliveira │     4      │     29      │    1      │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ [BLOCO 5: PRECATÓRIOS CRÍTICOS]                             │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 🔴 Precatório 12345/2024                               │  │
│ │    Alta Complexidade | SLA Estourado | 48h em fila    │  │
│ │    Responsável: Pedro Silva                            │  │
│ │    Motivo: Documentação Incompleta (Impacto: Alto)    │  │
│ ├────────────────────────────────────────────────────────┤  │
│ │ 🟠 Precatório 12346/2024                               │  │
│ │    Média Complexidade | SLA Atenção | 20h em fila     │  │
│ │    Responsável: Maria Santos                           │  │
│ │    Motivo: Dúvida Jurídica (Impacto: Médio)           │  │
│ └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 COMPONENTES VISUAIS

### MetricCard (Reutilizável)
```typescript
interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
}
```

### ComplexityOverview
- 3 cards (Baixa, Média, Alta)
- Gráfico de pizza (opcional)
- Percentuais calculados

### DelayBottlenecks
- Tabela ordenada
- Badges de tipo de atraso
- Indicador de SLA crítico

### PerformanceMetrics
- 3 cards grandes
- Cores baseadas em thresholds
- Ícones representativos

### OperatorDistribution
- Tabela com métricas
- Filtro por role (admin vê todos, operador vê só ele)
- Ordenação por carga

### CriticalPrecatorios
- Lista de cards
- Score de criticidade visual
- Link para detalhes
- Badges de complexidade, SLA, impacto

---

## 🔄 FLUXO DE DADOS

### 1. Carregamento Inicial
```typescript
useEffect(() => {
  loadDashboardMetrics()
}, [])

async function loadDashboardMetrics() {
  const [
    complexity,
    bottlenecks,
    performance,
    operators,
    critical
  ] = await Promise.all([
    fetchComplexityData(),
    fetchBottlenecksData(),
    fetchPerformanceData(),
    fetchOperatorsData(),
    fetchCriticalData()
  ])
  
  setMetrics({ complexity, bottlenecks, performance, operators, critical })
}
```

### 2. Atualização Automática
- Refresh a cada 5 minutos
- Botão manual de refresh
- Loading states

### 3. Filtros (Opcional)
- Por período (últimos 7 dias, 30 dias, etc.)
- Por tribunal
- Por status

---

## 📝 INTERFACES TYPESCRIPT

```typescript
// lib/types/dashboard.ts

export interface ComplexityMetrics {
  baixa: number
  media: number
  alta: number
  total: number
  percentuais: {
    baixa: number
    media: number
    alta: number
  }
}

export interface BottleneckItem {
  tipo_atraso: string
  total: number
  com_sla_estourado: number
  percentual: number
}

export interface PerformanceMetrics {
  tempo_medio_fila: number // horas
  tempo_medio_finalizar: number // horas
  sla_estourado: number
  total_em_calculo: number
  total_finalizados: number
}

export interface OperatorMetrics {
  operador_id: string
  operador_nome: string
  em_calculo: number
  finalizados: number
  com_atraso: number
  sla_estourado: number
}

export interface CriticalPrecatorio {
  id: string
  titulo: string
  numero_precatorio: string
  status: string
  responsavel_nome: string
  nivel_complexidade: 'baixa' | 'media' | 'alta'
  score_complexidade: number
  sla_status: string
  sla_horas: number
  tipo_atraso?: string
  impacto_atraso?: 'baixo' | 'medio' | 'alto'
  motivo_atraso_calculo?: string
  horas_em_fila: number
  score_criticidade: number
}

export interface DashboardMetrics {
  complexity: ComplexityMetrics
  bottlenecks: BottleneckItem[]
  performance: PerformanceMetrics
  operators: OperatorMetrics[]
  critical: CriticalPrecatorio[]
}
```

---

## 🚀 IMPLEMENTAÇÃO

### Ordem de Execução

1. **Script SQL** - Criar views para métricas
2. **Types** - Definir interfaces
3. **Componente MetricCard** - Card reutilizável
4. **Componente ComplexityOverview** - Bloco 1
5. **Componente DelayBottlenecks** - Bloco 2
6. **Componente PerformanceMetrics** - Bloco 3
7. **Componente OperatorDistribution** - Bloco 4
8. **Componente CriticalPrecatorios** - Bloco 5
9. **Atualizar Dashboard** - Integrar todos os blocos

---

## ✅ CRITÉRIOS DE SUCESSO

- [ ] Dashboard carrega em < 2 segundos
- [ ] Todas as métricas são calculadas corretamente
- [ ] Filtro por role funciona (admin vs operador)
- [ ] Precatórios críticos são identificados corretamente
- [ ] Interface responsiva (desktop e tablet)
- [ ] Dados atualizam automaticamente
- [ ] Navegação não quebra
- [ ] Autenticação não é alterada

---

## 📚 REFERÊNCIAS

- FASE 1: Score de Complexidade e SLA
- FASE 2: Atraso Estruturado e Timeline
- Dados existentes: precatorios, usuarios, atividades

---

**Status:** 📝 Planejamento Completo
**Próximo passo:** Implementar scripts SQL e componentes
**Aguardando:** Aprovação para iniciar implementação
