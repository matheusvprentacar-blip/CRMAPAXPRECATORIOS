---
title: Arquitetura Técnica
tags:
  - sistema
  - arquitetura
  - tecnico
aliases:
  - Arquitetura Técnica
---

# Arquitetura Técnica

## Estrutura de Pastas

```
crmapaxprecatorios/
├── app/                      ← Next.js App Router
│   ├── (dashboard)/          ← Rotas protegidas do painel
│   │   ├── dashboard/
│   │   ├── precatorios/
│   │   ├── calculo/
│   │   ├── kanban/
│   │   └── admin/
│   ├── api/                  ← API Routes
│   │   ├── market/           ← Dados BCB/Tesouro (ISR 1h)
│   │   ├── precatorios/      ← Datajud, simulação
│   │   └── admin/            ← Notificações, OCR
│   └── auth/                 ← Login, registro
├── components/               ← Componentes React
│   ├── ui/calc/              ← KpiCard, SectionPanel, StepFooter
│   ├── steps/                ← Passos da calculadora
│   ├── dashboard/            ← Widgets de dashboard
│   └── notifications/        ← Sistema de notificações
├── hooks/                    ← Custom hooks
├── lib/                      ← Utilitários e serviços
│   ├── calculos/             ← Engine de cálculo
│   ├── auth/                 ← Auth context
│   ├── cache/                ← Cache em memória (TTL)
│   └── supabase/             ← Client browser/server
├── services/                 ← Serviços externos
│   ├── market-data/          ← BCB + Tesouro
│   └── simulation/           ← Simulações comparativas
```

> [!info] Execução
> A aplicação opera em modo **web-only** via Google Chrome. O runtime principal é Next.js no navegador.

## Providers (Contextos)

| Provider | Arquivo | Responsabilidade |
|----------|---------|-----------------|
| `AuthProvider` | `lib/auth/auth-context.tsx` | Sessão do usuário, perfil, roles |
| `HeroUIProvider` | `app/providers.tsx` | UI library + tema + zoom |
| `PDFViewerProvider` | `components/providers/pdf-viewer-provider.tsx` | Estado do visualizador PDF |
| `TelemetryProvider` | `components/telemetry/telemetry-provider.tsx` | Rastreamento de uso |
| `NotificationsProvider` | `components/notifications/useNotifications.tsx` | Notificações realtime |

## Supabase — Clientes

```typescript
// Browser (componentes "use client")
import { createBrowserClient } from "@/lib/supabase/client"
const supabase = createBrowserClient()

// Server (server components, API routes)
import { createServerClient } from "@/lib/supabase/server"
const supabase = await createServerClient()
```

> [!warning] Atenção
> Todas as páginas do dashboard são `"use client"` — o Next.js Data Cache (ISR, `unstable_cache`) **não se aplica** a elas. O cache deve ser implementado na camada de cliente.

## Cache em Memória

Arquivo: `lib/cache/client-cache.ts`

```typescript
cacheGet<T>(key)           // Lê — retorna null se expirado
cacheSet(key, data, ttlMs) // Grava com TTL em ms
cacheDelete(key)           // Invalida entrada
cacheInvalidatePrefix(prefix) // Invalida por prefixo
```

### TTLs definidos

| Dado | Cache Key | TTL |
|------|-----------|-----|
| Lista de usuários ativos | `usuarios_ativos` | 5 min |
| Lista com email | `usuarios_ativos_with_email` | 5 min |
| KPIs do Dashboard | `dashboard_kpis_{period}_{userId}` | 10 min |
| Dados de mercado | ISR no servidor (`/api/market/latest`) | 1 hora |

## Hook: useUsuariosCache

Arquivo: `hooks/use-usuarios-cache.ts`

Centraliza a busca da lista de usuários ativos com cache de 5 minutos. Evita 4+ queries redundantes ao navegar entre páginas.

```typescript
const { usuarios, loading } = useUsuariosCache()
const { usuarios, loading } = useUsuariosCache(true) // inclui email
```

### Compatibilidade de schema (`operator_tag`)

Para evitar queda de sessão/tela branca durante rollout parcial de migrations, o app aplica fallback quando a coluna `usuarios.operator_tag` ainda não existe no banco:

- `AuthProvider` tenta carregar perfil com `operator_tag` e, se receber erro `42703`, refaz a query sem a coluna.
- `useUsuariosCache` segue a mesma estratégia para lista de usuários.

Arquivos:

- `lib/auth/auth-context.tsx`
- `hooks/use-usuarios-cache.ts`
- `lib/users/operator-tag.ts`

## Realtime (Supabase Subscriptions)

Usado em:
- `components/notifications/useNotifications.tsx` — notificações push via `postgres_changes`
- Chat (`/chat`) — mensagens em tempo real

> [!note] Não cachear realtime
> Dados de notificações e chat devem permanecer frescos — não aplicar cache sobre subscriptions.

## Autenticação

- **Provedor**: Supabase Auth (email/senha)
- **Sessão**: Cookie HTTP-only (gerenciado pelo Supabase)
- **Perfil**: Tabela `usuarios` vinculada via `auth.users.id`
- **Roles**: Array de strings no campo `role` da tabela `usuarios`
- **Proteção de rotas**: Componente `<ProtectedRoute>` + verificação de role

## Veja também
- [[Visão Geral]]
- [[Papéis e Permissões]]
- [[Tabelas Principais]]
