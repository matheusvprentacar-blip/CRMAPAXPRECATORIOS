---
title: Componentes UI
tags:
  - sistema
  - frontend
  - ui
aliases:
  - Componentes UI
---

# Componentes UI

## Select compartilhado

Arquivo base: `components/ui/select.tsx`

- O componente `Select` compartilhado usa Radix UI com `SelectContent` em portal para evitar clipping dentro de dialogs e outras camadas flutuantes.
- Para listas longas, o `Viewport` interno deve concentrar o scroll vertical com altura maxima controlada.
- A configuracao atual limita a lista a `20rem` ou ao espaco disponivel na viewport, o que for menor.
- O comportamento foi ajustado para exibicao de listas extensas de usuarios sem exigir reducao manual da janela.

## Quando reutilizar

- Seletores de operador, responsavel, usuario ou qualquer lista dinamica com muitos itens devem usar esse componente base.
- Evitar recriar dropdown local com overflow proprio antes de validar se o `components/ui/select.tsx` ja cobre o caso.

## Arquivos impactados pela decisao

- `components/ui/select.tsx`
