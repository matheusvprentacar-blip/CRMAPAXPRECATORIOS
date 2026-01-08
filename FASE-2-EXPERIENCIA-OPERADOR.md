# FASE 2 - EXPERIÊNCIA DO OPERADOR

## OBJETIVO
Dar VISIBILIDADE, CONTEXTO e HISTÓRICO para o operador de cálculo, permitindo entender rapidamente o que aconteceu, por que está parado, quem é responsável e qual o próximo passo.

---

## 1. LINHA DO TEMPO DO PRECATÓRIO (TIMELINE)

### Objetivo
Criar uma timeline INTERNA dentro do card/modal do precatório que registre automaticamente todos os eventos importantes.

### Eventos Obrigatórios

| Evento | Quando Registrar | Dados |
|--------|------------------|-------|
| Criação | Ao criar precatório | Usuário criador, data/hora |
| Inclusão na Fila | Status muda para "em_calculo" | Usuário que enviou, operador de cálculo atribuído |
| Início do Cálculo | Operador clica em "Calcular" | Operador, data/hora |
| Registro de Atraso | Operador reporta atraso | Operador, motivo, impacto |
| Retomada | Operador retoma após atraso | Operador, data/hora |
| Finalização | Cálculo concluído | Operador, data/hora, resultado |

### Estrutura de Dados

**Tabela: atividades (já existe)**
```sql
- id: UUID
- precatorio_id: UUID
- usuario_id: UUID
- tipo: TEXT (criacao, inclusao_fila, inicio_calculo, atraso, retomada, finalizacao)
- descricao: TEXT
- dados_anteriores: JSONB
- dados_novos: JSONB
- created_at: TIMESTAMP
```

### Implementação

**Componente: `components/precatorios/timeline.tsx`**
- Lista eventos em ordem cronológica (mais recente primeiro)
- Ícones diferentes por tipo de evento
- Cores por tipo de evento
- Exibe usuário responsável
- Exibe data/hora formatada
- Exibe observações quando aplicável

**Integração:**
- Adicionar timeline no modal de detalhes do precatório
- Adicionar timeline expandível no card da fila

---

## 2. MOTIVO DE ATRASO ESTRUTURADO

### Objetivo
Tornar OBRIGATÓRIO o registro estruturado do motivo quando o operador não conseguir calcular imediatamente.

### Estrutura do Motivo

**Campos:**
1. **Tipo do Motivo** (select obrigatório):
   - Titular falecido
   - Penhora identificada
   - Cessão parcial de crédito
   - Documentação incompleta
   - Dúvida jurídica
   - Aguardando informações do cliente
   - Outro

2. **Descrição** (textarea obrigatório):
   - Mínimo 10 caracteres
   - Máximo 500 caracteres

3. **Impacto Estimado** (select obrigatório):
   - Baixo (resolução em até 24h)
   - Médio (resolução em 2-5 dias)
   - Alto (resolução > 5 dias)

### Banco de Dados

**Atualizar tabela precatorios:**
```sql
ALTER TABLE precatorios 
ADD COLUMN IF NOT EXISTS tipo_atraso TEXT;

ALTER TABLE precatorios 
ADD COLUMN IF NOT EXISTS impacto_atraso TEXT;

-- Manter campos existentes:
-- motivo_atraso_calculo TEXT (já existe)
-- data_atraso_calculo TIMESTAMP (já existe)
-- registrado_atraso_por UUID (já existe)
```

### Implementação

**Atualizar: `components/calculo/modal-atraso.tsx`**
- Adicionar campo "Tipo do Motivo" (select)
- Adicionar campo "Impacto Estimado" (select)
- Validar campos obrigatórios
- Salvar no banco
- Registrar evento na timeline

**Exibição:**
- Badge visual por tipo de atraso
- Badge visual por impacto
- Exibir no card da fila
- Exibir na timeline

---

## 3. VISIBILIDADE PARA O OPERADOR

### Objetivo
O operador deve ver rapidamente quem criou, quem é responsável, há quanto tempo está em cálculo e se existe atraso.

### Informações Visíveis

**No Card da Fila de Cálculo:**
- 👤 Criado por: [Nome]
- 💼 Comercial: [Nome]
- 🧮 Cálculo: [Nome]
- 🕐 Em cálculo há: [X horas/dias]
- ⚠️ Atraso: [Tipo] - [Impacto]

**No Modal/Detalhes:**
- Todas as informações acima
- Timeline completa
- Histórico de atrasos
- Histórico de mudanças

### Implementação

**Já implementado parcialmente:**
- ✅ Nomes dos responsáveis (script 39)
- ✅ Exibição no card (CardPrecatorioCalculo)

**A implementar:**
- [ ] Cálculo de "há quanto tempo"
- [ ] Badge de tipo de atraso
- [ ] Badge de impacto
- [ ] Timeline expandível

---

## 4. COMPONENTES A CRIAR/ATUALIZAR

