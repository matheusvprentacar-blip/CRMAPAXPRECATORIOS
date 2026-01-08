# Mapeamento: dados_calculo (JSON) → Colunas (Tabela)

## Objetivo
Este documento descreve como os valores salvos pela calculadora no campo `dados_calculo` (JSONB) são automaticamente mapeados para colunas normalizadas na tabela `public.precatorios`.

## Tabela de Mapeamento

| Coluna no Banco | Tipo | Caminhos JSON Tentados (em ordem) | Observação |
|----------------|------|-----------------------------------|------------|
| **VALORES PRINCIPAIS** |
| `valor_principal` | numeric(15,2) | `valor_principal`<br>`atualizacao.valor_principal`<br>`dados_iniciais.valor_principal` | Valor inicial do precatório |
| `valor_juros` | numeric(15,2) | `valor_juros`<br>`atualizacao.juros_calculados`<br>`atualizacao.valor_juros` | Juros calculados |
| `valor_selic` | numeric(15,2) | `valor_selic`<br>`atualizacao.selic_calculada`<br>`atualizacao.valor_selic` | Correção SELIC |
| `valor_atualizado` | numeric(15,2) | `propostas.valor_atualizado`<br>`atualizacao.valor_atualizado`<br>`atualizacao.valor_corrigido_monetariamente`<br>`valor_atualizado` | Valor principal + juros + SELIC |
| `saldo_liquido` | numeric(15,2) | `propostas.valor_liquido_credor`<br>`propostas.base_calculo_liquida`<br>`propostas.saldo_liquido`<br>`saldo_liquido` | Valor após todos os descontos |
| **PSS (Previdência)** |
| `pss_oficio_valor` | numeric(15,2) | `pss.pss_oficio_valor`<br>`pss_oficio_valor` | Valor do PSS informado no ofício |
| `pss_valor` | numeric(15,2) | **CALCULADO**: `pss_oficio_valor × (1 + juros_mora_percentual)` | PSS atualizado com juros de mora |
| **Flags PSS** |
| N/A (usado apenas no cálculo) | boolean | `pss.isento_pss`<br>`isento_pss` | Se true, `pss_valor` = 0 |
| N/A (usado apenas no cálculo) | boolean | `pss.tem_desconto_pss`<br>`tem_desconto_pss` | Se false, `pss_valor` = 0 |
| **Juros de Mora (para cálculo PSS)** |
| N/A (usado apenas no cálculo) | numeric | `juros_mora_percentual`<br>`pss.juros_mora_percentual`<br>`atualizacao.taxa_juros_moratorios` | Percentual usado para atualizar PSS |
| **IRPF** |
| `irpf_valor` | numeric(15,2) | `propostas.valor_irpf`<br>`irpf.valor_irpf`<br>`irpf_valor` | Imposto de Renda calculado |
| **HONORÁRIOS E ADIANTAMENTO** |
| `honorarios_valor` | numeric(15,2) | `propostas.honorarios`<br>`honorarios_valor`<br>`honorarios` | Honorários advocatícios |
| `adiantamento_valor` | numeric(15,2) | `adiantamento_recebido`<br>`propostas.adiantamento`<br>`adiantamento_valor` | Valor já adiantado ao credor |
| **PROPOSTAS** |
| `proposta_menor_valor` | numeric(15,2) | `propostas.menor_proposta`<br>`propostas.menorProposta`<br>`propostas.proposta_menor`<br>`proposta_menor_valor` | Valor da proposta mínima |
| `proposta_menor_percentual` | numeric(5,2) | `propostas.percentual_menor`<br>`propostas.percentualMenor`<br>`proposta_menor_percentual` | Percentual da proposta mínima |
| `proposta_maior_valor` | numeric(15,2) | `propostas.maior_proposta`<br>`propostas.maiorProposta`<br>`propostas.proposta_maior`<br>`proposta_maior_valor` | Valor da proposta máxima |
| `proposta_maior_percentual` | numeric(5,2) | `propostas.percentual_maior`<br>`propostas.percentualMaior`<br>`proposta_maior_percentual` | Percentual da proposta máxima |
| **DATAS** |
| `data_base` | date | `data_base` | Data base do cálculo |
| `data_expedicao` | date | `data_expedicao` | Data de expedição do ofício |
| `data_calculo` | date | `data_calculo` | Data em que o cálculo foi realizado |

