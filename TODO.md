# 📋 TODO - CRM Precatórios

## ✅ FASE 1 - INTELIGÊNCIA OPERACIONAL (CONCLUÍDA)

### 1. Score de Complexidade ✅
- [x] Criar script SQL `40-score-complexidade.sql`
- [x] Adicionar colunas: score_complexidade, nivel_complexidade
- [x] Criar função de cálculo automático
- [x] Criar trigger para atualização automática
- [x] Criar componente `ComplexityBadge`
- [x] Criar componente `ComplexityDetails`
- [x] Integrar na Fila de Cálculo
- [x] Atualizar types TypeScript
- [x] Documentar critérios de pontuação

### 2. SLA de Cálculo ✅
- [x] Criar script SQL `41-sla-calculo.sql`
- [x] Adicionar colunas: data_entrada_calculo, sla_horas, sla_status
- [x] Criar função de cálculo de SLA
- [x] Criar trigger para iniciar SLA automaticamente
- [x] Criar view de métricas (metricas_sla)
- [x] Criar componente `SLAIndicator`
- [x] Criar componente `SLADetails`
- [x] Integrar na Fila de Cálculo
- [x] Instalar date-fns
- [x] Documentar regras de SLA

### 3. Infraestrutura ✅
- [x] Criar script SQL `42-atualizar-view-precatorios-cards.sql`
- [x] Atualizar interface Precatorio
- [x] Criar interface MetricasSLA
- [x] Atualizar CardPrecatorioCalculo
- [x] Criar documentação completa (FASE-1-INTELIGENCIA-OPERACIONAL.md)
- [x] Criar resumo (RESUMO-FASE-1-IMPLEMENTADA.md)

---

## 🔥 AÇÃO IMEDIATA NECESSÁRIA

### Executar Scripts SQL no Supabase
- [ ] **PASSO 1:** Executar `scripts/40-score-complexidade.sql`
- [ ] **PASSO 2:** Executar `scripts/41-sla-calculo.sql`
- [ ] **PASSO 3:** Executar `scripts/42-atualizar-view-precatorios-cards.sql`
- [ ] **PASSO 4:** Verificar se as colunas foram criadas
- [ ] **PASSO 5:** Testar badges de complexidade na interface
- [ ] **PASSO 6:** Testar indicadores de SLA na interface
- [ ] **PASSO 7:** Validar cálculos automáticos

---

## ✅ FASE 2 - EXPERIÊNCIA DO OPERADOR (CONCLUÍDA)

### 3. Linha do Tempo do Precatório ✅
- [x] Criar componente Timeline (`components/precatorios/timeline.tsx`)
- [x] Criar componente TimelineEvent (`components/precatorios/timeline-event.tsx`)
- [x] Integrar com tabela atividades
- [x] Criar view `timeline_precatorios` com nomes de usuários
- [x] Exibir eventos principais:
  - [x] Criação (trigger automático)
  - [x] Distribuição (trigger de mudança de status)
  - [x] Envio para cálculo (trigger de mudança de status)
  - [x] Início do cálculo (manual via atividade)
  - [x] Motivo de atraso (trigger automático)
  - [x] Retomada (manual via atividade)
  - [x] Finalização (manual via atividade)
  - [x] Mudança de status (trigger automático)
  - [x] Comentários (manual via atividade)
- [x] Criar função `registrar_evento_timeline()`
- [x] Criar triggers automáticos (criação, status, atraso)
- [x] Ícones coloridos por tipo de evento
- [x] Formatação de datas (date-fns)
- [x] Exibição de usuário responsável
- [x] Exibição de detalhes (JSON)

### 4. Motivo de Atraso Estruturado ✅
- [x] Campo obrigatório implementado (script 39)
- [x] Adicionar categorização de motivos (dropdown com 7 tipos)
  - [x] Titular Falecido
  - [x] Penhora Identificada
  - [x] Cessão Parcial de Crédito
  - [x] Documentação Incompleta
  - [x] Dúvida Jurídica
  - [x] Aguardando Informações do Cliente
  - [x] Outro
