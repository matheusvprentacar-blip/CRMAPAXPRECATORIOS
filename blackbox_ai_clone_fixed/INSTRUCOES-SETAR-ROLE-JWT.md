# Como Configurar Role no JWT (App Metadata)

## Problema que isso resolve
- ✅ Elimina recursão infinita em RLS policies
- ✅ Policies checam JWT em vez de consultar tabela usuarios
- ✅ Performance melhor (sem queries extras)

## Passo a passo para usuários existentes

### 1. Acesse Supabase Dashboard
https://supabase.com/dashboard/project/[SEU_PROJECT_ID]

### 2. Vá para Authentication > Users

### 3. Para cada usuário, clique em "Edit user" (ícone de 3 pontinhos)

### 4. Na seção "User Metadata", localize "App metadata"

### 5. Adicione o JSON com o role:

**Para Admin:**
```json
{
  "role": "admin"
}
```

**Para Operador Comercial:**
```json
{
  "role": "operador_comercial"
}
```

**Para Operador de Cálculo:**
```json
{
  "role": "operador_calculo"
}
```

**Para Operador Genérico:**
```json
{
  "role": "operador"
}
```

### 6. Clique em "Save"

### 7. Usuário deve fazer LOGOUT e LOGIN novamente
O JWT é renovado no login e incluirá o app_metadata.role

## Para novos usuários

O código já foi atualizado para setar automaticamente o `app_metadata.role` ao criar usuários pelo admin.

Ver arquivo: `app/(dashboard)/admin/usuarios/actions.ts`

## Como verificar se está funcionando

No console do navegador (após login):
```javascript
const { data: { session } } = await supabase.auth.getSession()
console.log(session.user.app_metadata.role) // deve mostrar o role
```

## Roles disponíveis no sistema
- `admin` - Acesso total
- `operador_comercial` - Gerencia seus próprios precatórios
- `operador_calculo` - Acessa precatórios atribuídos para cálculo
- `operador` - Operador genérico
- `analista` - Analista
- `gestor` - Gestor
