# Guia de Configuração do Supabase - CRM Precatórios

## Passo 1: Criar Conta no Supabase

1. Acesse https://supabase.com
2. Clique em "Start your project" ou "Sign Up"
3. Crie uma conta usando:
   - GitHub (recomendado)
   - Google
   - Email

## Passo 2: Criar Novo Projeto

1. Após fazer login, clique em "New Project"
2. Selecione ou crie uma "Organization"
3. Preencha os dados do projeto:
   - **Name**: CRM-Precatorios (ou nome de sua preferência)
   - **Database Password**: Crie uma senha forte (SALVE ESTA SENHA!)
   - **Region**: Escolha "South America (São Paulo)" para melhor performance no Brasil
   - **Pricing Plan**: Free (suficiente para começar)
4. Clique em "Create new project"
5. Aguarde 2-3 minutos enquanto o Supabase cria seu banco de dados

## Passo 3: Obter as Credenciais

1. No dashboard do projeto, clique em "Settings" (ícone de engrenagem na sidebar)
2. Clique em "API" no menu lateral
3. Você verá duas seções importantes:

### Project URL
```
https://seu-projeto-id.supabase.co
```
**Copie este valor!**

### Project API keys
- **anon public**: Esta é a chave que você vai usar
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
**Copie esta chave anon (pública)!**

## Passo 4: Adicionar Variáveis de Ambiente no v0

1. Na interface do v0, procure por "Vars" ou "Variables" na sidebar
2. Adicione as seguintes variáveis:

```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**IMPORTANTE**: Substitua pelos valores que você copiou no Passo 3!

## Passo 5: Executar Script SQL

1. No dashboard do Supabase, clique em "SQL Editor" na sidebar
2. Clique em "New query"
3. Copie todo o conteúdo do arquivo `scripts/01-schema-inicial.sql`
4. Cole no editor SQL
5. Clique em "Run" (ou pressione Ctrl+Enter)
6. Aguarde a execução (pode levar alguns segundos)
7. Você deve ver a mensagem "Success. No rows returned"

## Passo 6: Verificar as Tabelas

1. Clique em "Table Editor" na sidebar do Supabase
2. Você deve ver as seguintes tabelas criadas:
   - usuarios
   - precatorios
   - atividades
   - comentarios

## Passo 7: Criar Usuário Inicial (Opcional)

No SQL Editor, execute:

```sql
-- Primeiro, crie um usuário de autenticação
-- Vá em Authentication > Users > Add User
-- Email: seu@email.com
-- Password: sua-senha
-- Copie o ID gerado

-- Depois execute este SQL substituindo o UUID pelo ID do usuário criado
INSERT INTO usuarios (id, nome, email, role, ativo)
VALUES (
  'UUID-DO-USUARIO-CRIADO',
  'Seu Nome',
  'seu@email.com',
  'admin',
  true
);
```

## Passo 8: Testar a Aplicação

1. Recarregue a aplicação no v0
2. Faça login com o usuário criado
3. Agora todos os dados serão salvos no Supabase!

## Solução de Problemas

### Erro: "Invalid API key"
- Verifique se copiou a chave **anon** (não a service_role)
- Verifique se não há espaços extras nas variáveis de ambiente

### Erro: "Failed to fetch"
- Verifique se a URL está correta (deve começar com https://)
- Verifique sua conexão com a internet
- Aguarde alguns minutos se acabou de criar o projeto

### Tabelas não aparecem
- Execute novamente o script SQL
- Verifique se há erros no console do SQL Editor

### Não consigo fazer login
- Crie um usuário em Authentication > Users
- Certifique-se de inserir o registro na tabela usuarios

## Próximos Passos

Após a configuração:
- Configure Row Level Security (RLS) para maior segurança
- Configure email templates personalizados
- Adicione storage para upload de documentos PDF
- Configure backups automáticos

---

**Precisa de ajuda?** Me avise em qual passo está tendo dificuldade!
