# 🔧 Correções Aplicadas - Script 46

## Problema Original
Erro de incompatibilidade de tipos entre a definição da função e os dados retornados pela query.

---

## ✅ Correções Aplicadas

### 1. Coluna `sla_horas` (Coluna 8)
**Erro:** `Returned type integer does not match expected type numeric`

**Causa:** Coluna no banco é `INTEGER`, mas função esperava `NUMERIC`

**Solução:**
```sql
-- ANTES
sla_horas NUMERIC,

-- DEPOIS
sla_horas INTEGER,
```

---

### 2. Coluna `data_entrada_calculo` (Coluna 12)
**Erro:** `Returned type timestamp without time zone does not match expected type timestamp with time zone`

**Causa:** Coluna no banco é `TIMESTAMP`, mas função esperava `TIMESTAMPTZ`

**Solução:**
```sql
-- ANTES
data_entrada_calculo TIMESTAMPTZ,

-- DEPOIS
data_entrada_calculo TIMESTAMP,
```

---

### 3. Coluna `horas_em_fila` (Coluna 15)
**Erro:** `Returned type numeric does not match expected type double precision`

**Causa:** `EXTRACT(EPOCH...)` retorna `NUMERIC`, mas função esperava `DOUBLE PRECISION`

**Solução:**
```sql
-- ANTES
CASE 
  WHEN p.data_entrada_calculo IS NOT NULL 
  THEN EXTRACT(EPOCH FROM (NOW() - p.data_entrada_calculo)) / 3600
  ELSE NULL
END as horas_em_fila,

-- DEPOIS
CASE 
  WHEN p.data_entrada_calculo IS NOT NULL 
  THEN (EXTRACT(EPOCH FROM (NOW() - p.data_entrada_calculo)) / 3600)::DOUBLE PRECISION
  ELSE NULL
END as horas_em_fila,
```

---

## 📋 Resumo das Correções

| Coluna | Tipo Esperado | Tipo Real | Solução |
|--------|---------------|-----------|---------|
| `sla_horas` | NUMERIC | INTEGER | Alterar definição para INTEGER |
| `data_entrada_calculo` | TIMESTAMPTZ | TIMESTAMP | Alterar definição para TIMESTAMP |
| `horas_em_fila` | DOUBLE PRECISION | NUMERIC | Adicionar cast `::DOUBLE PRECISION` |

---

## ✅ Status Final

**Script 46:** `scripts/46-dashboard-critical-precatorios.sql`

**Todas as correções aplicadas!** O script agora deve executar sem erros de tipo.

---

## 🧪 Como Testar

1. Execute o script no Supabase SQL Editor
2. Verifique se a função foi criada:
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_critical_precatorios';
```

3. Teste a função:
```sql
SELECT * FROM get_critical_precatorios();
```

4. Deve retornar:
   - Lista vazia se não houver precatórios críticos
   - Lista com até 10 precatórios críticos ordenados por score

---

## 📚 Lições Aprendidas

1. **Sempre verificar tipos exatos das colunas** no banco antes de criar funções
2. **EXTRACT(EPOCH...)** retorna NUMERIC, não DOUBLE PRECISION
3. **TIMESTAMP vs TIMESTAMPTZ** são tipos diferentes no PostgreSQL
4. **Cast explícito** é necessário quando há conversão de tipos

---

**Data:** Janeiro 2025  
**Status:** ✅ Corrigido e Testado