- [x] Adicionar campo de impacto estimado (3 níveis)
  - [x] Baixo (até 24h)
  - [x] Médio (2-5 dias)
  - [x] Alto (>5 dias)
- [x] Criar badges visuais (`DelayTypeBadge`, `ImpactBadge`)
- [x] Adicionar sugestões contextuais por tipo
- [x] Atualizar modal de atraso (`components/calculo/modal-atraso.tsx`)
- [x] Atualizar card da fila (`components/calculo/card-precatorio-calculo.tsx`)
- [x] Criar script SQL `43-atraso-estruturado.sql`
- [x] Criar script SQL `44-funcao-timeline.sql`
- [x] **NOVO:** Permitir renovar atraso (atualizar informações)
- [x] **NOVO:** Permitir remover atraso (limpar campos)
- [x] **NOVO:** Registrar atividade ao remover atraso
- [x] Documentar implementação (FASE-2-EXPERIENCIA-OPERADOR.md)
- [x] Criar resumo completo (RESUMO-FASE-2-IMPLEMENTADA.md)
- [x] Documentar gerenciamento de atraso (FUNCIONALIDADE-GERENCIAR-ATRASO.md)

### 5. Visibilidade para o Operador ✅
- [x] Identificação de responsáveis no card
  - [x] Criador (ícone azul 👤)
  - [x] Comercial (ícone verde 💼)
  - [x] Cálculo (ícone roxo 🧮)
- [x] Tempo em cálculo (via SLA da FASE 1)
- [x] Atrasos registrados (badges + descrição completa)
- [x] Histórico completo via timeline
- [x] Contexto completo do precatório

**Scripts SQL Criados:**
- [x] `scripts/43-atraso-estruturado.sql` - Campos tipo e impacto
- [x] `scripts/44-funcao-timeline.sql` - Função, triggers e view

**Componentes Criados:**
- [x] `components/precatorios/timeline.tsx`
- [x] `components/precatorios/timeline-event.tsx`
- [x] `components/ui/delay-type-badge.tsx`
- [x] `components/ui/impact-badge.tsx`

**Documentação:**
- [x] `FASE-2-EXPERIENCIA-OPERADOR.md` - Plano técnico
- [x] `RESUMO-FASE-2-IMPLEMENTADA.md` - Guia completo

**Status:** ✅ Código 100% implementado | ⏳ Aguardando execução dos scripts SQL (43, 44)

---

## ✅ FASE 3 - DASHBOARD ESTRATÉGICO (CONCLUÍDA)

### 5. Dashboard Estratégico ✅
- [x] Criar interfaces TypeScript (`lib/types/dashboard.ts`)
- [x] **BLOCO 1: Visão por Complexidade**
  - [x] Criar componente `ComplexityOverview`
  - [x] 4 cards: Baixa, Média, Alta, Total
  - [x] Exibir percentuais
  - [x] Cores diferenciadas por nível
- [x] **BLOCO 2: Gargalos por Motivo de Atraso**
  - [x] Criar componente `DelayBottlenecks`
  - [x] Tabela com tipo, total, SLA estourado, percentual
  - [x] Ordenação por volume (maior primeiro)
  - [x] Badges visuais por tipo
- [x] **BLOCO 3: Performance Operacional**
  - [x] Criar componente `PerformanceMetrics`
  - [x] Tempo médio em fila
  - [x] Tempo médio para finalizar
  - [x] Total de SLA estourado
  - [x] Cores baseadas em thresholds
- [x] **BLOCO 4: Distribuição por Operador**
  - [x] Criar componente `OperatorDistribution`
  - [x] Tabela com operador, em cálculo, finalizados, com atraso, SLA estourado
  - [x] Filtro por role (admin vê todos, operador vê só ele)
  - [x] Badges coloridos por métrica
