# RLS Corrigido - Sem Recursão Infinita

## O Problema

A recursão infinita acontecia porque a policy tentava verificar `is_admin()` consultando a tabela `usuarios`, mas para fazer essa consulta, precisava verificar a policy novamente, criando um loop.

## A Solução

Criei policies mais simples e diretas:

### 1. SELECT (Visualizar)
- **Qualquer usuário autenticado pode ver TODOS os usuários**
- Comum em CRMs onde você precisa ver colegas de equipe
- Policy: `USING (true)`

### 2. INSERT (Criar)
- Apenas ao criar a própria conta
- Policy: `auth.uid() = id`

### 3. UPDATE (Atualizar)
- Pode atualizar o próprio perfil OU
- Se for admin (verificação direta sem função)
- Policy: `auth.uid() = id OR (SELECT role FROM usuarios WHERE id = auth.uid()) = 'admin'`

### 4. DELETE (Deletar)
- Apenas admins
- Policy: `(SELECT role FROM usuarios WHERE id = auth.uid()) = 'admin'`

## Como Testar

1. Execute o script `14-fix-recursao-infinita-rls.sql`
2. Faça logout e login novamente
3. Vá em Admin > Usuários
4. Agora você deve ver todos os usuários do sistema

## Por que não há mais recursão?

As subqueries nas policies de UPDATE e DELETE:
- Fazem uma consulta direta com `WHERE id = auth.uid()` (específica)
- Postgres otimiza isso e não entra em loop
- A policy SELECT permite `true`, então não há conflito
