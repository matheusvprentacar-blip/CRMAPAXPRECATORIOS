# 🚀 GUIA RÁPIDO: Executar Scripts SQL no Supabase

## 📋 Ordem de Execução

Execute os scripts **NESTA ORDEM EXATA** para garantir que todas as dependências sejam atendidas:

### FASE 1: Inteligência Operacional
1. ✅ `scripts/40-score-complexidade.sql` - Score e nível de complexidade
2. ✅ `scripts/41-sla-calculo.sql` - SLA de cálculo
3. ✅ `scripts/42-atualizar-view-precatorios-cards.sql` - Atualizar view

### FASE 2: Experiência do Operador
4. ✅ `scripts/43-atraso-estruturado.sql` - Tipo e impacto de atraso
5. ✅ `scripts/44-funcao-timeline.sql` - Timeline e triggers
6. ✅ `scripts/45-atualizar-constraint-atividades.sql` - Constraint de atividades

### FASE 3: Dashboard Estratégico
7. ✅ `scripts/46-dashboard-critical-precatorios.sql` - Função RPC para críticos

### COMPLEMENTAR: Timeline de SLA
8. ✅ `scripts/47-timeline-sla.sql` - Eventos de SLA na timeline

---

## 🔧 Como Executar

### Passo a Passo

1. **Acesse o Supabase:**
   - Vá para https://supabase.com/dashboard
   - Faça login na sua conta
   - Selecione o projeto "CRM-Precatorios"

2. **Abra o SQL Editor:**
   - No menu lateral esquerdo, clique em **"SQL Editor"**
   - Clique em **"New query"**

3. **Execute Cada Script:**
   
   **Para cada script na ordem:**
   
   a) Abra o arquivo do script no VS Code
   
   b) Copie **TODO O CONTEÚDO** do arquivo (Ctrl+A, Ctrl+C)
   
   c) Cole no SQL Editor do Supabase (Ctrl+V)
   
   d) Clique em **"Run"** (ou pressione Ctrl+Enter)
   
   e) **AGUARDE** a mensagem de sucesso:
      - ✅ "Success. No rows returned" (para DDL)
      - ✅ "Success. X rows returned" (para queries de teste)
   
   f) **VERIFIQUE** se não há erros em vermelho
   
   g) **PROSSIGA** para o próximo script

4. **Verificação Final:**
   - Após executar todos os scripts, execute este comando de verificação:

```sql
-- Verificar se todas as colunas foram criadas
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'precatorios' 
  AND column_name IN (
    'score_complexidade',
    'nivel_complexidade',
    'data_entrada_calculo',
    'sla_horas',
    'sla_status',
    'tipo_atraso',
    'impacto_atraso'
  )
ORDER BY column_name;

-- Verificar se as funções foram criadas
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'calcular_score_complexidade',
    'calcular_sla',
    'registrar_evento_timeline',
    'get_critical_precatorios'
  )
ORDER BY routine_name;

-- Verificar se as views foram criadas
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'precatorios_cards',
    'metricas_sla',
    'timeline_precatorios'
  )
ORDER BY table_name;
```

---

## ✅ Checklist de Execução

### FASE 1
- [ ] Script 40 executado com sucesso
- [ ] Script 41 executado com sucesso
- [ ] Script 42 executado com sucesso
- [ ] Colunas criadas: score_complexidade, nivel_complexidade
- [ ] Colunas criadas: data_entrada_calculo, sla_horas, sla_status
- [ ] View precatorios_cards atualizada
- [ ] Função calcular_score_complexidade criada
- [ ] Função calcular_sla criada
- [ ] Triggers criados e funcionando

### FASE 2
- [ ] Script 43 executado com sucesso
- [ ] Script 44 executado com sucesso
- [ ] Script 45 executado com sucesso
- [ ] Colunas criadas: tipo_atraso, impacto_atraso
- [ ] Função registrar_evento_timeline criada
- [ ] View timeline_precatorios criada
- [ ] Triggers de timeline criados
- [ ] Constraint de atividades atualizada

### FASE 3
- [ ] Script 46 executado com sucesso
- [ ] Função get_critical_precatorios criada
- [ ] Função testada e retornando dados

---

## 🐛 Problemas Comuns

### Erro: "relation already exists"
**Causa:** Você já executou este script antes.

**Solução:**
1. Verifique se a coluna/função já existe
2. Se sim, pule para o próximo script
3. Se não, execute o comando DROP antes de recriar

