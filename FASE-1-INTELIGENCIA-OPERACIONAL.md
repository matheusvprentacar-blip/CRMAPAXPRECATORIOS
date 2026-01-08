# FASE 1 - INTELIGÊNCIA OPERACIONAL

## OBJETIVO
Adicionar inteligência ao sistema para identificar complexidade e medir performance operacional.

---

## 1. SCORE DE COMPLEXIDADE DO PRECATÓRIO

### Critérios de Cálculo (Pontuação)

| Critério | Pontos | Campo no Banco |
|----------|--------|----------------|
| Titular falecido | +30 | `titular_falecido = true` |
| Valor > R$ 1.000.000 | +25 | `valor_atualizado > 1000000` |
| Valor > R$ 500.000 | +15 | `valor_atualizado > 500000` |
| Cessão de crédito | +20 | `cessionario IS NOT NULL` |
| Múltiplos descontos (PSS + IRPF) | +15 | `pss_valor > 0 AND irpf_valor > 0` |
| Honorários > 20% | +10 | `honorarios_percentual > 20` |
| Processo sem número | +10 | `numero_processo IS NULL` |
| Sem data base | +10 | `data_base IS NULL` |

### Classificação Final

- **0-30 pontos**: Baixa Complexidade (Verde)
- **31-60 pontos**: Média Complexidade (Amarelo)
- **61+ pontos**: Alta Complexidade (Vermelho)

### Implementação

**Banco de Dados:**
```sql
-- Adicionar coluna para armazenar o score
ALTER TABLE precatorios ADD COLUMN score_complexidade INTEGER DEFAULT 0;
ALTER TABLE precatorios ADD COLUMN nivel_complexidade TEXT DEFAULT 'baixa';

-- Criar função para calcular score
CREATE OR REPLACE FUNCTION calcular_score_complexidade(precatorio_id UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  prec RECORD;
BEGIN
  SELECT * INTO prec FROM precatorios WHERE id = precatorio_id;
  
  -- Titular falecido
  IF prec.titular_falecido THEN score := score + 30; END IF;
  
  -- Valor alto
  IF prec.valor_atualizado > 1000000 THEN score := score + 25;
  ELSIF prec.valor_atualizado > 500000 THEN score := score + 15;
  END IF;
  
  -- Cessão de crédito
  IF prec.cessionario IS NOT NULL AND prec.cessionario != '' THEN score := score + 20; END IF;
  
  -- Múltiplos descontos
  IF prec.pss_valor > 0 AND prec.irpf_valor > 0 THEN score := score + 15; END IF;
  
  -- Honorários altos
  IF prec.honorarios_percentual > 20 THEN score := score + 10; END IF;
  
  -- Processo sem número
  IF prec.numero_processo IS NULL OR prec.numero_processo = '' THEN score := score + 10; END IF;
  
  -- Sem data base
  IF prec.data_base IS NULL THEN score := score + 10; END IF;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar automaticamente
CREATE OR REPLACE FUNCTION trigger_atualizar_score()
RETURNS TRIGGER AS $$
DECLARE
  novo_score INTEGER;
  novo_nivel TEXT;
BEGIN
  novo_score := calcular_score_complexidade(NEW.id);
  
  IF novo_score <= 30 THEN novo_nivel := 'baixa';
  ELSIF novo_score <= 60 THEN novo_nivel := 'media';
  ELSE novo_nivel := 'alta';
  END IF;
  
  NEW.score_complexidade := novo_score;
  NEW.nivel_complexidade := novo_nivel;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_score_complexidade
BEFORE INSERT OR UPDATE ON precatorios
FOR EACH ROW
EXECUTE FUNCTION trigger_atualizar_score();
```

**Frontend - Componente Badge:**
```tsx
// components/ui/complexity-badge.tsx
interface ComplexityBadgeProps {
  nivel: 'baixa' | 'media' | 'alta'
  score: number
  showScore?: boolean
}

export function ComplexityBadge({ nivel, score, showScore = false }: ComplexityBadgeProps) {
  const config = {
    baixa: { color: 'bg-green-500', label: 'Baixa', icon: '✓' },
    media: { color: 'bg-yellow-500', label: 'Média', icon: '⚠' },
    alta: { color: 'bg-red-500', label: 'Alta', icon: '⚡' }
  }
  
  const { color, label, icon } = config[nivel]
  
  return (
    <Badge className={`${color} text-white`}>
      {icon} {label}
      {showScore && ` (${score})`}
    </Badge>
  )
}
```

**Onde Exibir:**
- ✅ Cards do Kanban
- ✅ Fila de Cálculo
- ✅ Lista de Precatórios
- ✅ Detalhes do Precatório
- ✅ Dashboard (gráfico de distribuição)

---

## 2. SLA DE CÁLCULO

### Definição de SLA

- **SLA Padrão**: 48 horas (2 dias úteis)
- **SLA Urgente**: 24 horas (1 dia útil)
- **SLA Alta Complexidade**: 72 horas (3 dias úteis)

### Cálculo do SLA

```
Tempo em Cálculo = Agora - data_entrada_calculo
Status SLA:
- ✅ No Prazo: < 80% do SLA
- ⚠️ Atenção: 80-100% do SLA
- 🔴 Atrasado: > 100% do SLA
```

### Implementação