### Novos Componentes

1. **`components/precatorios/timeline.tsx`**
   - Timeline visual de eventos
   - Ícones por tipo de evento
   - Formatação de datas
   - Exibição de usuários

2. **`components/precatorios/timeline-event.tsx`**
   - Item individual da timeline
   - Ícone + descrição + data
   - Expandível para detalhes

3. **`components/ui/impact-badge.tsx`**
   - Badge de impacto (baixo/médio/alto)
   - Cores: verde/amarelo/vermelho

4. **`components/ui/delay-type-badge.tsx`**
   - Badge de tipo de atraso
   - Ícones específicos por tipo

### Componentes a Atualizar

5. **`components/calculo/modal-atraso.tsx`**
   - Adicionar campo "Tipo do Motivo"
   - Adicionar campo "Impacto Estimado"
   - Validação obrigatória
   - Registrar na timeline

6. **`components/calculo/card-precatorio-calculo.tsx`**
   - Adicionar badges de tipo e impacto
   - Adicionar "há quanto tempo"
   - Adicionar botão para ver timeline

---

## 5. SCRIPTS SQL NECESSÁRIOS

### Script 43: Adicionar Campos de Atraso Estruturado

```sql
-- Adicionar tipo e impacto do atraso
ALTER TABLE precatorios 
ADD COLUMN IF NOT EXISTS tipo_atraso TEXT;

ALTER TABLE precatorios 
ADD COLUMN IF NOT EXISTS impacto_atraso TEXT;

-- Atualizar view
DROP VIEW IF EXISTS precatorios_cards CASCADE;
CREATE OR REPLACE VIEW precatorios_cards AS
SELECT 
  p.*,
  -- ... campos existentes ...
  p.tipo_atraso,
  p.impacto_atraso,
  -- ... nomes de usuários ...
FROM precatorios p
-- ... joins existentes ...
WHERE p.deleted_at IS NULL;
```

### Script 44: Função para Registrar Eventos na Timeline

```sql
-- Função helper para registrar eventos
CREATE OR REPLACE FUNCTION registrar_evento_timeline(
  p_precatorio_id UUID,
  p_usuario_id UUID,
  p_tipo TEXT,
  p_descricao TEXT,
  p_dados JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_atividade_id UUID;
BEGIN
  INSERT INTO atividades (
    precatorio_id,
    usuario_id,
    tipo,
    descricao,
    dados_novos,
    created_at
  ) VALUES (
    p_precatorio_id,
    p_usuario_id,
    p_tipo,
    p_descricao,
    p_dados,
    NOW()
  )
  RETURNING id INTO v_atividade_id;
  
  RETURN v_atividade_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 6. FLUXO DE IMPLEMENTAÇÃO

### Passo 1: Banco de Dados
1. Executar script 43 (adicionar campos)
2. Executar script 44 (função de timeline)
3. Atualizar types TypeScript

### Passo 2: Componentes Base
1. Criar `timeline.tsx`
2. Criar `timeline-event.tsx`
3. Criar `impact-badge.tsx`
4. Criar `delay-type-badge.tsx`

### Passo 3: Integração
1. Atualizar `modal-atraso.tsx`
2. Atualizar `card-precatorio-calculo.tsx`
3. Adicionar timeline no modal de detalhes

### Passo 4: Testes
1. Testar registro de atraso estruturado
2. Testar exibição da timeline
3. Testar badges de tipo e impacto
4. Validar que precatório permanece na fila

---

## 7. REGRAS DE NEGÓCIO

### Registro de Atraso
- ✅ Campos obrigatórios: tipo, descrição, impacto
- ✅ Precatório permanece na fila
- ✅ Ordem FIFO mantida
- ✅ Evento registrado na timeline
- ✅ Badge visível no card

### Timeline
- ✅ Eventos registrados automaticamente
- ✅ Ordem cronológica (mais recente primeiro)
- ✅ Exibe usuário responsável
- ✅ Exibe data/hora formatada
- ✅ Não é editável (apenas leitura)

### Visibilidade
- ✅ Informações sempre visíveis no card
- ✅ Timeline acessível via modal/expansão
- ✅ Histórico completo preservado
- ✅ Auditoria de todas as ações

---

## 8. VALIDAÇÃO

### Checklist de Validação

- [ ] Campos de atraso estruturado criados no banco
- [ ] Função de timeline criada
- [ ] Componente Timeline criado
- [ ] Badges de tipo e impacto criados
- [ ] Modal de atraso atualizado
- [ ] Card da fila atualizado
- [ ] Timeline integrada no modal de detalhes
- [ ] Eventos registrados automaticamente
- [ ] Precatório permanece na fila após atraso
- [ ] Ordem FIFO mantida
- [ ] Informações visíveis no card
- [ ] Timeline acessível e funcional

---

**Status:** Pronto para implementação
**Próximo passo:** Criar scripts SQL