### Erro: "permission denied"
**Causa:** Você não tem permissões suficientes.

**Solução:**
1. Verifique se está usando a conta correta
2. Verifique se é o owner do projeto
3. Entre em contato com o administrador

### Erro: "syntax error"
**Causa:** Código SQL copiado incorretamente.

**Solução:**
1. Copie novamente TODO o conteúdo do arquivo
2. Certifique-se de não ter caracteres extras
3. Execute novamente

### Erro: "column does not exist"
**Causa:** Scripts executados fora de ordem.

**Solução:**
1. Volte e execute os scripts anteriores
2. Siga a ordem exata especificada

---

## 🧪 Testes Após Execução

### Teste 1: Score de Complexidade
```sql
-- Deve retornar precatórios com score e nível
SELECT 
  id,
  titulo,
  score_complexidade,
  nivel_complexidade
FROM precatorios
WHERE deleted_at IS NULL
LIMIT 5;
```

### Teste 2: SLA de Cálculo
```sql
-- Deve retornar precatórios com SLA
SELECT 
  id,
  titulo,
  status,
  data_entrada_calculo,
  sla_horas,
  sla_status
FROM precatorios
WHERE status = 'em_calculo'
  AND deleted_at IS NULL
LIMIT 5;
```

### Teste 3: Atraso Estruturado
```sql
-- Deve retornar precatórios com atraso
SELECT 
  id,
  titulo,
  tipo_atraso,
  impacto_atraso,
  motivo_atraso_calculo
FROM precatorios
WHERE tipo_atraso IS NOT NULL
  AND deleted_at IS NULL
LIMIT 5;
```

### Teste 4: Timeline
```sql
-- Deve retornar eventos da timeline
SELECT 
  precatorio_id,
  tipo_evento,
  usuario_nome,
  created_at
FROM timeline_precatorios
ORDER BY created_at DESC
LIMIT 10;
```

### Teste 5: Precatórios Críticos
```sql
-- Deve retornar precatórios críticos com score
SELECT * FROM get_critical_precatorios();
```

---

## 📊 Resultados Esperados

### Após FASE 1
- ✅ Todos os precatórios têm score_complexidade (0-100)
- ✅ Todos os precatórios têm nivel_complexidade (baixa/media/alta)
- ✅ Precatórios em cálculo têm data_entrada_calculo
- ✅ Precatórios em cálculo têm sla_horas e sla_status

### Após FASE 2
- ✅ Precatórios com atraso têm tipo_atraso e impacto_atraso
- ✅ Timeline registra eventos automaticamente
- ✅ Triggers funcionam em mudanças de status
- ✅ View timeline_precatorios retorna dados com nomes

### Após FASE 3
- ✅ Função get_critical_precatorios() retorna até 10 precatórios
- ✅ Score de criticidade calculado corretamente
- ✅ Ordenação por criticidade funciona

---

## 🎯 Próximos Passos

Após executar todos os scripts com sucesso:

1. **Reinicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

2. **Acesse o dashboard:**
   - Faça login no sistema
   - Navegue para `/dashboard`
   - Verifique se todos os blocos carregam

3. **Teste as funcionalidades:**
   - Verifique badges de complexidade
   - Verifique indicadores de SLA
   - Verifique atraso estruturado
   - Verifique timeline
   - Verifique dashboard estratégico

4. **Reporte problemas:**
   - Anote qualquer erro
   - Tire screenshots se necessário
   - Compartilhe com a equipe

---

## 📞 Suporte

### Dúvidas Frequentes

**Q: Posso executar todos os scripts de uma vez?**
A: Não recomendado. Execute um por vez e verifique o sucesso.

**Q: O que fazer se um script falhar?**
A: Leia a mensagem de erro, corrija o problema, e execute novamente.

**Q: Posso executar os scripts em produção?**
A: Sim, mas faça backup do banco antes!

**Q: Como reverter se algo der errado?**
A: Cada script tem uma seção ROLLBACK no final com comandos DROP.

---

## ✅ Conclusão

Seguindo este guia, você terá:
- ✅ FASE 1 completa (Score + SLA)
- ✅ FASE 2 completa (Timeline + Atraso)
- ✅ FASE 3 completa (Dashboard)
- ✅ Sistema 100% funcional

**Tempo estimado:** 15-20 minutos

**Boa sorte! 🚀**

---

**Última atualização:** Janeiro 2025  
**Versão:** 1.0