## Regras Especiais

### PSS Atualizado
O campo `pss_valor` é **calculado automaticamente** usando a fórmula:

```
pss_valor = pss_oficio_valor × (1 + juros_mora_percentual)
```

**Condições:**
- Se `isento_pss = true` → `pss_valor = 0`
- Se `tem_desconto_pss = false` → `pss_valor = 0`
- Se `juros_mora_percentual > 1` → normalizar dividindo por 100 (ex: 2.38 → 0.0238)

### Prioridade de Valores
O trigger usa `COALESCE` para preservar valores existentes nas colunas. Isso significa:
- Se a coluna JÁ tem valor, ele é mantido (não sobrescreve)
- Se a coluna está NULL ou 0, tenta preencher do JSON

### Conversão Segura
- Números: tenta converter texto para numeric, retorna NULL se falhar
- Booleans: aceita variações (`true`, `1`, `sim`, `yes`, `t` = TRUE; `false`, `0`, `nao`, `no`, `f` = FALSE)
- Datas: tenta converter string para date, ignora erro se falhar

## Queries de Diagnóstico

### Ver estrutura da tabela
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='precatorios'
ORDER BY ordinal_position;
```

### Ver triggers ativos
```sql
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.precatorios'::regclass
AND NOT tgisinternal;
```

### Ver funções relacionadas
```sql
SELECT proname, oidvectortypes(proargtypes) AS args
FROM pg_proc
JOIN pg_namespace n ON n.oid = pg_proc.pronamespace
WHERE n.nspname='public'
AND proname IN ('sync_precatorio_dados_calculo','jsonb_to_numeric','jsonb_to_boolean');
```

### Testar mapeamento em precatórios recentes
```sql
SELECT 
  id,
  titulo,
  valor_principal,
  valor_atualizado,
  saldo_liquido,
  pss_oficio_valor,
  pss_valor,
  irpf_valor,
  honorarios_valor,
  adiantamento_valor,
  proposta_menor_valor,
  proposta_menor_percentual,
  proposta_maior_valor,
  proposta_maior_percentual,
  data_base,
  data_expedicao,
  data_calculo,
  status
FROM public.precatorios
WHERE deleted_at IS NULL
  AND dados_calculo IS NOT NULL
  AND dados_calculo <> '{}'::jsonb
ORDER BY updated_at DESC
LIMIT 3;
```

## Fluxo de Trabalho

1. **Calculadora salva**: A calculadora preenche o campo `dados_calculo` com JSON estruturado
2. **Trigger dispara**: Ao UPDATE/INSERT de `dados_calculo`, o trigger `trg_sync_precatorio_dados_calculo` executa
3. **Extração**: A função `sync_precatorio_dados_calculo()` lê os valores do JSON usando múltiplos caminhos
4. **Cálculos**: PSS é calculado automaticamente com base em PSS do ofício + juros de mora
5. **Persistência**: Valores são gravados nas colunas normalizadas
6. **Exibição**: Frontend lê diretamente das colunas (não precisa parsear JSON)

## Manutenção

- **Adicionar novo campo**: Editar função `sync_precatorio_dados_calculo()` e adicionar mapeamento
- **Testar mapeamento**: Fazer UPDATE forçado: `UPDATE precatorios SET dados_calculo = dados_calculo WHERE id = 'xxx'`
- **Backfill**: Executar UPDATE em massa para recalcular todos os registros
