# 🔄 Instruções: Executar Script 74 Atualizado

## 📋 O Que Foi Adicionado

O script `74-fix-atividades-tipo-check.sql` foi atualizado para incluir o novo tipo de atividade:

```sql
'refazer_calculo'  -- ⭐ NOVO
```

Este tipo é necessário para registrar quando um operador reseta um cálculo para refazê-lo.

---

## 🎯 Por Que Executar Novamente

Você já executou o script 74 anteriormente, mas agora ele foi atualizado com um tipo adicional. É necessário executá-lo novamente para adicionar o tipo `refazer_calculo` ao constraint.

---

## 📝 Passo a Passo

### **1. Acessar o SQL Editor do Supabase**

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Clique em **"SQL Editor"** no menu lateral
4. Clique em **"New query"**

---

### **2. Copiar e Colar o Script**

Copie TODO o conteúdo do arquivo:
```
scripts/74-fix-atividades-tipo-check.sql
```

Cole no editor SQL do Supabase.

---

### **3. Executar o Script**

1. Clique no botão **"Run"** (ou pressione `Ctrl+Enter`)
2. Aguarde a execução (alguns segundos)
3. Você deve ver: **"Success. No rows returned"**

---

### **4. Verificar o Resultado**

O script mostra automaticamente o constraint atualizado. Você deve ver algo como:

```
constraint_name: atividades_tipo_check
constraint_definition: CHECK (tipo IN ('criacao', 'mudanca_status', ..., 'mudanca_sla', 'refazer_calculo'))
```

---

## ✅ Confirmação

Após executar o script, o constraint terá **23 tipos** (anteriormente tinha 22):

1. criacao
2. mudanca_status
3. comentario
4. anexo
5. calculo
6. proposta
7. negociacao
8. aprovacao
9. rejeicao
10. envio_calculo
11. conclusao_calculo
12. upload_pdf
13. anexo_pdf
14. exclusao
15. edicao
16. atribuicao
17. reatribuicao
18. urgente
19. atraso
20. sla_status_anterior
21. sla_status_atual
22. mudanca_sla
23. **refazer_calculo** ⭐ NOVO

---

## 🎯 O Que Isso Permite

Com o tipo `refazer_calculo` adicionado, o sistema agora pode:

✅ Registrar quando um operador reseta um cálculo  
✅ Rastrear no histórico de atividades  
✅ Evitar erros de constraint violation  
✅ Manter auditoria completa  

---

## 🚨 Importante

- **Não pule este passo!** Sem executar o script, o botão "Realizar Cálculo Novamente" causará erro ao tentar registrar a atividade.
- O script é **idempotente** (pode ser executado múltiplas vezes sem problemas)
- Ele primeiro **remove** o constraint antigo e depois **recria** com todos os tipos

---

## 🧪 Testar Após Executar

1. Acesse a página de cálculo: `/calcular?id={precatorio_id}`
2. Se houver cálculo salvo, você verá o botão **"Realizar Cálculo Novamente"**
3. Clique no botão
4. Confirme no modal
5. O cálculo deve ser resetado com sucesso
6. Verifique no histórico de atividades se aparece "Cálculo resetado para ser refeito"

---

## 📊 Logs Esperados

No console do navegador, você deve ver:

```
🔄 [REFAZER] Iniciando reset do cálculo para: {id}
✅ [REFAZER] Valores resetados com sucesso
✅ [REFAZER] Atividade registrada
🔄 [REFAZER] Recarregando página...
```

---

## ❌ Solução de Problemas

### **Erro: "refazer_calculo violates check constraint"**

**Causa:** Script 74 não foi executado ou não incluiu o novo tipo

**Solução:**
1. Execute o script 74 atualizado novamente
2. Verifique se o tipo `refazer_calculo` está no constraint
3. Recarregue a página e tente novamente

---

### **Erro: "Failed to insert activity"**

**Causa:** Problema de permissões ou RLS

**Solução:**
1. Verifique se o usuário está autenticado
2. Verifique as policies da tabela `atividades`
3. Tente novamente

---

## 🎉 Conclusão

Após executar o script 74 atualizado, o botão "Realizar Cálculo Novamente" estará totalmente funcional e registrará corretamente as atividades no histórico.

---

**Data:** 2024  
**Documentado por:** BLACKBOX AI  
**Status:** ✅ **PRONTO PARA EXECUÇÃO**
