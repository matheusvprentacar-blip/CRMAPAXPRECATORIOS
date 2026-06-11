---
title: Preenchimento Rápido (Modal)
tags:
  - modulo
  - precatorios
  - ui
aliases:
  - Modal de Preenchimento Rápido
  - Quick Fill
---

# Preenchimento Rápido (Modal)

> [!info] Resumo
> Modal aberto com **1 clique** num card (ou linha da tabela) da página `/precatorios` para editar rapidamente os campos mais usados, sem entrar nos detalhes.
> Componente: `components/precatorios/modal-preenchimento-rapido.tsx`.

## Gatilho / UX

- **1 clique** no card → abre o modal de preenchimento rápido (imediato, sem atraso de duplo-clique).
- Botão **"Abrir detalhes completos"** dentro do modal → navega para `/precatorios/detalhes?id=...`.
- A navegação direta aos detalhes pelo clique no card **foi substituída** pelo modal (decisão de UX). A tabela segue o mesmo gatilho.
- Cliques em checkbox de seleção e no menu de exclusão continuam com `stopPropagation` — não abrem o modal.

## Seções e campos

| Seção | Campo (label) | Coluna em `precatorios` |
|-------|---------------|--------------------------|
| Dados gerais | Operador (responsável) | `dono_usuario_id` |
| Dados gerais | Nº do processo | `numero_processo` |
| Dados gerais | Nº processo originário | `numero_processo_originario` |
| Dados gerais | Nome do cliente | `credor_nome` |
| Dados gerais | Ente devedor | `devedor` |
| Dados gerais | Valor do processo | `valor_principal` |
| Dados gerais | CPF / CNPJ | `credor_cpf_cnpj` |
| Dados gerais | Data de nascimento | `credor_data_nascimento` |
| Dados gerais | Cidade que reside | `credor_cidade` |
| Dados gerais | % de honorários | `honorarios_percentual` |
| Horizontal | Previsão de pagamento | `previsao_pagamento` |
| Horizontal | Certidões (7): resultado + solicitada em + validade | tabela `precatorio_certidoes` (1 linha por tipo) |
| Vertical | Possui ofício requisitório | `possui_oficio_requisitorio` |
| Vertical | Possui penhora | `analise_penhora` |
| Vertical | Possui preferencial | `possui_preferencial` |
| Vertical | Possui adiantamentos | `possui_adiantamento` |
| Vertical | Observações | `observacoes` |

> [!tip] Cada certidão tem 3 campos
> Para cada uma das 7 certidões o modal mostra: **Resultado** (select: Negativa `negativa`, Positiva `positiva`, Não concluído `nao_concluido`, Não solicitado `nao_solicitado`, N/A `na` — cor reflete o estado), **Solicitada em** (data) e **Validade** (data). Salvas via `upsert` em `precatorio_certidoes` (`onConflict: precatorio_id,tipo`), apenas as que tiverem algum valor preenchido.
>
> **Sem upload no modal** — o anexo do documento é feito na pasta de certidões normal (checklist `precatorio_itens`).

## Persistência

- Salva via `supabase.from("precatorios").update(payload).eq("id", id)`.
- Campos booleanos usam tri-state no formulário (`Sim` / `Não` / `Não informado`) e gravam `true` / `false` / `null`.
- `onSuccess` chama `refetch()` da listagem — o card é atualizado sem recarregar a página.

> [!warning] Resumo ≠ checklist documental
> A tabela `precatorio_certidoes` é um **resumo rápido** (resultado + datas) e não substitui o checklist documental em `precatorio_itens` (`tipo_grupo = 'CERTIDAO'`), onde ficam o **upload/anexo** e o status `PENDENTE`/`RECEBIDO`/… usado no [[Kanban]].

## Veja também
- [[Tabelas Principais]]
- [[Componentes UI]]
- [[Calculadora de Precatórios]]
