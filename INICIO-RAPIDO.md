# 🚀 INÍCIO RÁPIDO - CRM Precatórios

## ⚡ 5 Minutos para Começar

### 1️⃣ Executar Scripts SQL (15 min)

Acesse o Supabase e execute **NA ORDEM**:

```
✅ scripts/40-score-complexidade.sql
✅ scripts/41-sla-calculo.sql
✅ scripts/42-atualizar-view-precatorios-cards.sql
✅ scripts/43-atraso-estruturado.sql
✅ scripts/44-funcao-timeline.sql
✅ scripts/45-atualizar-constraint-atividades.sql
✅ scripts/46-dashboard-critical-precatorios.sql
```

**Como executar:**
1. Abra https://supabase.com/dashboard
2. Vá em SQL Editor > New query
3. Copie e cole cada script
4. Clique em "Run"
5. Aguarde "Success"

---

### 2️⃣ Iniciar Servidor (1 min)

```bash
npm run dev
```

Acesse: http://localhost:3000

---

### 3️⃣ Testar Funcionalidades (5 min)

#### Login
- Faça login com seu usuário
- Verifique se o dashboard carrega

#### Dashboard (/dashboard)
- ✅ Bloco 1: Visão por Complexidade
- ✅ Bloco 2: Gargalos por Atraso
- ✅ Bloco 3: Performance Operacional
- ✅ Bloco 4: Distribuição por Operador
- ✅ Bloco 5: Precatórios Críticos

#### Fila de Cálculo (/calculo)
- ✅ Badges de complexidade
- ✅ Indicadores de SLA
- ✅ Botão "Reportar Atraso"
- ✅ Identificação de responsáveis

#### Detalhes do Precatório (/precatorios/[id])
- ✅ Timeline de eventos
- ✅ Badges de atraso
- ✅ Informações completas

---

## 📊 O Que Você Verá

### Dashboard Estratégico
```
┌─────────────────────────────────────────┐
│  Dashboard Estratégico        [Atualizar]│
├─────────────────────────────────────────┤
│                                         │
│  📊 Visão por Complexidade              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │Baixa │ │Média │ │ Alta │ │Total │  │
│  │  15  │ │  8   │ │  3   │ │  26  │  │
│  │ 58%  │ │ 31%  │ │ 11%  │ │      │  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
│                                         │
│  ⚡ Performance Operacional              │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐│
│  │Tempo Fila│ │Tempo Fin.│ │SLA Est. ││
│  │  18.5h   │ │  32.2h   │ │    2    ││
│  └──────────┘ └──────────┘ └─────────┘│
│                                         │
│  🚧 Gargalos por Motivo de Atraso       │
│  ┌─────────────────────────────────────┐│
│  │ Motivo              Total  SLA  %   ││
│  │ Doc. Incompleta       5     2   45% ││
│  │ Aguardando Cliente    3     1   27% ││
│  │ Dúvida Jurídica       2     0   18% ││
│  └─────────────────────────────────────┘│
│                                         │
│  👥 Distribuição por Operador           │
│  ┌─────────────────────────────────────┐│
│  │ Operador    Cálculo  Fin.  Atraso   ││
│  │ João Silva     3      12     1       ││
│  │ Maria Santos   5       8     2       ││
│  └─────────────────────────────────────┘│
│                                         │
│  🔴 Precatórios Críticos                │
│  ┌─────────────────────────────────────┐│
│  │ 🔴 Precatório #12345                ││
│  │ Score: 85/100                       ││
│  │ 🔴 Alta | 🔴 Atrasado | 🔴 Alto    ││
│  │ Responsável: João Silva             ││
│  │ Tempo em fila: 48.5h                ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

---

## 🎯 Principais Funcionalidades

### FASE 1: Inteligência Operacional
✅ **Score de Complexidade (0-100)**
- Cálculo automático baseado em 6 critérios
- Classificação em 3 níveis (Baixa/Média/Alta)
- Badge visual colorido

✅ **SLA de Cálculo**
- Prazo baseado na complexidade
- 5 status visuais
- Alertas automáticos

### FASE 2: Experiência do Operador
✅ **Timeline de Eventos**
- 9 tipos de eventos rastreados
- Automático + manual
- Ícones coloridos

✅ **Atraso Estruturado**
- 7 tipos de atraso
- 3 níveis de impacto
- Sugestões contextuais

### FASE 3: Dashboard Estratégico
✅ **5 Blocos de Métricas**
- Complexidade
- Gargalos
- Performance
- Operadores
- Críticos

---

## 🔍 Verificação Rápida

### Banco de Dados
Execute no SQL Editor:

```sql
-- Verificar colunas criadas
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'precatorios' 
AND column_name IN ('score_complexidade', 'nivel_complexidade', 'sla_status', 'tipo_atraso');

