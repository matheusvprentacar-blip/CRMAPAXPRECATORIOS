# ✅ PASSOS FINAIS PARA CONFIGURAR ADMIN

## 1. Execute o Script SQL
Execute `scripts/21-solucao-definitiva-rls-sem-recursao.sql` no Supabase SQL Editor.

## 2. Configure app_metadata para Usuários Existentes

### Via Supabase Dashboard:
1. Vá em **Authentication** → **Users**
2. Clique no usuário que deve ser admin
3. Clique em **Edit user**
4. Na seção **App metadata**, adicione:
```json
{
  "role": "admin"
}
```
5. Salve

### Para usuários operadores, use:
```json
{
  "role": "operador_comercial"
}
```
ou
```json
{
  "role": "operador_calculo"
}
```

## 3. Faça Logout e Login Novamente
O JWT precisa ser renovado para incluir o `app_metadata.role`.

## 4. Teste
- **Usuário comum**: Deve ver apenas o próprio perfil
- **Admin**: Deve ver todos os usuários na lista

## ⚠️ IMPORTANTE
- Novos usuários já terão `app_metadata.role` configurado automaticamente pelo código
- NUNCA crie policies que consultam a tabela `usuarios` dentro de policies da própria tabela `usuarios`
- Se precisar verificar admin em outras tabelas, use `(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`