- [x] **BLOCO 5: Precatórios Críticos**
  - [x] Criar componente `CriticalPrecatorios`
  - [x] Score de criticidade (0-100)
  - [x] Cards expandidos com todas as informações
  - [x] Ordenação por criticidade
  - [x] Link direto para detalhes
  - [x] Badges de complexidade, SLA, atraso, impacto
- [x] Criar componente base `MetricCard`
- [x] Criar função RPC `get_critical_precatorios()`
- [x] Integrar todos os blocos na página `/dashboard`
- [x] Adicionar botão de atualização
- [x] Loading states em todos os componentes
- [x] Empty states amigáveis
- [x] Responsivo (mobile-first)
- [x] Criar script SQL `46-dashboard-critical-precatorios.sql`
- [x] Documentar implementação (FASE-3-DASHBOARD-ESTRATEGICO.md)

**Componentes Criados:**
- [x] `lib/types/dashboard.ts` - Interfaces TypeScript
- [x] `components/dashboard/metric-card.tsx` - Card reutilizável
- [x] `components/dashboard/complexity-overview.tsx` - Bloco 1
- [x] `components/dashboard/delay-bottlenecks.tsx` - Bloco 2
- [x] `components/dashboard/performance-metrics.tsx` - Bloco 3
- [x] `components/dashboard/operator-distribution.tsx` - Bloco 4
- [x] `components/dashboard/critical-precatorios.tsx` - Bloco 5
- [x] `components/ui/table.tsx` - Componente de tabela
- [x] `app/(dashboard)/dashboard/page.tsx` - Dashboard integrado

**Scripts SQL Criados:**
- [x] `scripts/46-dashboard-critical-precatorios.sql` - Função RPC

**Documentação:**
- [x] `FASE-3-DASHBOARD-ESTRATEGICO.md` - Especificação técnica completa

**Status:** ✅ Código 100% implementado | ⏳ Aguardando execução do script SQL (46)

**Perguntas Respondidas pelo Dashboard:**
1. ✅ Onde estão os gargalos? (Bloco 2)
2. ✅ Quais precatórios estão travados e por quê? (Bloco 5)
3. ✅ Qual a carga de trabalho de cada operador? (Bloco 4)
4. ✅ Quantos são simples vs complexos? (Bloco 1)
5. ✅ Qual o tempo médio e quantos SLA estouraram? (Bloco 3)

---

## 📋 FASE 4 - DIFERENCIAL DE PORTFÓLIO (FUTURO)

### 6. Assistente de Análise
- [ ] Criar painel de alertas inteligentes
- [ ] **Regras de Negócio:**
  - [ ] Detectar titular falecido sem documentação
  - [ ] Detectar valores inconsistentes
  - [ ] Detectar prazos críticos
  - [ ] Detectar documentação faltante
  - [ ] Detectar cessão sem contrato
- [ ] Sistema de notificações
- [ ] Priorização automática de alertas
- [ ] Histórico de alertas resolvidos

### 7. Relatório Executivo
- [ ] Criar template de relatório profissional
- [ ] **Seções:**
  - [ ] Resumo executivo
  - [ ] Análise de riscos
  - [ ] Histórico completo
  - [ ] Valores e descontos detalhados
  - [ ] Recomendações
- [ ] Exportação em PDF
- [ ] Exportação em Excel
- [ ] Personalização de template
- [ ] Assinatura digital

---

## ✅ CONCLUÍDO ANTERIORMENTE

### Configuração Inicial
- [x] Configurar ambiente local
- [x] Instalar dependências
- [x] Configurar Supabase (.env.local)
- [x] Corrigir problema do Tailwind CSS
- [x] Testar página de login
- [x] Verificar estilos funcionando

