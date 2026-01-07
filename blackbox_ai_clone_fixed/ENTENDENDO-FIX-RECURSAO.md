# Entendendo a Correção da Recursão Infinita

## O Problema

O erro "infinite recursion detected in policy" acontecia porque:

1. A função `is_admin()` consultava a tabela `usuarios` para verificar o role
2. A policy da tabela `usuarios` usava a função `is_admin()`
3. Quando tentava consultar `usuarios`, precisava executar a policy
4. A policy chamava `is_admin()` que tentava consultar `usuarios` novamente
5. **Loop infinito!** 🔄

## A Solução

Removemos a função `is_admin()` e substituímos por queries diretas nas policies usando subqueries:

```sql
-- ❌ ANTES (recursão infinita)
CREATE POLICY "Admin atualiza usuarios"
USING (is_admin());  -- is_admin() consulta usuarios → loop!

-- ✅ DEPOIS (sem recursão)
CREATE POLICY "Admin atualiza usuarios"
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

## Policies Criadas

### USUARIOS
- **SELECT**: Todos usuários autenticados veem todos os usuários
- **UPDATE**: Usuário atualiza próprio perfil OU admin atualiza qualquer um
- **INSERT**: Qualquer usuário autenticado pode inserir
- **DELETE**: Apenas admin pode deletar

### PROPOSTAS
- **SELECT**: Todos veem todas as propostas
- **UPDATE**: Criador ou admin pode atualizar
- **DELETE**: Apenas admin pode deletar

### NOTIFICACOES
- **SELECT**: Usuário vê próprias notificações OU admin vê todas
- **UPDATE**: Usuário atualiza próprias notificações
- **DELETE**: Apenas admin pode deletar

## Execute o Script

```bash
scripts/15-fix-todas-policies-sem-recursao.sql
```

Após executar, faça logout e login novamente para as novas policies entrarem em vigor.
