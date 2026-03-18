# Visão Técnica Geral - CRM Precatórios

Este documento descreve a arquitetura, as tecnologias e a organização do projeto CRM Precatórios.

## 🛠 Tech Stack

O projeto é construído com tecnologias modernas voltadas para performance e experiência do desenvolvedor:

- **Frontend**: [Next.js 15](https://next.js.org/) (App Router)
- **Framework UI**: [HeroUI](https://v3.heroui.com/) (Beta) & [Tailwind CSS](https://tailwindcss.com/)
- **Backend / Database**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage, Edge Functions)
- **Desktop Wrapper**: [Tauri](https://tauri.app/) (Permite rodar a aplicação como um executável nativo Windows)
- **IA**: [Google Gemini Pro](https://deepmind.google/technologies/gemini/) (Integração para OCR e análise de documentos)
- **Gerenciamento de Estado**: [Zustand](https://github.com/pmndrs/zustand) e React Context
- **Animações**: [Framer Motion](https://www.framer.com/motion/) e [GSAP](https://gsap.com/)

## 🏗 Arquitetura

O sistema segue um modelo Full-stack moderno:

1.  **Camada de Cliente (Frontend)**: Componentes React que consomem APIs e Server Actions.
2.  **Camada de Servidor (App Router)**: Rotas de API e Server Actions para lógica de backend segura.
3.  **Camada de Dados (Supabase)**: O PostgreSQL gerencia a integridade, enquanto as políticas de RLS garantem a segurança dos dados.
4.  **Integração IA**: O servidor processa documentos via Gemini API para extração automática de dados.

## 📂 Estrutura de Pastas Principal

```text
├── app/                  # Rotas e Páginas (Next.js App Router)
│   ├── (auth)/           # Fluxos de Login e Recuperação
│   ├── (dashboard)/      # Todos os módulos principais do sistema
│   └── api/              # Endpoints de API (Back-to-Back)
├── components/           # Componentes UI reutilizáveis
│   ├── kanban/           # Componentes específicos do Kanban
│   └── ui/               # Componentes base (Shadcn/HeroUI)
├── lib/                  # Utilitários, Hooks e Instâncias (Supabase, Utils)
├── services/             # Lógica de negócio e chamadas externas
├── scripts/              # Scripts SQL massivos para Setup do Banco
├── supabase/             # Migrations e configurações de banco de dados
└── src-tauri/            # Configuração nativa para Desktop Windows
```

## 🔒 Segurança

- **Entra ID / Supabase Auth**: Gerenciamento de usuários.
- **RLS (Row Level Security)**: Cada linha no banco de dados só pode ser acessada por usuários autorizados, garantindo multi-tenancy e privacidade.
- **JWT Claims**: Roles de usuário (Admin, Operador, Gestor) injetadas diretamente no token.
