# 🔄 Funcionalidade: Refazer Cálculo

## 🎯 Objetivo

Permitir que o operador de cálculo reinicie o cálculo de um precatório, limpando todos os valores calculados anteriormente e resetando o visualizador de PDF.

---

## 📋 Requisitos

### **1. Botão "Realizar Cálculo Novamente"**
- ✅ Visível apenas quando há cálculo salvo
- ✅ Localização: Topo da página de cálculo
- ✅ Ícone: 🔄 (RefreshCw)
- ✅ Cor: Amarelo/Warning (indica ação destrutiva)

### **2. Confirmação Obrigatória**
- ✅ Modal de confirmação antes de executar
- ✅ Mensagem clara sobre perda de dados
- ✅ Botões: "Cancelar" e "Confirmar"

### **3. Ação de Reset**
- ✅ Limpa todos os valores calculados
- ✅ Remove PDF do visualizador
- ✅ Mantém dados básicos do precatório
- ✅ Registra atividade no histórico

---

## 🗄️ Dados a Serem Limpos

### **Campos a Resetar (NULL):**

```typescript
{
  // Valores calculados
  valor_atualizado: null,
  valor_juros: null,
  valor_multa: null,
  valor_selic: null,
  valor_honorarios: null,
  valor_irpf: null,
  valor_pss: null,
  valor_liquido: null,
  saldo_liquido: null,
  
  // Propostas
  proposta_menor_valor: null,
  proposta_menor_percentual: null,
  proposta_maior_valor: null,
  proposta_maior_percentual: null,
  
  // PDF do cálculo
  pdf_url: null,
  
  // Dados de cálculo
  data_calculo: null,
  indice_atualizacao: null,
  
  // Dados JSON
  dados_calculo: null
}
```

### **Campos a Manter:**

```typescript
{
  // Dados básicos
  id,
  titulo,
  numero_precatorio,
  numero_processo,
  numero_oficio,
  credor_nome,
  credor_cpf,
  tribunal,
  vara,
  natureza,
  valor_principal, // ⭐ MANTÉM
  
  // Responsáveis
  responsavel,
  responsavel_calculo_id,
  criado_por,
  
  // Status
  status, // Volta para "em_calculo"
  
  // Datas
  created_at,
  updated_at
}
```

---

## 🎨 Interface do Usuário

### **Botão na Página de Cálculo**

```tsx
<div className="flex justify-between items-center mb-6">
  <div>
    <h1>Calculadora de Precatórios</h1>
    <p>Calculando valores para o precatório selecionado</p>
  </div>
  
  {hasCalculation && (
    <Button
      variant="outline"
      className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
      onClick={handleRefazerCalculo}
    >
      <RefreshCw className="h-4 w-4 mr-2" />
      Realizar Cálculo Novamente
    </Button>
  )}
</div>
```

### **Modal de Confirmação**

```tsx
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>
        ⚠️ Refazer Cálculo?
      </AlertDialogTitle>
      <AlertDialogDescription>
        Esta ação irá:
        
        • Apagar todos os valores calculados anteriormente
        • Remover o PDF do visualizador
        • Resetar propostas e descontos
        
        Os dados básicos do precatório serão mantidos.
        
        Esta ação não pode ser desfeita.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction
        className="bg-yellow-600 hover:bg-yellow-700"
        onClick={confirmarRefazerCalculo}
      >
        Confirmar e Refazer
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 🔧 Implementação

### **1. Função de Reset**

**Arquivo:** `app/(dashboard)/calcular/page.tsx`

```typescript
async function handleRefazerCalculo() {
  setShowConfirmDialog(true)
}

async function confirmarRefazerCalculo() {
  try {
    const supabase = getSupabase()
    if (!supabase || !precatorioId) return

    console.log("🔄 [DEBUG] Refazendo cálculo para:", precatorioId)

    // 1. Resetar valores no banco
    const { error } = await supabase
      .from("precatorios")
      .update({
        // Valores calculados
        valor_atualizado: null,
        valor_juros: null,
        valor_multa: null,
        valor_selic: null,
        valor_honorarios: null,
        valor_irpf: null,
        valor_pss: null,
        valor_liquido: null,
        saldo_liquido: null,
        
        // Propostas
        proposta_menor_valor: null,
        proposta_menor_percentual: null,
        proposta_maior_valor: null,
        proposta_maior_percentual: null,
        
        // PDF
        pdf_url: null,
        
        // Dados de cálculo
        data_calculo: null,
        indice_atualizacao: null,
        dados_calculo: null,
        
        // Status
        status: "em_calculo",
        updated_at: new Date().toISOString()
      })
      .eq("id", precatorioId)

    if (error) {
      console.error("❌ [DEBUG] Erro ao resetar cálculo:", error)
      toast({
        title: "Erro",
        description: "Não foi possível resetar o cálculo",
        variant: "destructive"
      })
      return
    }

    // 2. Registrar atividade
    await supabase.from("atividades").insert({
      precatorio_id: precatorioId,
      usuario_id: user.id,
      tipo: "refazer_calculo",
      descricao: "Cálculo resetado para ser refeito"
    })

    // 3. Recarregar página
    toast({
      title: "Cálculo Resetado",
      description: "Você pode realizar um novo cálculo agora"
    })
    
    // Recarregar dados
    setPdfUrl(null)
    setPrecatorioPdfUrl(null)
    setShowConfirmDialog(false)
    
    // Forçar reload da calculadora
    window.location.reload()

  } catch (error) {
    console.error("❌ [DEBUG] Erro ao refazer cálculo:", error)
    toast({
      title: "Erro",
      description: "Ocorreu um erro ao resetar o cálculo",
      variant: "destructive"
    })
  }
}
```

### **2. Verificar se Há Cálculo**

```typescript
const [hasCalculation, setHasCalculation] = useState(false)

