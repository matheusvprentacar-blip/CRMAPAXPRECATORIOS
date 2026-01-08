# 🕐 Timeline de SLA - Implementação Completa

## 📋 Resumo

Implementação de eventos automáticos de SLA na timeline do precatório, permitindo rastreamento completo das mudanças de status do SLA.

---

## ✨ Funcionalidades Implementadas

### 1. Trigger Automático de SLA
- Registra automaticamente mudanças de status do SLA
- Dispara quando `sla_status` muda de valor
- Inclui dados contextuais (horas, data de entrada)

### 2. Eventos Registrados

#### 🟢 SLA Iniciado ("no_prazo")
```
Descrição: "SLA iniciado - Dentro do prazo"
Quando: Precatório entra em cálculo
Dados: status anterior, novo status, horas de SLA, data de entrada
```

#### 🟡 SLA em Atenção ("atencao")
```
Descrição: "SLA em atenção - Prazo próximo do vencimento"
Quando: 75% do prazo consumido
Dados: status anterior, novo status, horas de SLA
```

#### 🔴 SLA Estourado ("atrasado")
```
Descrição: "SLA estourado - Prazo vencido"
Quando: Prazo vencido
Dados: status anterior, novo status, horas de SLA
```

#### ✅ SLA Concluído ("concluido")
```
Descrição: "SLA concluído - Cálculo finalizado"
Quando: Cálculo finalizado dentro ou fora do prazo
Dados: status anterior, novo status, horas de SLA
```

### 3. Visualização na Timeline
- Ícone: 🕐 Clock (amarelo)
- Label: "Atualização de SLA"
- Detalhes expandidos com status anterior e novo
- Formatação amigável dos status

---

## 📦 Arquivos Criados/Modificados

### Novos Arquivos (1):
1. ✅ `scripts/47-timeline-sla.sql` - Trigger e função de SLA

### Arquivos Modificados (2):
1. ✅ `components/precatorios/timeline-event.tsx` - Suporte a eventos de SLA
2. ✅ `GUIA-EXECUTAR-SCRIPTS-SQL.md` - Adicionado script 47

---

## 🔧 Implementação Técnica

### Script SQL (47)

```sql
-- Função para registrar mudanças de SLA
CREATE OR REPLACE FUNCTION trigger_registrar_mudanca_sla()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_id UUID;
  v_descricao TEXT;
  v_dados JSONB;
BEGIN
  IF NEW.sla_status IS DISTINCT FROM OLD.sla_status THEN
    v_usuario_id := COALESCE(
      NEW.responsavel_calculo_id, 
      NEW.responsavel, 
      NEW.criado_por
    );
    
    -- Descrição baseada no novo status
    CASE NEW.sla_status
      WHEN 'no_prazo' THEN
        v_descricao := 'SLA iniciado - Dentro do prazo';
      WHEN 'atencao' THEN
        v_descricao := 'SLA em atenção - Prazo próximo do vencimento';
      WHEN 'atrasado' THEN
        v_descricao := 'SLA estourado - Prazo vencido';
      WHEN 'concluido' THEN
        v_descricao := 'SLA concluído - Cálculo finalizado';
    END CASE;
    
    -- Dados do evento
    v_dados := jsonb_build_object(
      'sla_status_anterior', OLD.sla_status,
      'sla_status_novo', NEW.sla_status,
      'sla_horas', NEW.sla_horas,
      'data_entrada_calculo', NEW.data_entrada_calculo
    );
    
    -- Registrar na timeline
    PERFORM registrar_evento_timeline(
      NEW.id,
      v_usuario_id,
      'mudanca_sla',
      v_descricao,
      v_dados
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER trigger_timeline_sla
AFTER UPDATE ON precatorios
FOR EACH ROW
WHEN (OLD.sla_status IS DISTINCT FROM NEW.sla_status)
EXECUTE FUNCTION trigger_registrar_mudanca_sla();
```

### Componente React

```typescript
// Configuração do evento
mudanca_sla: {
  icon: Clock,
  color: "bg-yellow-500",
  label: "Atualização de SLA",
}

// Formatação de labels
const slaLabels: Record<string, string> = {
  nao_iniciado: "Não Iniciado",
  no_prazo: "No Prazo",
  atencao: "Atenção",
  atrasado: "Atrasado",
  concluido: "Concluído",
}
```

---

## 🎨 Visualização na Interface

### Card de Evento na Timeline

```
┌─────────────────────────────────────────────┐
│ 🕐 [Atualização de SLA] há 2 horas          │
│                                             │
│ SLA em atenção - Prazo próximo do vencimento│
│ por João Silva                              │
│                                             │
│ Detalhes:                                   │
│ • SLA Anterior: No Prazo                    │
│ • SLA Novo: Atenção                         │
│ • Prazo (horas): 48                         │
│ • Data de Entrada: 15/01/2025 10:00        │
│                                             │
│                          15/01/2025 14:30   │
└─────────────────────────────────────────────┘
```

---

## 📊 Exemplos de Uso

