# ✅ CORREÇÃO FINAL - FASE 4

## 🐛 PROBLEMA ATUAL

**Erro:** `[removerDocumento] Erro: {}`

**Causa:** O script 52 ainda NÃO foi executado no Supabase!

Quando a RLS policy bloqueia uma operação, o Supabase retorna um objeto vazio `{}` em vez de uma mensagem de erro clara.

---

## 🔧 SOLUÇÃO: EXECUTAR SCRIPT 52

### Passo a Passo:

#### 1. Acessar Supabase
```
https://supabase.com/dashboard
→ Selecione seu projeto
→ Clique em "SQL Editor" (sidebar esquerda)
```

#### 2. Criar Nova Query
```
→ Clique em "New query"
→ Cole o conteúdo do arquivo abaixo
```

#### 3. Copiar Script
**Arquivo:** `scripts/52-fix-rls-delete-documentos.sql`

```sql
-- =====================================================
-- FIX: RLS Policy para Soft Delete de Documentos
-- =====================================================

-- 1. Remover policy de UPDATE antiga
DROP POLICY IF EXISTS "Atualizar próprios documentos ou admin" ON public.documentos_precatorio;
DROP POLICY IF EXISTS "Remover próprios documentos ou admin" ON public.documentos_precatorio;

-- 2. Criar policy de UPDATE unificada (permite edição E soft delete)
CREATE POLICY "Atualizar próprios documentos ou admin"
ON public.documentos_precatorio
FOR UPDATE
USING (
  -- Pode atualizar se:
  -- 1. É admin OU
  -- 2. É quem enviou o documento OU
  -- 3. Tem acesso ao precatório
  EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
  OR
  enviado_por = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.precatorios p
    WHERE p.id = documentos_precatorio.precatorio_id
      AND p.deleted_at IS NULL
      AND (
        p.criado_por = auth.uid() OR
        p.responsavel = auth.uid() OR
        p.responsavel_calculo_id = auth.uid()
      )
  )
)
WITH CHECK (
  -- Permite qualquer UPDATE (incluindo soft delete)
  EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
  OR
  enviado_por = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.precatorios p
    WHERE p.id = documentos_precatorio.precatorio_id
      AND p.deleted_at IS NULL
      AND (
        p.criado_por = auth.uid() OR
        p.responsavel = auth.uid() OR
        p.responsavel_calculo_id = auth.uid()
      )
  )
);

-- 3. Verificar policies criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'documentos_precatorio'
ORDER BY policyname;
```

#### 4. Executar
```
→ Clique em "Run" (ou Ctrl+Enter)
→ Aguarde mensagem de sucesso
```

#### 5. Verificar Resultado
Deve mostrar 3 policies:
```
1. "Anexar documentos aos precatórios acessíveis" (INSERT)
2. "Atualizar próprios documentos ou admin" (UPDATE) ← NOVA
3. "Ver documentos dos precatórios acessíveis" (SELECT)
```

---

## ✅ APÓS EXECUTAR

### Teste Novamente:

1. Recarregue a página do precatório
2. Vá na tab "Documentos"
3. Clique em "Remover" em um documento
4. ✅ **Deve funcionar sem erro!**

---

## 📊 CHECKLIST FINAL

### Backend (Supabase):
- [x] Script 48 - Busca avançada ✅
- [x] Script 49 - Tabela documentos ✅
- [x] Script 50 - Funções storage ✅
- [x] Script 51 - Policies storage ✅
- [ ] **Script 52 - Fix RLS delete** ⚠️ EXECUTAR AGORA

### Frontend (Código):
- [x] 18 arquivos TypeScript ✅
- [x] Dependências instaladas ✅
- [x] Integração na página ✅
- [x] Next.js 15 compatível ✅

### Funcionalidades:
- [x] Upload de documentos ✅
- [x] Download de documentos ✅
- [x] Checklist visual ✅
- [x] Validações completas ✅
- [ ] **Exclusão de documentos** ⚠️ Aguardando script 52

---

## 🎯 RESUMO

**Status Atual:** 99% completo

**Falta:** Executar 1 script SQL (2 minutos)

**Depois:** FASE 4 100% funcional! 🎉

---

## 📝 NOTAS IMPORTANTES

### Por que o erro é vazio `{}`?

Quando uma RLS policy bloqueia uma operação no Supabase, o erro retornado é um objeto vazio. Isso é um comportamento padrão do Supabase para não expor detalhes de segurança.

### O que o script 52 faz?

1. Remove policies antigas que bloqueavam soft delete
2. Cria policy unificada que permite:
   - Editar campos normais
   - Fazer soft delete (setar `deleted_at`)
3. Mantém segurança (apenas quem tem permissão)

### É seguro?

✅ Sim! A policy verifica:
- Se é admin
- Se é quem enviou o documento
- Se tem acesso ao precatório

Apenas usuários autorizados podem excluir.

---

## 🚀 PRÓXIMOS PASSOS

### Após executar script 52:

1. **Testar exclusão** - Confirmar que funciona
2. **Testar upload** - Validar fluxo completo
3. **Testar download** - Verificar permissões
4. **Testar checklist** - Ver progresso

### Depois:

**Opção A:** Começar FASE 5 (IA de Extração)
**Opção B:** Melhorar FASE 4 (busca, filtros)
**Opção C:** Outras funcionalidades

---

## ✅ AÇÃO NECESSÁRIA

**EXECUTE O SCRIPT 52 AGORA NO SUPABASE!**

Depois disso, a FASE 4 estará 100% completa e funcional! 🎊
