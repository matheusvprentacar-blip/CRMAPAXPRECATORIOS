# Guia: Configurar Logo da Empresa

## Objetivo
Permitir que o administrador faça upload do logo da empresa e personalize o nome/subtítulo exibidos no sistema.

## Arquivos Criados/Modificados

### 1. Script SQL
**Arquivo**: `scripts/75-adicionar-logo-empresa.sql`

Cria:
- Tabela `configuracoes_sistema` com campos: logo_url, nome_empresa, subtitulo_empresa
- Bucket público `logos` no Supabase Storage
- Policies de acesso (leitura pública, upload/update/delete apenas admin)
- RLS e trigger de updated_at

### 2. Página de Configurações
**Arquivo**: `app/(dashboard)/configuracoes/page.tsx`

Funcionalidades:
- Upload de logo (PNG/JPG até 2MB)
- Preview do logo
- Remover logo
- Editar nome da empresa
- Editar subtítulo
- Apenas acessível por admin

### 3. Layout Atualizado
**Arquivo**: `app/(dashboard)/layout.tsx`

Modificações:
- Carrega configurações do banco ao iniciar
- Exibe logo personalizado no sidebar (se configurado)
- Exibe nome e subtítulo personalizados
- Adiciona item "Configurações" no menu (apenas admin)

## Passos para Ativar

### Passo 1: Executar Script SQL

1. Acesse o Supabase Dashboard
2. Vá em "SQL Editor"
3. Copie e cole o conteúdo de `scripts/75-adicionar-logo-empresa.sql`
4. Execute o script
5. Verifique se aparece: "Script 75 executado com sucesso!"

### Passo 2: Criar Bucket no Supabase (se necessário)

Se o bucket não for criado automaticamente pelo script:

1. Vá em "Storage" no Supabase Dashboard
2. Clique em "Create bucket"
3. Nome: `logos`
4. Marque "Public bucket"
5. Clique em "Create bucket"

### Passo 3: Acessar Configurações

1. Faça login como admin
2. No menu lateral, clique em "Configurações"
3. Você verá duas seções:
   - **Logo da Empresa**: Upload/remover logo
   - **Informações da Empresa**: Nome e subtítulo

### Passo 4: Fazer Upload do Logo

1. Clique em "Selecionar Logo"
2. Escolha uma imagem (PNG ou JPG, máx. 2MB)
3. Veja o preview
4. Clique em "Salvar Logo"
5. Aguarde o upload
6. A página recarregará automaticamente
7. O logo aparecerá no sidebar

### Passo 5: Personalizar Nome/Subtítulo

1. Edite "Nome da Empresa" (ex: "Apax Investimentos")
2. Edite "Subtítulo" (ex: "CRM Precatórios")
3. Clique em "Salvar Informações"
4. A página recarregará
5. Os textos atualizados aparecerão no sidebar

## Recomendações

### Logo
- **Formato**: PNG com fundo transparente (ideal)
- **Tamanho**: Quadrado (ex: 512x512px) ou horizontal
- **Peso**: Máximo 2MB
- **Cores**: Contraste adequado para tema claro e escuro

### Nome da Empresa
- Máximo 30 caracteres para boa visualização
- Exemplo: "Apax Investimentos"

### Subtítulo
- Máximo 25 caracteres
- Exemplo: "CRM Precatórios"

## Troubleshooting

### Erro ao fazer upload
- Verifique se o bucket "logos" existe
- Verifique se as policies estão corretas
- Verifique se você está logado como admin

### Logo não aparece
- Limpe o cache do navegador (Ctrl+Shift+R)
- Verifique se a URL do logo está salva no banco
- Verifique se o bucket é público

### Erro de permissão
- Verifique se você tem role "admin"
- Execute o script 75 novamente
- Verifique as policies do bucket

## Estrutura do Banco

```sql
-- Tabela
configuracoes_sistema
  - id (UUID, PK)
  - logo_url (TEXT, nullable)
  - nome_empresa (TEXT, default 'CRM Precatórios')
  - subtitulo_empresa (TEXT, default 'Sistema de Gestão')
  - created_at (TIMESTAMPTZ)
  - updated_at (TIMESTAMPTZ)

-- Bucket
logos (public)
  - Leitura: Todos
  - Upload/Update/Delete: Apenas admin
```

## Próximos Passos

Após configurar o logo:
1. Teste em diferentes telas (desktop/mobile)
2. Teste com tema claro e escuro
3. Verifique se o logo carrega rápido
4. Considere adicionar mais opções de personalização (cores, favicon, etc.)
