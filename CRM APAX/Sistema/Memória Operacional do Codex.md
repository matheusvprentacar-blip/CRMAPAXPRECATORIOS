---
title: Memória Operacional do Codex
tags:
  - sistema
  - codex
  - obsidian
  - processo
aliases:
  - Regra do Codex
  - Codex no Obsidian
---

# Memória Operacional do Codex

## Objetivo

Este vault `CRM APAX` funciona como a memória de longo prazo do projeto para consultas e atualizações feitas pelo Codex.

## Regra de leitura

Antes de mudanças relevantes, o Codex deve:

1. Abrir [[🏠 Índice]] para localizar o contexto certo.
2. Ler as notas ligadas ao tema em:
   - `Sistema/`
   - `Módulos/`
   - `Processos/`
   - `Banco de Dados/`
3. Confirmar no código a informação sensível a comportamento, permissões, integrações, schema e arquitetura.

> [!warning] Fonte da verdade
> Se houver conflito entre o vault e o código-fonte, o código prevalece. O vault deve ser corrigido no mesmo trabalho.

## Regra de escrita

Toda alteração relevante no projeto deve gerar atualização no Obsidian.

### Atualizar sempre

- a nota temática do assunto afetado, quando existir
- a nota diária `YYYY-MM-DD.md` do dia atual

### O que registrar

- contexto da mudança
- módulos, arquivos ou áreas impactadas
- decisão tomada
- pendências, riscos ou próximos passos

### O que não registrar

- segredos, tokens, senhas ou chaves
- dados pessoais sensíveis
- experimentos descartados sem valor de histórico

## Estrutura sugerida para nota diária

```md
# YYYY-MM-DD

## Atualizações

### Título curto da mudança
- Contexto:
- Mudanças:
- Arquivos/áreas:
- Pendências:
```

## Navegação recomendada

- [[Visão Geral]]
- [[Arquitetura Técnica]]
- [[Papéis e Permissões]]
- [[Ciclo de Vida do Precatório]]
- [[Fluxo de Cálculo]]