### Cenário 1: Precatório Entra em Cálculo
```
1. Status muda para "em_calculo"
2. Trigger do script 41 define sla_status = "no_prazo"
3. Trigger do script 47 registra evento:
   - Tipo: mudanca_sla
   - Descrição: "SLA iniciado - Dentro do prazo"
   - Dados: status NULL → no_prazo, 48 horas
```

### Cenário 2: SLA Próximo do Vencimento
```
1. Função calcular_sla() detecta 75% do prazo consumido
2. Atualiza sla_status = "atencao"
3. Trigger registra evento:
   - Tipo: mudanca_sla
   - Descrição: "SLA em atenção - Prazo próximo do vencimento"
   - Dados: status no_prazo → atencao
```

### Cenário 3: SLA Estourado
```
1. Função calcular_sla() detecta prazo vencido
2. Atualiza sla_status = "atrasado"
3. Trigger registra evento:
   - Tipo: mudanca_sla
   - Descrição: "SLA estourado - Prazo vencido"
   - Dados: status atencao → atrasado
```

### Cenário 4: Cálculo Finalizado
```
1. Operador finaliza cálculo
2. Status muda para "finalizado"
3. Função atualiza sla_status = "concluido"
4. Trigger registra evento:
   - Tipo: mudanca_sla
   - Descrição: "SLA concluído - Cálculo finalizado"
   - Dados: status atrasado → concluido
```

---

## 🧪 Como Testar

### 1. Executar Script SQL
```bash
# No Supabase SQL Editor
# Copiar e executar: scripts/47-timeline-sla.sql
```

### 2. Verificar Trigger Criado
```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_timeline_sla';
```

### 3. Simular Mudança de SLA
```sql
-- Atualizar SLA de um precatório
UPDATE precatorios
SET sla_status = 'atencao'
WHERE id = 'uuid-do-precatorio'
  AND sla_status = 'no_prazo';

-- Verificar evento criado
SELECT 
  tipo,
  descricao,
  dados_novos,
  created_at
FROM atividades
WHERE precatorio_id = 'uuid-do-precatorio'
  AND tipo = 'mudanca_sla'
ORDER BY created_at DESC
LIMIT 1;
```

### 4. Visualizar na Interface
```
1. Acesse /precatorios/[id]
2. Role até a seção "Timeline"
3. Verifique eventos de SLA com ícone 🕐
4. Expanda detalhes para ver status anterior e novo
```

---

## 📈 Benefícios

### Para Operadores
- ✅ Rastreamento completo do SLA
- ✅ Visibilidade de quando o prazo mudou
- ✅ Histórico de alertas de atenção
- ✅ Evidência de quando SLA estourou

### Para Gestores
- ✅ Auditoria completa de prazos
- ✅ Identificação de padrões de atraso
- ✅ Métricas de cumprimento de SLA
- ✅ Dados para análise de performance

### Para o Sistema
- ✅ Registro automático (sem intervenção manual)
- ✅ Dados estruturados (JSON)
- ✅ Integração com timeline existente
- ✅ Performance otimizada (trigger eficiente)

---

## 🔗 Integração com Outras Funcionalidades

### FASE 1 - SLA de Cálculo
- Trigger depende do script 41 (sla_status)
- Usa função calcular_sla() existente
- Complementa indicadores visuais de SLA

### FASE 2 - Timeline
- Usa função registrar_evento_timeline() do script 44
- Integra com view timeline_precatorios
- Exibido no componente Timeline

### FASE 3 - Dashboard
- Eventos de SLA alimentam métricas
- Dados usados em análise de performance
- Histórico disponível para relatórios

---

## ✅ Checklist de Implementação

- [x] Script SQL 47 criado
- [x] Função trigger_registrar_mudanca_sla() implementada
- [x] Trigger trigger_timeline_sla criado
- [x] Componente timeline-event.tsx atualizado
- [x] Ícone Clock adicionado
- [x] Formatação de status SLA implementada
- [x] Labels traduzidos para português
- [x] Guia de execução atualizado
- [x] Documentação completa criada
- [x] Exemplos de uso documentados

---

## 🚀 Próximos Passos

1. **Executar Script 47:**
   ```bash
   # No Supabase SQL Editor
   # Copiar e executar: scripts/47-timeline-sla.sql
   ```

2. **Testar Funcionalidade:**
   - Criar precatório de teste
   - Enviar para cálculo (SLA inicia)
   - Aguardar mudança de status
   - Verificar eventos na timeline

3. **Validar Integração:**
   - Verificar todos os tipos de mudança de SLA
   - Confirmar dados corretos nos eventos
   - Testar visualização na interface

---

## 📚 Documentação Relacionada

- `FASE-1-INTELIGENCIA-OPERACIONAL.md` - SLA de Cálculo
- `FASE-2-EXPERIENCIA-OPERADOR.md` - Timeline
- `scripts/41-sla-calculo.sql` - Implementação do SLA
- `scripts/44-funcao-timeline.sql` - Função de timeline
- `components/precatorios/timeline.tsx` - Componente de timeline

---

**Status:** ✅ Implementado e Pronto para Uso  
**Data:** Janeiro 2025  
**Versão:** 1.0  
**Dependências:** Scripts 41, 44
