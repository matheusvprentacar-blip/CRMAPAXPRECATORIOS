# KPI Cards Rotativos — Kanban

## Understanding Summary
- 4 cards KPI no header do Kanban, cada um com grupo temático fixo
- Cada card rotaciona métricas do seu grupo automaticamente (independente dos outros)
- Dados calculados de `filteredPrecatorios` já em memória — sem queries extras
- Objetivo: exibir mais informações operacionais no mesmo espaço

## Grupos

| Card | Tema | Métricas |
|---|---|---|
| 1 | Contagens gerais | Total, ativos no board, sem responsável, atualizados recentemente, com urgência |
| 2 | Status/Alertas | Travados, em triagem, em jurídico, jurídico de fechamento, pausados, reprovados |
| 3 | Produção/Cálculo | Pronto p/ cálculo, em andamento, concluído, sem responsável de cálculo |
| 4 | Valores financeiros | Esteira, triagem, pronto p/ cálculo, valor atualizado, negociação, fechado |

## Design

- Componente `KpiCard` recebe array de `metrics` + `interval` + `accentColor`
- `useState(activeIndex)` + `setInterval` avança índice a cada 4s
- Pause no hover via `clearInterval` / `setInterval`
- Fade `opacity 0.3s` entre métricas
- Indicador de pontinhos `●○○○` abaixo do subtexto
- Métricas calculadas no pai via `useMemo`

## Decision Log

| Decisão | Alternativas | Motivo |
|---|---|---|
| `useInterval` + índice por card | Framer Motion, CSS animation | Zero deps, pausável, reage a dados |
| Fade opacity | Slide, flip | Mais limpo em card pequeno |
| Métricas no pai via useMemo | Calcular dentro do card | Dados já existem no pai |
| Intervalo 4s | 3s, 6s | Tempo suficiente para leitura |
| Pontinhos indicadores | Barra de progresso | Discreto |
| Pausar no hover | Botão pause | UX natural |
| Cards independentes | Sincronizados | Cada grupo tem ritmo próprio |