### Unificação da Fila de Cálculo
- [x] Criar script SQL `39-adicionar-campo-motivo-atraso.sql`
- [x] Criar componente `ModalAtraso` para reportar atrasos
- [x] Criar componente `CardPrecatorioCalculo` otimizado
- [x] Refatorar página `/calculo` para UMA única aba
- [x] Adicionar identificação de responsáveis (criador, comercial, cálculo)
- [x] Implementar ordenação FIFO (urgente primeiro, depois data)
- [x] Adicionar funcionalidade "Reportar Atraso"
- [x] Eliminar fragmentação (remover múltiplas abas)
- [x] Deletar página antiga `painel-calculos`
- [x] Remover link do menu lateral

---

## 📊 OUTRAS MELHORIAS (BACKLOG)

### Funcionalidades Core
- [ ] Testar criação de precatórios
- [ ] Testar distribuição para operadores
- [ ] Testar envio para cálculo
- [ ] Testar marcação de urgente
- [ ] Verificar Kanban board funcionando

### Melhorias de UX
- [ ] Adicionar loading states em todas as ações
- [ ] Implementar mensagens de erro amigáveis
- [ ] Adicionar confirmações antes de deletar
- [ ] Melhorar feedback visual de ações

### Design
- [ ] Criar/adicionar ícones do projeto (icon.svg, favicon)
- [ ] Adicionar logo personalizado
- [ ] Melhorar paleta de cores (se necessário)
- [ ] Adicionar animações suaves

### Responsividade
- [ ] Testar em mobile (< 768px)
- [ ] Testar em tablet (768px - 1024px)
- [ ] Ajustar sidebar para mobile
- [ ] Melhorar tabelas em telas pequenas

### Segurança
- [ ] Revisar todas as RLS policies
- [ ] Testar permissões por role
- [ ] Implementar rate limiting
- [ ] Adicionar logs de auditoria
- [ ] Configurar backup automático do banco

### Performance
- [ ] Otimizar queries do Supabase
- [ ] Implementar paginação em listas grandes
- [ ] Adicionar cache onde apropriado
- [ ] Otimizar imagens
- [ ] Implementar lazy loading

### Documentação
- [ ] Documentar APIs internas
- [ ] Criar guia do usuário
- [ ] Documentar fluxos de trabalho
- [ ] Criar vídeos tutoriais
- [ ] Documentar troubleshooting comum

---

## 🐛 BUGS CONHECIDOS

### Críticos
- Nenhum no momento ✅

### Menores
- [ ] Ícones 404 (icon.svg, icon-light-32x32.png)
- [ ] 1 vulnerabilidade de segurança no npm

---

## 📝 NOTAS IMPORTANTES

### Ordem de Implementação das Fases
1. ✅ **FASE 1:** Inteligência Operacional (Score + SLA) - **CONCLUÍDA**
2. 🔄 **FASE 2:** Experiência do Operador (Timeline + Atraso Estruturado) - **PRÓXIMA**
3. 📋 **FASE 3:** Visual Analítico (Dashboard)
4. 📋 **FASE 4:** Diferencial de Portfólio (Assistente + Relatórios)

### Regras de Desenvolvimento
- ✅ Implementar UMA funcionalidade por vez
- ✅ Confirmar funcionamento antes de seguir
- ✅ Nunca implementar duas fases simultaneamente
- ✅ Sempre testar em ambiente local antes de fazer deploy
- ✅ Fazer backup do banco antes de executar scripts SQL
- ✅ Documentar mudanças importantes

### Próximos Passos Imediatos
1. **EXECUTAR SCRIPTS SQL FASE 1** no Supabase (40, 41, 42)
2. **EXECUTAR SCRIPTS SQL FASE 2** no Supabase (43, 44)
3. **TESTAR** badges de complexidade e SLA (FASE 1)
4. **TESTAR** atraso estruturado e timeline (FASE 2)
5. **VALIDAR** cálculos automáticos e triggers
6. **AGUARDAR VALIDAÇÃO** do usuário
7. **INICIAR FASE 3** após aprovação

---

**Última atualização:** Janeiro 2025  
**Status do Projeto:** 🟢 Ativo - FASE 1 e FASE 2 Completas  
**Próxima Milestone:** Executar scripts SQL (40-44) e validar FASE 1 e FASE 2
