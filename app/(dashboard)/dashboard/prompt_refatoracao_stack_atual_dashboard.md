# Prompt completo para refatorar o dashboard no stack atual

Quero que você refatore o dashboard atual do projeto **sem alterar a lógica de negócio existente** e usando como referência visual o arquivo `dashboard-modern-reference.tsx`.

## Stack atual confirmado pelo código existente

O dashboard atual já está no seguinte stack, e a refatoração deve respeitar isso:

- **Next.js App Router** com `"use client"`
- **React + TypeScript**
- **Tailwind CSS**
- **HeroUI compat** via `@/lib/heroui/compat`
- **HeroUI Select/ListBox** via `@heroui/react`
- **Recharts** para gráficos
- **react-countup** para animação de métricas
- **Supabase browser client** via `createBrowserClient`
- **Auth context** via `useAuth`
- **Ícones próprios** via `@/components/icons`
- Utilitários existentes como `formatCurrency`, `formatPercent`
- Tipos já existentes como `DashboardKpis`, `ComplexityMetrics`, `BottleneckItem`, `CriticalPrecatorio`, `OperatorMetrics`, `PerformanceMetrics`

## Objetivo da refatoração

O dashboard atual está funcional, mas visualmente ainda está:

- monótono
- com hierarquia visual fraca
- com cards com peso muito parecido
- com excesso de blocos semelhantes
- com pouca sensação premium
- com leitura executiva abaixo do ideal
- com pouco contraste entre “informação normal”, “atenção”, “crítico”, “resultado” e “ação necessária”

Quero uma refatoração **moderna, premium, elegante e altamente legível**, mantendo a base do projeto atual.

## Regra principal de segurança

**Não pode quebrar o dashboard atual.**

A implementação deve seguir este plano:

1. **Preservar integralmente a lógica de fetch** já existente em `page.tsx`
   - manter `safeFetch`
   - manter `fetchKpis`
   - manter `fetchPropostaCompiladaData`
   - manter `fetchComplexityData`
   - manter `fetchBottlenecksData`
   - manter `fetchPerformanceData`
   - manter `fetchOperatorsData`
   - manter `fetchCriticalData`
   - manter `loadDashboardMetrics`
   - manter controle de `loading`, `refreshing`, `lastUpdated`, `period`, `tab`, `profile`, `roles`, `isAdmin`

2. **Separar apresentação de dados**
   - extrair a nova UI para componentes visuais dedicados
   - a camada visual não pode recalcular lógica sensível diferente da atual
   - usar os mesmos dados já carregados pelo dashboard atual

3. **Refatorar por blocos, não tudo de uma vez**
   - primeiro criar o novo topo executivo
   - depois trocar os KPIs principais
   - depois trocar os blocos operacionais
   - depois trocar os gráficos/listas
   - por último revisar estados de loading e responsividade

4. **Garantir paridade dos números**
   - antes e depois da refatoração, os totais precisam continuar exatamente iguais
   - não alterar consultas SQL / Supabase sem necessidade real
   - não mudar nomes de campos nem contratos de tipos se não for indispensável

## Direção visual obrigatória

Use como base visual o arquivo `dashboard-modern-reference.tsx`.

### Características visuais esperadas

- estética **premium SaaS / executive dashboard**
- mais profundidade visual
- cards com sensação de camada e foco
- bordas suaves com `rounded-2xl` ou mais
- sombras sofisticadas, não pesadas
- leves gradientes estratégicos, sem poluição
- fundo com textura sutil / grid leve / radial glow discreto
- tipografia mais hierárquica
- forte contraste entre títulos, subtítulos e números
- melhor espaçamento vertical
- densidade equilibrada
- indicadores críticos com semântica visual clara

### O que melhorar no layout

#### 1. Hero / topo executivo
Substituir o topo atual por um bloco com:

- título forte
- subtítulo contextual
- chips de status rápido
- botão de atualizar com destaque
- período visível
- data/hora da última atualização
- quatro KPIs principais com visual premium

KPIs principais:
- carteira ativa
- saldo líquido
- SLA saudável
- chat pendente

#### 2. Saúde operacional
Criar uma seção moderna para:

