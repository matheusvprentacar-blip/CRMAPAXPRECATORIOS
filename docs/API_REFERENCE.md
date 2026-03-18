# Referência de API - CRM Precatórios

Este documento descreve os principais endpoints da API do sistema. Todas as rotas estão sob o prefixo `/api` e utilizam o padrão App Router do Next.js.

## 🔑 Autenticação
A maioria das rotas exige autenticação via Supabase Auth. O token JWT deve ser passado nos cookies ou headers de autorização conforme o middleware do Next.js.

---

## 🏗 Admin

### Notificações
- **POST `/api/admin/notifications`**
  - Envia notificações push/email para usuários.
  - Body: `{ userId: string, title: string, message: string, type: 'info' | 'warning' | 'error' }`

### Gestão de Precatórios
- **GET `/api/admin/precatorios`**
  - Lista precatórios para visão administrativa.
- **POST `/api/admin/precatorios/sync`**
  - Sincroniza dados de precatórios com fontes externas.

---

## 📄 Precatórios

### Detalhes e Operações
- **GET `/api/precatorios/[id]`**
  - Retorna todos os detalhes de um precatório específico, incluindo proposta e histórico.
- **PATCH `/api/precatorios/[id]`**
  - Atualiza campos do precatório (status, valores, observações).

### OCR e Extração (IA)
- **POST `/api/precatorios/extract`** (ou via Server Action)
  - Envia um PDF para o Google Gemini processar e extrair campos automaticamente.

---

## 📈 Market (Dados de Mercado)

### Índices Econômicos
- **GET `/api/market/latest`**
  - Retorna os valores mais recentes de IPCA, SELIC e outros índices.
- **POST `/api/market/refresh`**
  - Força a atualização dos índices consumindo APIs externas (BCB, IBGE).

---

## 💬 Chat e Comunicação

### Comunicados
- **POST `/api/comunicados`**
  - Cria comunicados em massa para a equipe.
- **GET `/api/comunicados`**
  - Lista comunicados ativos.

---

> [!NOTE]
> Muitas funcionalidades críticas do sistema (como Aprovação de Proposta e Mudança de Fase no Kanban) são executadas via **Server Actions** (`app/(dashboard)/.../actions.ts`) para melhor integração com o Supabase e segurança.