**Banco de Dados:**
```sql
-- Adicionar colunas de SLA
ALTER TABLE precatorios ADD COLUMN data_entrada_calculo TIMESTAMP;
ALTER TABLE precatorios ADD COLUMN sla_horas INTEGER DEFAULT 48;
ALTER TABLE precatorios ADD COLUMN sla_status TEXT DEFAULT 'no_prazo';

-- Função para calcular SLA
CREATE OR REPLACE FUNCTION calcular_sla_status(precatorio_id UUID)
RETURNS TEXT AS $$
DECLARE
  prec RECORD;
  horas_decorridas NUMERIC;
  percentual_sla NUMERIC;
BEGIN
  SELECT * INTO prec FROM precatorios WHERE id = precatorio_id;
  
  IF prec.data_entrada_calculo IS NULL THEN
    RETURN 'nao_iniciado';
  END IF;
  
  horas_decorridas := EXTRACT(EPOCH FROM (NOW() - prec.data_entrada_calculo)) / 3600;
  percentual_sla := (horas_decorridas / prec.sla_horas) * 100;
  
  IF percentual_sla < 80 THEN RETURN 'no_prazo';
  ELSIF percentual_sla < 100 THEN RETURN 'atencao';
  ELSE RETURN 'atrasado';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Atualizar SLA quando status muda para em_calculo
CREATE OR REPLACE FUNCTION trigger_iniciar_sla()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'em_calculo' AND OLD.status != 'em_calculo' THEN
    NEW.data_entrada_calculo := NOW();
    
    -- Definir SLA baseado em complexidade e urgência
    IF NEW.urgente THEN
      NEW.sla_horas := 24;
    ELSIF NEW.nivel_complexidade = 'alta' THEN
      NEW.sla_horas := 72;
    ELSE
      NEW.sla_horas := 48;
    END IF;
  END IF;
  
  -- Atualizar status do SLA
  NEW.sla_status := calcular_sla_status(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sla_calculo
BEFORE UPDATE ON precatorios
FOR EACH ROW
EXECUTE FUNCTION trigger_iniciar_sla();
```

**Frontend - Componente SLA:**
```tsx
// components/ui/sla-indicator.tsx
interface SLAIndicatorProps {
  dataEntrada: string
  slaHoras: number
  status: 'no_prazo' | 'atencao' | 'atrasado' | 'nao_iniciado'
}

export function SLAIndicator({ dataEntrada, slaHoras, status }: SLAIndicatorProps) {
  const horasDecorridas = calcularHorasDecorridas(dataEntrada)
  const percentual = (horasDecorridas / slaHoras) * 100
  
  const config = {
    no_prazo: { color: 'text-green-600', icon: '✓', label: 'No Prazo' },
    atencao: { color: 'text-yellow-600', icon: '⚠', label: 'Atenção' },
    atrasado: { color: 'text-red-600', icon: '🔴', label: 'Atrasado' },
    nao_iniciado: { color: 'text-gray-400', icon: '○', label: 'Não Iniciado' }
  }
  
  return (
    <div className="flex items-center gap-2">
      <span className={config[status].color}>
        {config[status].icon} {config[status].label}
      </span>
      <span className="text-sm text-muted-foreground">
        {horasDecorridas}h / {slaHoras}h ({percentual.toFixed(0)}%)
      </span>
    </div>
  )
}
```

**Onde Exibir:**
- ✅ Fila de Cálculo (destaque visual)
- ✅ Card do Precatório
- ✅ Dashboard (métricas de SLA)

---

## ARQUIVOS A CRIAR/MODIFICAR

### Scripts SQL
1. `scripts/40-score-complexidade.sql` - Score e trigger
2. `scripts/41-sla-calculo.sql` - SLA e trigger
3. `scripts/42-atualizar-view-precatorios-cards.sql` - Adicionar novos campos na view

### Componentes
1. `components/ui/complexity-badge.tsx` - Badge de complexidade
2. `components/ui/sla-indicator.tsx` - Indicador de SLA
3. `components/precatorios/complexity-details.tsx` - Detalhes do score

### Páginas a Atualizar
1. `app/(dashboard)/calculo/page.tsx` - Adicionar SLA e complexidade
2. `app/(dashboard)/kanban/page.tsx` - Adicionar badge de complexidade
3. `app/(dashboard)/precatorios/page.tsx` - Adicionar filtros por complexidade
4. `app/(dashboard)/dashboard/page.tsx` - Adicionar métricas

### Types
1. `lib/types/database.ts` - Adicionar novos campos

---

## ORDEM DE IMPLEMENTAÇÃO

1. ✅ Criar script SQL para Score de Complexidade
2. ✅ Criar script SQL para SLA
3. ✅ Atualizar view precatorios_cards
4. ✅ Atualizar types do TypeScript
5. ✅ Criar componente ComplexityBadge
6. ✅ Criar componente SLAIndicator
7. ✅ Atualizar Fila de Cálculo
8. ✅ Atualizar Kanban
9. ✅ Atualizar Dashboard
10. ✅ Testar tudo

---

## VALIDAÇÃO

Após implementar, validar:
- [ ] Score é calculado automaticamente ao criar/editar precatório
- [ ] Badge de complexidade aparece em todos os lugares
- [ ] SLA inicia quando status muda para "em_calculo"
- [ ] Indicador de SLA atualiza em tempo real
- [ ] Dashboard mostra distribuição por complexidade
- [ ] Dashboard mostra métricas de SLA

---

**Status:** Pronto para implementação
**Próximo passo:** Criar scripts SQL
