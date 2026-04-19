---
title: Módulo Admin
tags:
  - modulo
  - admin
  - administracao
aliases:
  - Módulo Admin
---

# Módulo Admin

## Visão Geral

Rota base: `/admin/`  
Roles: `admin`, `tecnico_ti`  
Arquivo principal: `app/(dashboard)/admin/`

## Sub-módulos

| Rota | Descrição |
|------|-----------|
| `/admin/usuarios` | Gestão de usuários e roles |
| `/admin/usuarios/detalhes` | Detalhes e edição de um usuário |
| `/admin/precatorios` | Distribuição e gestão de precatórios já existentes |
| `/admin/financeiro` | Dashboard financeiro admin |
| `/admin/telemetria` | Métricas de uso e analytics |

---

## Admin Precatórios — Redistribuição

### Escopo atual

- `/admin/precatorios` continua responsável por redistribuição, acompanhamento e ações administrativas do pipeline principal.
- O cadastro manual e a importação em lote de créditos de atendimento não acontecem mais aqui.
- Quando o admin precisa incluir novos créditos para triagem, o fluxo correto agora é entrar em [[Setor de Atendimento]].

### O Problema de RLS

> [!warning] Limitação de RLS
> Uma política RLS do Supabase bloqueia `UPDATE` quando o campo `dono_usuario_id` já tem valor atribuído — impede sobreescrever diretamente.

### Solução: Dois Passos

Implementado em `handleDistribuir()` no arquivo `app/(dashboard)/admin/precatorios/page.tsx`:

```typescript
// Passo 1 — limpar responsáveis existentes
await supabase
  .from("precatorios")
  .update({ dono_usuario_id: null, responsavel: null, responsavel_calculo_id: null })
  .eq("id", selectedPrecatorio.id)

// Passo 2 — atribuir novos responsáveis
await supabase
  .from("precatorios")
  .update({
    responsavel: novoUsuarioId,
    dono_usuario_id: novoUsuarioId,
    prioridade: distribuicao.prioridade,
    distribuido_por_admin: true,
    distribuido_por_admin_id: currentUser.id,
    distribuido_por_admin_em: new Date().toISOString(),
    responsavel_calculo_id: distribuicao.responsavel_calculo_id || null,
  })
  .eq("id", selectedPrecatorio.id)
```

### UI do Dialog

- Título dinâmico: **"Redistribuir"** (se já tem responsável) ou **"Distribuir"** (se vazio)
- Exibe o responsável atual em amber antes da confirmação
- Botão dinâmico reflete a ação

---

## Admin Usuários

- Listagem com filtro por role
- Criação e edição de usuários
- Alteração de roles (array de até 2 roles)
- Classificação operacional adicional por `operator_tag` (`operador`, `freelancer`, `externo`) para times do atendimento
- Reset de senha via Admin API do Supabase

## Relação com o Setor de Atendimento

- O admin cria créditos de atendimento diretamente em `/atendimento`.
- O próprio admin já distribui esses créditos para operadores sem sair da área.
- A etapa de atendimento termina quando o credor demonstra interesse; só depois o crédito volta a seguir no pipeline principal.

### Reset de Senha (SQL)

```sql
UPDATE auth.users 
SET encrypted_password = crypt('nova_senha', gen_salt('bf')) 
WHERE id = 'uuid-do-usuario';
```

---

## Telemetria

Rota: `/admin/telemetria`  
Tabela: `telemetria_uso`

Rastreia:
- Sessões por usuário
- Ações realizadas
- Tempo de uso por módulo
- Origem padronizada em `web` (acesso oficial via navegador)

---

## Admin Financeiro

Rota: `/admin/financeiro`  
Tabela: `financial_transactions` / `v_financial_transactions_norm`

- Receitas e despesas categorizadas
- Status: `pendente`, `pago`, `cancelado`, `atrasado`
- Gráficos de fluxo de caixa

---

## Notificações Admin

Rota API: `POST /api/admin/notifications`

- Cria notificação via RPC `notify_create()`
- Fallback para INSERT direto se RPC falhar
- Usa service role key (não passa por RLS)

## Veja também
- [[Papéis e Permissões]]
- [[Setor de Atendimento]]
- [[Tabelas Principais]]
- [[Ciclo de Vida do Precatório]]
