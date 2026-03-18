# Documentação Técnica - CRMAPAXPRECATORIOS

## 1. Visão Geral do Projeto de CRM de Precatórios

### Objetivo do Sistema
O **CRMAPAXPRECATORIOS** é uma plataforma robusta projetada para gerenciar o ciclo de vida completo de ativos judiciais (precatórios e créditos). Ele permite o controle administrativo, jurídico e financeiro, automatizando a extração de dados de documentos oficiais e facilitando a gestão de negociações.

### Problema que Resolve
- **Lentidão na Extração de Dados:** Automatiza a leitura de ofícios precatórios via IA (OCR).
- **Desorganização de Fluxos:** Implementa pipelines visuais (Kanban) para diferentes estágios (Jurídico, Comercial, Operacional).
- **Erros de Cálculo:** Centraliza simuladores e calculadoras financeiras baseadas em regras de juros e mora.

### Público ou Tipo de Aplicação
- **Público:** Empresas de investimento em ativos judiciais, escritórios de advocacia especializados e gestores financeiros.
- **Tipo:** Aplicação SaaS Full-stack com suporte a Desktop nativo.

---

## 2. Arquitetura do Sistema

### Padrão de Arquitetura
O sistema utiliza uma arquitetura **Serverless-First baseada em Next.js 15**, integrando padrões de **Clean Architecture** na estrutura de serviços.

### Divisão entre Camadas
1.  **UI Layer (Frontend):** React + HeroUI + Tailwind. Camada responsável pela apresentação e estado local (Zustand).
2.  **Service Layer (Lógica de Negócio):** Localizada em `services/` e `lib/calculos/`. Desacopla as chamadas de banco e integrações de IA da UI.
3.  **Infrastructure Layer (Backend/DB):** Supabase provê PostgreSQL, Auth e Storage. O acesso é controlado por **RLS (Row Level Security)**.
4.  **Specialized Layer (OCR):** Pipeline em Python isolado para processamento pesado de documentos.

---

## 3. Estrutura de Pastas e Arquivos

| Pasta | Responsabilidade |
| :--- | :--- |
| `app/` | Roteamento (Next.js App Router). Contém páginas do Dashboard, Admin e APIs. |
| `components/` | Componentes visuais. Divididos em `ui/` (base), `dashboard/`, `kanban/` e específicos por módulo. |
| `lib/` | Configurações centrais, instâncias do Supabase, hooks customizados e utilitários de cálculos. |
| `services/` | Camada de abstração de chamadas externas e lógica persistente. |
| `supabase/` | Migrações SQL e definições de schema do banco de dados. |
| `precatorio_ocr_pipeline/` | Pipeline Python para extração de dados via OCR e LLM. |
| `src-tauri/` | Configurações para build da aplicação desktop nativa. |

---

## 4. Regras de Negócio
- **Multi-Tenancy:** Dados isolados por organização através de RLS.
- **Hierarquia de Roles:** Admin, Gestor, Operador e Cliente possuem níveis de acesso distintos injetados no JWT.
- **Fluxo de Cálculo:** O sistema aplica regras de juros compostos e atualização monetária baseadas em tabelas históricas do tribunal.
- **Validação de Documentos:** Apenas ofícios precatórios válidos são processados pelo OCR.

---

## 5. Fluxo de Funcionamento (Exemplo: Extração OCR)
1. **Upload:** O usuário sobe um PDF na interface.
2. **Processamento:** O arquivo é enviado para o bucket do Supabase.
3. **Pipeline OCR:** O pipeline Python detecta o upload ou recebe o arquivo, processa via Tesseract/Gemini Pro.
4. **Alimentação:** Os dados estruturados (Valor, Tribunal, CPF/CNPJ) retornam para o banco e refletem no Dashboard.

---

## 6. Tecnologias Utilizadas
- **Frontend:** Next.js 15, React 19, HeroUI, Framer Motion.
- **Backup/Desktop:** Tauri (Rust).
- **Banco de Dados:** PostgreSQL (Supabase).
- **Linguagens:** TypeScript, Python, SQL, Rust (Tauri).
- **IA:** Google Gemini Pro API.

---

## 7. Integrações
- **Supabase Auth:** Autenticação via JWT.
- **Supabase Storage:** Armazenamento de PDFs e documentos.
- **Gemini API:** Inteligência para extração de dados.

---

## 8. Banco de Dados
- **Tabelas Principais:** `usuarios`, `empresas`, `precatorios`, `comunicados`, `telemetria`.
- **Relacionamentos:** 1 empresa para N precatórios; N usuários por empresa (roles).

---

## 9. Boas Práticas
- **Clean Code:** Uso extensivo de TypeScript para segurança de tipos.
- **Git Flow:** Divisão clara entre migrações e código de aplicação.
- **Performance:** Imagens otimizadas e Server Components onde possível.

---

## 10. Guia para Novos Desenvolvedores

### Como rodar o projeto
1. Clone o repositório.
2. Instale as dependências: `npm install`.
3. Configure o arquivo `.env.local` com as chaves do Supabase e Gemini.
4. Execute o banco de dados (se local) via `npx supabase start`.
5. Rode o projeto: `npm run dev`.

### Variáveis de Ambiente
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```
