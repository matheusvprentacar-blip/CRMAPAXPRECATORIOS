# Diagramas do Sistema - CRMAPAXPRECATORIOS

## 1. Arquitetura de Alto Nível
Este diagrama mostra como os principais blocos do sistema se interconectam.

```mermaid
graph TB
    subgraph Client_Layer [Camada de Cliente]
        Web[Next.js App Router]
        Tauri[Tauri Desktop Wrapper]
    end

    subgraph Logic_Layer [Camada de Lógica]
        SA[Server Actions]
        SVC[Services Layer]
        OCR[Python OCR Pipeline]
    end

    subgraph Data_Layer [Camada de Dados]
        DB[(PostgreSQL - Supabase)]
        ST[Storage - Buckets]
        Auth{Supabase Auth}
    end

    Web --> Auth
    Web --> SA
    SA --> SVC
    SVC --> DB
    Web --> ST
    OCR --> ST
    OCR --> DB
```

---

## 2. Fluxo de Requisição e Segurança (RLS)
Demonstra o caminho de uma requisição autenticada.

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuário
    participant App as Web App (Next.js)
    participant Supa as Supabase (API/Gateway)
    participant DB as Postgres (RLS Policies)

    User->>App: Acessa Dashboard
    App->>Supa: Req com JWT (Role: Admin)
    Supa->>DB: Executa Query
    Note right of DB: RLS verifica: auth.uid() == owner_id OR role == 'admin'
    DB-->>Supa: Retorna apenas linhas autorizadas
    Supa-->>App: Resposta JSON
    App-->>User: Renderiza Dados
```

---

## 3. Estrutura de Módulos (Kanban & OCR)
Detalha a interação entre os dois módulos mais complexos.

```mermaid
graph LR
    subgraph Kanban_Module [Módulo Kanban]
        KView[Visualizador Kanban]
        KDrag[Drag & Drop Logic]
        KState[Zustand Store]
    end

    subgraph OCR_Module [Módulo OCR]
        UP[Upload PDF]
        PY[Python Pipeline]
        GEM[Gemini Pro]
    end

    UP --> PY
    PY --> GEM
    GEM --> DB[(Database)]
    DB --> KState
    KState --> KView
```
