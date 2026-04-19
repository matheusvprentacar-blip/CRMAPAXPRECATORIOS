---
title: Papéis e Permissões
tags:
  - sistema
  - auth
  - roles
aliases:
  - Papéis e Permissões
  - Roles
---

# Papéis e Permissões

## Lista de Roles (13 perfis)

| Role | Nome exibido | Acesso principal |
|------|-------------|-----------------|
| `admin` | Administrador | Acesso total ao sistema |
| `tecnico_ti` | Técnico TI | Tratado como admin no frontend |
| `gestor` | Gestor | Dashboard global, kanban, propostas |
| `operador_comercial` | Operador Comercial | Proposta, negociação e operação no atendimento |
| `operador_calculo` | Operador de Cálculo | Fila de cálculo, calculadora |
| `operador` | Operador Geral | Operações gerais e operação no atendimento |
| `analista` | Analista | Análise processual |
| `gestor_certidoes` | Gestor de Certidões | `/gestao-certidoes` |
| `gestor_oficio` | Gestor de Ofícios | `/gestao-oficios` |
| `gestor_escrituras` | Gestor de Escrituras | `/gestao-escrituras` |
| `juridico` | Jurídico | Parecer jurídico, kanban jurídico |
| `financeiro` | Financeiro | Dashboard financeiro |
| `agente_atendimento` | Agente de Atendimento | `/atendimento`, visão global da fila sem valores |

> [!info] Múltiplos roles
> Um usuário pode ter **até 2 roles simultaneamente** (array no campo `role`).

## Helpers de Verificação

```typescript
// Verifica um role específico
hasRole(roles, "admin")

// Verifica se tem QUALQUER um dos roles
hasAnyRole(roles, ["admin", "gestor"])

// Verifica se tem TODOS os roles
hasAllRoles(roles, ["operador", "juridico"])
```

## Escopo do Dashboard

Usuários com as roles abaixo veem **todos os precatórios** (escopo global):

```
admin | gestor | financeiro | gestor_* (qualquer prefixo gestor_)
```

Os demais veem apenas os precatórios onde aparecem como:
- `dono_usuario_id`
- `criado_por`
- `responsavel`
- `responsavel_juridico_id`
- `responsavel_calculo_id`

## Setor de Atendimento

### Quem acessa

- `admin`
- `agente_atendimento`
- `operador_comercial`
- `operador`

### Regras de visibilidade

- `admin` vê todos os créditos originados no atendimento e também os campos de valor dentro da aba.
- `agente_atendimento` vê todos os créditos do atendimento, mas sem `valor_principal` e `valor_atualizado`.
- `operador_comercial` e `operador` veem apenas os créditos distribuídos para si (`responsavel` / `dono_usuario_id`) e também sem valores.

### Tags operacionais

Usuários operacionais de atendimento passam a ter o campo `operator_tag` em `usuarios`, com os valores:

- `operador`
- `freelancer`
- `externo`

Essas tags servem para:

- filtrar operadores na distribuição manual
- montar lotes grandes com seleção rápida por perfil operacional
- manter a mesma role com segmentação mais simples no admin

## Fluxo de Distribuição Admin

> [!warning] Redistribuição de precatórios
> Somente `admin` pode redistribuir precatórios já atribuídos.
> O processo exige **dois passos** no Supabase por restrição de RLS:
> 1. Limpar campos (`dono_usuario_id = null`, `responsavel = null`, `responsavel_calculo_id = null`)
> 2. Atribuir os novos responsáveis

Veja [[Módulo Admin]] para detalhes da implementação.

## Veja também
- [[Arquitetura Técnica]]
- [[Módulo Admin]]
- [[Ciclo de Vida do Precatório]]