- documentos recebidos
- certidões recebidas
- tempo médio de cálculo
- SLA saudável
- progresso por barras
- meta mensal operacional

Essa área deve ter leitura rápida e aparência executiva.

#### 3. Bloco de ações imediatas
Criar um painel lateral claro para:

- SLA atrasado
- certidões vencidas
- mensagens não lidas
- novos precatórios no período
- atividades do período
- propostas criadas
- total de credores

Esses cards devem ter prioridade visual forte.

#### 4. Abas modernas
Manter o conceito de tabs, mas com aparência melhor.
Abas sugeridas:

- Visão executiva
- Operação
- Financeiro

#### 5. Gráficos e distribuição
Trocar listas cansativas por visuais mais modernos:

- gráfico horizontal de valor por status
- gráfico horizontal de quantidade por status
- donut de consolidação financeira
- rankings com barras para propostas, usuários e atividades

#### 6. Tabela de críticos
Refatorar a tabela de precatórios críticos para:

- mais contraste
- linhas mais limpas
- score mais visível
- chips de SLA melhores
- hierarquia mais forte

## Regras de implementação

### Estrutura
Extrair em componentes visuais, por exemplo:

- `dashboard-modern-shell.tsx`
- `dashboard-hero.tsx`
- `dashboard-metric-tile.tsx`
- `dashboard-radar-operacional.tsx`
- `dashboard-action-queue.tsx`
- `dashboard-executive-financial.tsx`
- `dashboard-kanban-bars.tsx`
- `dashboard-critical-table.tsx`

### O que deve permanecer

- os dados devem continuar vindo do mesmo `page.tsx`
- o controle de permissões por perfil deve continuar funcionando
- o comportamento admin vs usuário deve continuar
- a lógica de período deve continuar
- o refresh manual deve continuar
- o loading inicial deve continuar
- a integração com Supabase deve continuar

### O que não pode acontecer

- não criar dashboard “fake” desconectado dos dados reais
- não remover estados existentes sem mapear impacto
- não trocar contratos de props sem necessidade
- não fazer redesign puramente estético que piore a leitura
- não exagerar em gradiente, blur ou transparência
- não usar visual genérico sem semântica de negócio

## Responsividade

A responsividade precisa ser melhor que a atual.

### Desktop
- aproveitar largura com grids mais nobres
- evitar sensação de coluna infinita
- distribuir melhor cards e seções

### Tablet
- quebrar grids sem colapsar hierarquia
- manter blocos executivos no topo

### Mobile
- cards em coluna única
- métricas legíveis
- tabelas com fallback utilizável
- nenhum corte lateral

## Acessibilidade e UX

- manter contraste adequado
- estados de loading elegantes
- hover sutil, sem exagero
- foco visível
- labels claros
- tooltips úteis onde fizer sentido
- evitar poluição visual

## Estilo técnico esperado

- código limpo
- componentes pequenos
- nomes coerentes
- classes Tailwind organizadas
- sem duplicação desnecessária
- sem “megacomponente” impossível de manter

## Estratégia de entrega

Quero a implementação em etapas:

### Etapa 1
Criar a nova camada visual baseada em `dashboard-modern-reference.tsx`, usando dados mockados ou props tipadas.

### Etapa 2
Integrar essa camada ao `page.tsx` atual sem mexer na lógica de fetch.

### Etapa 3
Substituir gradualmente as seções antigas pelas novas.

### Etapa 4
Garantir que todos os números finais batem com o dashboard atual.

### Etapa 5
Polir responsividade, loading, dark mode e estados vazios.

## Critérios de aprovação

Só considerar pronto quando:

- o dashboard estiver visualmente muito mais moderno
- o layout tiver hierarquia clara
- os KPIs principais tiverem muito mais destaque
- a leitura operacional estiver mais rápida
- os números baterem com os dados antigos
- a UI estiver pronta para produção
- a base continuar compatível com o stack atual

## Base obrigatória

Use o arquivo `dashboard-modern-reference.tsx` como referência de:

- composição visual
- hierarquia dos blocos
- distribuição das áreas
- ritmo de espaçamento
- semântica visual
- estilo premium

Mas adapte para os dados reais do projeto, preservando o comportamento já existente.
