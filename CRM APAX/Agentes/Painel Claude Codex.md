---
title: Painel Claude Codex
tags:
  - agentes
  - handoff
  - obsidian
aliases:
  - Protocolo Claude Codex
  - Handoff Claude Codex
---

# Painel Claude Codex

## Objetivo

Esta nota define como Claude e Codex colaboram pelo Obsidian para dividir tarefas, fazer handoff e manter contexto compartilhado.

## Regra principal

Quando o usuário disser algo como:

- `use o claude e faça o frontend`
- `use o codex e faça o backend`
- `use o codex e corrija`

o agente que receber a tarefa deve criar ou atualizar uma nota em `CRM APAX/Agentes/Tarefas/`.

> [!info] Tendência padrão
> Claude tende a assumir frontend e Codex tende a assumir backend, mas a instrução explícita do usuário sempre prevalece.

## Fluxo operacional

1. Ler [[🏠 Índice]] e as notas técnicas do assunto.
2. Criar ou atualizar a nota da tarefa compartilhada.
3. Executar o trabalho.
4. Antes de encerrar, registrar:
   - o que foi feito
   - arquivos alterados
   - testes executados ou faltantes
   - bloqueios
   - próximo passo
   - próximo agente
5. Atualizar também a nota diária do dia.

## Pasta de trabalho

- Tarefas: `CRM APAX/Agentes/Tarefas/`
- Template: `CRM APAX/Agentes/Templates/TEMPLATE - Tarefa Compartilhada.md`

## Comando rápido

Use este comando para abrir uma nova tarefa compartilhada:

```bash
npm run agent:handoff -- --title "corrigir dashboard" --owner codex --scope backend --request "use o codex e corrija o backend do dashboard"
```

> [!warning] Windows PowerShell
> Se o PowerShell bloquear `npm.ps1`, use `npm.cmd run agent:handoff -- --title "..." ...` ou execute direto com `node ./scripts/create-agent-handoff.mjs ...`.

Exemplos:

```bash
npm run agent:handoff -- --title "refatorar tela de login" --owner claude --scope frontend
npm run agent:handoff -- --title "corrigir RPC de busca" --owner codex --scope correcao --handoffTo claude
```

## Convenção da nota

Cada nota deve manter:

- `owner`: agente atual
- `backup_owner`: agente de apoio
- `scope`: frontend, backend, correção, fullstack, docs, etc.
- `status`: aberto, em_andamento, aguardando_handoff, bloqueado, concluido
- `handoff_to`: claude, codex ou usuario

## Quando reutilizar a mesma nota

Reutilize a nota existente quando:

- a tarefa for a continuação do mesmo pedido
- houver handoff entre Claude e Codex
- o usuário pedir correção ou complemento da mesma demanda

Crie uma nova nota quando:

- for um pedido novo
- o contexto e o objetivo forem diferentes

## Checklist de handoff

- [ ] Contexto do vault consultado
- [ ] Mudança concluída ou estado atual registrado
- [ ] Arquivos impactados listados
- [ ] Testes listados
- [ ] Próximo passo descrito
- [ ] Próximo agente definido

## Veja também

- [[Memória Operacional do Codex]]
- [[Visão Geral]]
- [[Arquitetura Técnica]]