useEffect(() => {
  async function checkCalculation() {
    if (!precatorioId) return
    
    const supabase = getSupabase()
    const { data } = await supabase
      .from("precatorios")
      .select("valor_atualizado, valor_liquido, pdf_url")
      .eq("id", precatorioId)
      .single()
    
    // Tem cálculo se tiver algum valor calculado ou PDF
    const temCalculo = !!(
      data?.valor_atualizado || 
      data?.valor_liquido || 
      data?.pdf_url
    )
    
    setHasCalculation(temCalculo)
  }
  
  checkCalculation()
}, [precatorioId])
```

---

## 📊 Fluxo Completo

### **Cenário 1: Refazer Cálculo**

1. Operador acessa `/calcular?id={precatorio_id}`
2. Vê cálculo anterior com valores preenchidos
3. Clica em "Realizar Cálculo Novamente"
4. Modal de confirmação aparece
5. Operador lê aviso sobre perda de dados
6. Clica em "Confirmar e Refazer"
7. Sistema limpa todos os valores
8. PDF desaparece do visualizador
9. Calculadora volta ao estado inicial
10. Operador pode fazer novo cálculo

### **Cenário 2: Cancelar Refazer**

1. Operador clica em "Realizar Cálculo Novamente"
2. Modal de confirmação aparece
3. Operador clica em "Cancelar"
4. Modal fecha
5. Nada é alterado
6. Cálculo anterior permanece intacto

---

## 🔐 Permissões

### **Quem pode refazer cálculo:**
- ✅ Operador de cálculo (responsável)
- ✅ Admin

### **Quando o botão aparece:**
- ✅ Quando há valores calculados OU
- ✅ Quando há PDF anexado

---

## 📝 Atividade Registrada

```typescript
{
  tipo: 'refazer_calculo',
  descricao: 'Cálculo resetado para ser refeito',
  metadata: {
    valores_anteriores: {
      valor_atualizado: 100000,
      valor_liquido: 85000,
      tinha_pdf: true
    }
  }
}
```

---

## ⚠️ Avisos Importantes

### **No Modal de Confirmação:**

```
⚠️ ATENÇÃO

Esta ação irá apagar permanentemente:

✗ Todos os valores calculados
✗ Propostas (menor e maior)
✗ Descontos (IRPF, PSS)
✗ PDF do visualizador
✗ Dados de atualização monetária

✓ Dados básicos serão mantidos
✓ Valor principal será mantido
✓ Responsáveis serão mantidos

Esta ação NÃO pode ser desfeita!
```

---

## 🎯 Benefícios

1. **Flexibilidade:** Permite corrigir erros de cálculo
2. **Limpeza:** Remove dados antigos completamente
3. **Segurança:** Confirmação obrigatória
4. **Rastreabilidade:** Registra no histórico
5. **Clareza:** Aviso explícito sobre perda de dados

---

## 📋 Checklist de Implementação

- [ ] Adicionar botão "Realizar Cálculo Novamente"
- [ ] Criar modal de confirmação
- [ ] Implementar função `confirmarRefazerCalculo()`
- [ ] Verificar se há cálculo (`hasCalculation`)
- [ ] Resetar valores no banco
- [ ] Remover PDF do visualizador
- [ ] Registrar atividade
- [ ] Recarregar página
- [ ] Testar fluxo completo
- [ ] Adicionar tipo `refazer_calculo` ao constraint

---

## 🔄 Atualização do Constraint

**Adicionar ao Script 74:**

```sql
ALTER TABLE public.atividades
DROP CONSTRAINT IF EXISTS atividades_tipo_check;

ALTER TABLE public.atividades
ADD CONSTRAINT atividades_tipo_check 
CHECK (tipo IN (
  -- ... tipos existentes ...
  'mudanca_sla',
  'refazer_calculo'  -- ⭐ NOVO
));
```

---

**Data:** 2024  
**Documentado por:** BLACKBOX AI  
**Status:** 📝 **PLANEJADO - AGUARDANDO IMPLEMENTAÇÃO**
