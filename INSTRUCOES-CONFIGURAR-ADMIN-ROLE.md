# Instruções para Configurar Role de Admin

## Problema
O erro 403 acontece porque o JWT do usuário admin não tem o campo `role` configurado, então a policy RLS bloqueia a inserção.

## Solução Rápida

### 1. Via Supabase Dashboard (Mais Fácil)

1. Vá para **Authentication → Users**
2. Encontre seu usuário admin
3. Clique nos 3 pontinhos → **Edit user**
4. Na seção **User Metadata**, adicione:
   ```json
   {
     "role": "admin"
   }
   ```
5. Salve
6. **IMPORTANTE**: Faça logout e login no CRM para renovar o JWT

### 2. Via SQL Editor

1. Execute o script `22-verificar-e-configurar-role-admin.sql`
2. Substitua `'seu-email@example.com'` pelo seu email real
3. Substitua `'SEU_UUID_AQUI'` pelo UUID que aparecer na primeira query
4. **IMPORTANTE**: Faça logout e login no CRM para renovar o JWT

## Como Verificar se Funcionou

Abra o console do navegador (F12) e rode:
```javascript
const { data } = await (await fetch('/api/auth/session')).json()
console.log(data?.user?.app_metadata?.role) // Deve mostrar "admin"
```

## Se Ainda Não Funcionar

Verifique se a policy de INSERT está correta:
```sql
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'precatorios' 
AND policyname LIKE '%insert%';
```

A policy deve usar: `(auth.jwt() ->> 'role') = 'admin'`
