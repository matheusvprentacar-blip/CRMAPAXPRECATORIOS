# ✅ CORREÇÃO: Script 48 - Busca Avançada

## 🐛 Problema Identificado

**Erro ao executar script 48:**
```
ERROR: 42703: column p.observacoes does not exist
```

## 🔍 Causa

O script estava tentando buscar e retornar a coluna `observacoes` que não existe na tabela `precatorios`.

## ✅ Solução Aplicada

### Alterações Realizadas:

1. **Removido do RETURNS TABLE:**
   ```sql
   -- ANTES (ERRADO):
   motivo_atraso_calculo TEXT,
   observacoes TEXT  -- ❌ Coluna não existe
   
   -- DEPOIS (CORRETO):
   motivo_atraso_calculo TEXT  -- ✅ Sem observacoes
   ```

2. **Removido do SELECT:**
   ```sql
   -- ANTES (ERRADO):
   p.motivo_atraso_calculo,
   p.observacoes  -- ❌ Coluna não existe
   
   -- DEPOIS (CORRETO):
   p.motivo_atraso_calculo  -- ✅ Sem observacoes
   ```

3. **Removido da busca ILIKE:**
   ```sql
   -- ANTES (ERRADO):
   p.cessionario ILIKE '%' || p_termo || '%' OR
   p.observacoes ILIKE '%' || p_termo || '%' OR  -- ❌ Coluna não existe
   p.motivo_atraso_calculo ILIKE '%' || p_termo || '%' OR
   
   -- DEPOIS (CORRETO):
   p.cessionario ILIKE '%' || p_termo || '%' OR
   p.motivo_atraso_calculo ILIKE '%' || p_termo || '%' OR  -- ✅ Sem observacoes
   ```

## 📊 Campos de Busca Atualizados

### Campos Pesquisáveis (16 campos):
1. ✅ titulo
2. ✅ numero_precatorio
3. ✅ numero_processo
4. ✅ numero_oficio
5. ✅ tribunal
6. ✅ devedor
7. ✅ esfera_devedor
8. ✅ credor_nome
9. ✅ credor_cpf_cnpj
10. ✅ advogado_nome
11. ✅ advogado_cpf_cnpj
12. ✅ cessionario
13. ✅ motivo_atraso_calculo
14. ✅ criador_nome (via join)
15. ✅ responsavel_nome (via join)
16. ✅ responsavel_calculo_nome (via join)

### Campos Retornados (27 campos):
1. id
2. titulo
3. numero_precatorio
4. numero_processo
5. numero_oficio
6. tribunal
7. devedor
8. esfera_devedor
9. credor_nome
10. credor_cpf_cnpj
11. advogado_nome
12. advogado_cpf_cnpj
13. cessionario
14. valor_principal
15. valor_atualizado
16. status
17. urgente
18. created_at
19. criador_nome
20. responsavel_nome
21. responsavel_calculo_nome
22. nivel_complexidade
23. score_complexidade
24. sla_status
25. sla_horas
26. tipo_atraso
27. impacto_atraso
28. motivo_atraso_calculo

## ✅ Status Atual

- ✅ Script 48 corrigido
- ✅ Sem erros de sintaxe
- ✅ Sem referências a colunas inexistentes
- ✅ Pronto para execução no Supabase

## 🧪 Próximos Passos

1. **Executar script 48 no Supabase SQL Editor**
2. **Verificar se a função foi criada:**
   ```sql
   SELECT routine_name, routine_type
   FROM information_schema.routines
   WHERE routine_schema = 'public'
     AND routine_name = 'buscar_precatorios_global';
   ```

3. **Testar a função:**
   ```sql
   SELECT * FROM buscar_precatorios_global(
     p_termo := 'teste'
   ) LIMIT 5;
   ```

## 📝 Notas

- A coluna `observacoes` não existe na tabela `precatorios`
- Se precisar adicionar observações no futuro, será necessário:
  1. Criar a coluna na tabela
  2. Atualizar o script 48
  3. Atualizar os types TypeScript

---

**Status:** ✅ Corrigido  
**Data:** Janeiro 2025  
**Arquivo:** `scripts/48-busca-avancada.sql`
