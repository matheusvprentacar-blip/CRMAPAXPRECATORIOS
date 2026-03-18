# Configuração e Implantação - CRM Precatórios

Este guia orienta como configurar o ambiente de desenvolvimento e realizar o deploy da aplicação.

## 💻 Ambiente Local

### Pré-requisitos
- Node.js 20+
- Rust (para o Tauri)
- Conta no Supabase

### Passos
1.  **Clone o repositório** e instale as dependências:
    ```bash
    npm install
    ```
2.  **Configuração de Variáveis de Ambiente**:
    Crie um arquivo `.env.local` na raiz com:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=seu_url_supabase
    NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
    SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
    GOOGLE_GEMINI_API_KEY=sua_chave_gemini
    ```
3.  **Executar o servidor**:
    ```bash
    npm run dev
    ```

---

## 🗄️ Configuração do Supabase

O projeto depende de uma estrutura de banco específica. Siga a ordem recomendada no arquivo `INICIO-RAPIDO.md` para executar os scripts SQL contidos na pasta `/scripts`.

### Buckets de Storage Necessários
- `documentos`: Para ofícios e certidões (Privado, com políticas RLS).
- `logos`: Para fotos de perfil e logos da empresa.

---

## 🚀 Build e Release (Tauri)

O sistema é distribuído como um aplicativo Windows nativo.

### Gerar Nova Versão (Updater Automático)
O projeto possui um script de automação para facilitar o bump de versão e sincronização entre `package.json` e `tauri.conf.json`:

```bash
# Versão Patch (fix)
npm run release:update

# Versão Minor (nova feature)
npm run release:update:minor
```

Este comando:
1.  Faz o bump da versão.
2.  Sincroniza arquivos de config do Tauri.
3.  Cria um commit e tag Git.
4.  Faz o push para o origin (disparando o workflow de deploy se configurado).

### Build Manual
Se precisar gerar o executável localmente:
```bash
npx tauri build
```
O `.exe` resultante estará em `src-tauri/target/release/bundle/msi`.
