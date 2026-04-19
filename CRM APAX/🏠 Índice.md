---
title: CRM APAX — Base de Conhecimento
tags:
  - indice
  - sistema
aliases:
  - Home
  - Início
cssclasses:
  - home
---

# CRM APAX — Gestão de Precatórios

> [!abstract] Sobre este vault
> Documentação técnica e operacional do sistema CRM APAX para gestão de precatórios judiciais. Criado em [[2026-04-18]].

## Navegação Principal

### 🏛 Sistema
- [[Visão Geral]] — Stack, módulos e arquitetura de alto nível
- [[Arquitetura Técnica]] — Next.js, Supabase, componentes e providers
- [[Papéis e Permissões]] — 13 roles e suas capacidades
- [[Memória Operacional do Codex]] — Regra de consulta e atualização do vault pelo agente

### 🤖 Agentes
- [[Painel Claude Codex]] — Protocolo de handoff e tarefas compartilhadas entre Claude e Codex

### ⚙️ Módulos
- [[Calculadora de Precatórios]] — Passos, índices, modelos A/B/C
- [[Dashboard]] — KPIs, métricas e gráficos
- [[Kanban]] — Workflow visual de status
- [[Módulo Admin]] — Redistribuição, usuários, telemetria
- [[Setor de Atendimento]] — Triagem comercial, distribuição e contato com credores

### 🗄 Banco de Dados
- [[Tabelas Principais]] — Schema das tabelas do Supabase

### 🔄 Processos
- [[Ciclo de Vida do Precatório]] — Do cadastro ao fechamento
- [[Fluxo de Cálculo]] — Pipeline completo de cálculo
- [[Mapa Visual do Cálculo.canvas|Mapa Visual do Cálculo]] — Nó mestre destacado e etapas explicadas visualmente

---

## Resumo Rápido

| Item | Detalhe |
|------|---------|
| **Stack** | Next.js 15.5 + Supabase + TypeScript + Tailwind CSS 4 |
| **Design** | Apax Clay Design System |
| **Acesso** | Web (Google Chrome) |
| **Banco** | PostgreSQL via Supabase |
| **Auth** | Supabase Auth (email/senha) |
| **AI** | Google Gemini (OCR/extração) |
| **Roles** | 13 perfis de acesso |

> [!tip] Dica de navegação
> Use `Ctrl+O` para abrir qualquer nota pelo nome. Use o Grafo (`Ctrl+G`) para visualizar conexões entre módulos.
