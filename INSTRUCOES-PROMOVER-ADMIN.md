# Como Promover seu Usuário para Admin

## Passo a Passo

1. **Abra o Supabase Dashboard**
   - Vá para https://supabase.com/dashboard
   - Selecione seu projeto `ldtildnelijndhswcmss`

2. **Vá para SQL Editor**
   - No menu lateral, clique em "SQL Editor"

3. **Execute o Script**
   - Abra o arquivo `scripts/09-promover-usuario-admin.sql`
   - **SUBSTITUA** `'SEU_EMAIL_AQUI'` pelo seu email de login
   - Copie e cole o script no SQL Editor
   - Clique em "RUN"

4. **Verifique o Resultado**
   - O script deve retornar uma linha com seus dados
   - A coluna `role` deve mostrar `admin`

5. **Faça Logout e Login Novamente**
   - Saia da aplicação
   - Faça login novamente
   - Agora você terá acesso total de administrador

## Exemplo

Se seu email for `joao@empresa.com`, o script ficaria:

```sql
UPDATE public.usuarios
SET role = 'admin'
WHERE email = 'joao@empresa.com';

SELECT id, email, nome, role, created_at
FROM public.usuarios
WHERE email = 'joao@empresa.com';
```

## Verificar Acesso Admin

Após fazer login novamente, você deve conseguir:
- Acessar a página "Admin > Usuários"
- Ver o botão "Criar Novo Usuário"
- Alterar roles de outros usuários
