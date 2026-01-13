# Debug de Múltiplas Roles - Guia de Testes

Execute os seguintes testes e copie TODOS os logs do console:

## 1. Refresh da Página Principal
1. Abra o console do navegador (F12)
2. Vá para `/dashboard`
3. Copie todos os logs que começam com `[AUTH]` e `[LAYOUT]`

## 2. Navegação
1. Tente acessar cada item do menu
2. Copie os logs de erro que aparecerem

## 3. Verificar Role no Banco
Execute no Supabase:
```sql
SELECT id, nome, email, role, 
       pg_typeof(role) as tipo_coluna,
       array_length(role, 1) as num_roles
FROM usuarios
WHERE email = 'seu@email.com';
```

## 4. Páginas Principais para Testar
- `/dashboard` - Dashboard principal
- `/precatorios` - Lista de precatórios
- `/kanban` - Kanban
- `/gestao-certidoes` - Gestão de certidões
- `/gestao-oficios` - Gestão de ofícios

## Logs Esperados
Você deve ver:
```
[AUTH] Profile carregado: {
  role: ["admin"],  // ou ["admin", "operador_calculo"]
  roleType: "object",
  isArray: true,
  roleLength: 1 ou 2
}

[LAYOUT] Verificando acesso ao item: {
  item: "Dashboard",
  requiredRoles: ["admin", ...],
  userRoles: ["admin"],
  hasAccess: true
}
```

## Erros Comuns para Identificar
- ❌ `role.replace is not a function` → role sendo tratado como string
- ❌ `role.includes is not a function` → role não é array
- ❌ `Cannot read property 'includes' of undefined` → role é null/undefined
- ❌ TypeScript errors sobre tipos incompatíveis

**Copie TODOS os erros e logs e envie de uma vez!**
