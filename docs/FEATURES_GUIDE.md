# Guia de Funcionalidades - CRM Precatórios

Este guia detalha as principais capacidades operacionais do sistema para usuários e gestores.

## 📋 1. Kanban de Fluxo (Gates)
O coração do CRM é o sistema de Kanban distribuído em fases (Gates):
- **Jurídico**: Validação da documentação inicial e certidões.
- **Cálculo**: Elaboração da simulação financeira e conferência de valores.
- **Comercial**: Negociação ativa com o credor e fechamento.
- **Escrituras**: Formalização em cartório e cessão de crédito.

O sistema bloqueia avanços se requisitos mínimos (Checklists) de cada gate não forem cumpridos.

## 🧮 2. Calculadora Financeira Otimizada
Permite simular o valor líquido que o credor receberá:
- **Atualização Automática**: Usa IPCA/SELIC atualizados via API do BCB.
- **Descontos Estruturados**: IRPF (com isenção configurável), PSS e Honorários.
- **Histórico**: Cada simulação é salva, permitindo rastrear o rastro de cálculo.

## 🤖 3. OCR e Extração com IA
Integração com Google Gemini para automatizar o cadastro:
- **Upload de Ofícios**: O usuário sobe o PDF do ofício requisitório.
- **Parsing Automático**: A IA extrai Número do Processo, Nome do Credor, Valor Principal e Datas Críticas.
- **Preenchimento Prévio**: O sistema pré-preenche o formulário para conferência do operador, reduzindo erro humano.

## 📊 4. Dashboard Estratégico (Telemetria)
Visão centralizada para gestores:
- **Visão por Complexidade**: Distribuição da carga de trabalho.
- **Gargalos**: Motivos mais frequentes de atraso (Doc. Incompleta, Dúvida Jurídica).
- **Performance**: Tempo médio em fila (SLA) por fase e por operador.
- **Precatórios Críticos**: Alerta visual para ativos com selo de urgência ou atraso crítico.

## 🔔 5. Sistema de Comunicação e Agenda
- **Chat Interno**: Comunicação direta no contexto de cada precatório.
- **Notificações**: Alertas em tempo real sobre propostas aceitas ou prazos de SLA vencidos.
- **Agenda**: Visualização de compromissos e tarefas agendadas por operador.