-- Verificar funções criadas
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%complexidade%' OR routine_name LIKE '%sla%';

-- Testar função de críticos
SELECT * FROM get_critical_precatorios();
```

**Resultado esperado:**
- ✅ 4 colunas encontradas
- ✅ 2+ funções encontradas
- ✅ Função retorna dados (ou vazio se não houver críticos)

---

## 📱 Teste em Diferentes Dispositivos

### Desktop (> 1024px)
- Dashboard com grid 3-4 colunas
- Tabelas full-width
- Todos os detalhes visíveis

### Tablet (768px - 1024px)
- Dashboard com grid 2 colunas
- Tabelas responsivas
- Scroll horizontal se necessário

### Mobile (< 768px)
- Cards empilhados verticalmente
- Tabelas com scroll
- Badges redimensionados

---

## 🐛 Problemas Comuns

### Dashboard não carrega
**Solução:**
1. Verificar se script 46 foi executado
2. Abrir console do navegador (F12)
3. Verificar erros em vermelho
4. Verificar conexão com Supabase

### Badges não aparecem
**Solução:**
1. Verificar se scripts 40-42 foram executados
2. Verificar se precatórios têm dados
3. Limpar cache do navegador (Ctrl+Shift+R)

### Timeline vazia
**Solução:**
1. Verificar se script 44 foi executado
2. Criar um evento manualmente
3. Verificar tabela atividades no Supabase

### Métricas zeradas
**Solução:**
1. Verificar se há precatórios no banco
2. Verificar filtro deleted_at IS NULL
3. Criar precatórios de teste

---

## 📚 Documentação Completa

Para mais detalhes, consulte:

- `GUIA-EXECUTAR-SCRIPTS-SQL.md` - Passo a passo SQL
- `RESUMO-EXECUTIVO.md` - Visão geral do projeto
- `IMPLEMENTACAO-COMPLETA-FASES-1-2-3.md` - Detalhes técnicos
- `FASE-1-INTELIGENCIA-OPERACIONAL.md` - Especificação FASE 1
- `FASE-2-EXPERIENCIA-OPERADOR.md` - Especificação FASE 2
- `FASE-3-DASHBOARD-ESTRATEGICO.md` - Especificação FASE 3

---

## ✅ Checklist de Validação

### Banco de Dados
- [ ] 7 scripts SQL executados
- [ ] Colunas criadas verificadas
- [ ] Funções criadas verificadas
- [ ] Triggers funcionando

### Interface
- [ ] Dashboard carrega sem erros
- [ ] 5 blocos visíveis
- [ ] Badges coloridos aparecem
- [ ] Timeline funciona
- [ ] Modal de atraso abre

### Funcionalidades
- [ ] Score calculado automaticamente
- [ ] SLA atualiza em tempo real
- [ ] Timeline registra eventos
- [ ] Atraso pode ser reportado
- [ ] Dashboard atualiza ao clicar em "Atualizar"

### Responsividade
- [ ] Desktop funciona
- [ ] Tablet funciona
- [ ] Mobile funciona

---

## 🎉 Pronto!

Se todos os itens acima estão ✅, o sistema está **100% funcional**!

**Próximos passos:**
1. Criar precatórios de teste
2. Testar fluxo completo
3. Coletar feedback dos usuários
4. Ajustar conforme necessário

---

## 📞 Suporte

**Dúvidas?** Consulte a documentação completa ou entre em contato.

**Bugs?** Abra uma issue com:
- Descrição do problema
- Passos para reproduzir
- Screenshot (se aplicável)
- Console do navegador (F12)

---

**Boa sorte! 🚀**

---

**Documento criado em:** Janeiro 2025  
**Versão:** 1.0  
**Tempo estimado:** 20 minutos
