# 📄 Funcionalidade: Upload de Ofício por Precatório

## 🎯 Objetivo

Permitir que o operador de cálculo faça upload do ofício (PDF) que ficará vinculado permanentemente ao precatório, independente de quantas vezes o cálculo for refeito.

---

## 📋 Requisitos

### **1. Upload de Ofício**
- ✅ Operador de cálculo pode fazer upload do ofício
- ✅ Um ofício por precatório
- ✅ Ofício fica salvo permanentemente
- ✅ Ofício não é perdido ao refazer cálculo

### **2. Visualização**
- ✅ Visualizador de PDF integrado
- ✅ Disponível em todas as páginas do precatório
- ✅ Botão "Ver Ofício" sempre visível quando há ofício

### **3. Substituição**
- ✅ Operador pode substituir o ofício
- ✅ Confirmação antes de substituir
- ✅ Histórico de uploads (opcional)

---

## 🗄️ Estrutura de Dados

### **Tabela `precatorios`**

Já existe o campo:
```sql
pdf_url TEXT -- URL do ofício no storage
```

### **Storage Supabase**

Bucket: `precatorios-pdf`

Estrutura de pastas:
```
precatorios-pdf/
  └── precatorios/
      └── {precatorio_id}/
          └── oficio-{timestamp}.pdf
```

---

## 🎨 Interface do Usuário

### **Página de Cálculo (`/calcular?id={precatorio_id}`)**

#### **Quando NÃO há ofício:**
```
┌─────────────────────────────────────┐
│ 📄 Ofício do Precatório             │
├─────────────────────────────────────┤
│                                     │
│  Nenhum ofício anexado              │
│                                     │
│  [📤 Fazer Upload do Ofício]        │
│                                     │
└─────────────────────────────────────┘
```

#### **Quando HÁ ofício:**
```
┌─────────────────────────────────────┐
│ 📄 Ofício do Precatório             │
├─────────────────────────────────────┤
│                                     │
│  ✅ Ofício anexado                  │
│                                     │
│  [👁️ Ver Ofício]  [🔄 Substituir]  │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔧 Implementação

### **1. Componente de Upload**

**Arquivo:** `components/precatorios/upload-oficio.tsx`

```typescript
interface UploadOficioProps {
  precatorioId: string
  oficioUrl: string | null
  onUploadSuccess: () => void
}

export function UploadOficio({ 
  precatorioId, 
  oficioUrl, 
  onUploadSuccess 
}: UploadOficioProps) {
  // Upload do ofício
  // Visualização do ofício
  // Substituição do ofício
}
```

### **2. Integração na Página de Cálculo**

**Arquivo:** `app/(dashboard)/calcular/page.tsx`

```typescript
<div className="space-y-6">
  {/* Seção de Upload do Ofício */}
  <Card>
    <CardHeader>
      <CardTitle>📄 Ofício do Precatório</CardTitle>
    </CardHeader>
    <CardContent>
      <UploadOficio
        precatorioId={precatorioId}
        oficioUrl={precatorio.pdf_url}
        onUploadSuccess={handleUploadSuccess}
      />
    </CardContent>
  </Card>

  {/* Calculadora de Precatórios */}
  <CalculadorPrecatorios precatorioId={precatorioId} />
</div>
```

### **3. Função de Upload**

**Arquivo:** `lib/utils/oficio-upload.ts`

```typescript
export async function uploadOficio(
  precatorioId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  // 1. Validar arquivo (PDF, tamanho)
  // 2. Upload para storage
  // 3. Atualizar campo pdf_url no precatório
  // 4. Registrar atividade
  // 5. Retornar URL
}
```

---

## 📊 Fluxo Completo

### **Cenário 1: Primeiro Upload**

1. Operador acessa `/calcular?id={precatorio_id}`
2. Vê seção "Ofício do Precatório" vazia
3. Clica em "Fazer Upload do Ofício"
4. Seleciona arquivo PDF
5. Sistema faz upload e salva URL
6. Botão "Ver Ofício" aparece
7. Ofício fica disponível permanentemente

### **Cenário 2: Refazer Cálculo**

1. Operador acessa `/calcular?id={precatorio_id}` novamente
2. Vê seção "Ofício do Precatório" com ofício anexado
3. Pode visualizar o ofício existente
4. Pode substituir se necessário
5. Ofício permanece mesmo após salvar novo cálculo

### **Cenário 3: Substituir Ofício**

1. Operador clica em "Substituir"
2. Modal de confirmação aparece
3. Operador confirma
4. Seleciona novo arquivo PDF
5. Sistema substitui o ofício antigo
6. Nova URL é salva

---

## 🔐 Permissões

### **Quem pode fazer upload:**
- ✅ Operador de cálculo (responsável pelo cálculo)
- ✅ Admin

### **Quem pode visualizar:**
- ✅ Operador de cálculo
- ✅ Operador comercial (responsável)
- ✅ Admin
- ✅ Criador do precatório

---

## 🎯 Diferença: Ofício vs Documentos

### **Ofício (pdf_url):**
- 📄 Um por precatório
- 🔒 Vinculado ao precatório
- ⏰ Permanente
- 🎯 Usado no cálculo
- 📍 Localização: `precatorios.pdf_url`

### **Documentos (tabela documentos):**
- 📚 Múltiplos por precatório
- 📎 Anexos diversos
- 📋 Checklist de documentos
- 🗂️ Localização: tabela `documentos`

---

## ✅ Benefícios

1. **Persistência:** Ofício nunca é perdido
2. **Simplicidade:** Um campo, uma URL
3. **Facilidade:** Sempre disponível para visualização
4. **Rastreabilidade:** Histórico de uploads em atividades
5. **Flexibilidade:** Pode ser substituído quando necessário

---

## 📝 Atividades Registradas

### **Upload de Ofício:**
```typescript
{
  tipo: 'upload_pdf',
  descricao: 'Ofício anexado ao precatório',
  metadata: {
    arquivo: 'oficio-2024-01-09.pdf',
    tamanho: '2.5 MB'
  }
}
```

### **Substituição de Ofício:**
```typescript
{
  tipo: 'upload_pdf',
  descricao: 'Ofício substituído',
  metadata: {
    arquivo_anterior: 'oficio-2024-01-09.pdf',
    arquivo_novo: 'oficio-2024-01-10.pdf'
  }
}
```

---

## 🚀 Implementação Técnica

### **Componentes a Criar:**
1. `components/precatorios/upload-oficio.tsx` - Componente principal
2. `lib/utils/oficio-upload.ts` - Lógica de upload

### **Componentes a Modificar:**
1. `app/(dashboard)/calcular/page.tsx` - Adicionar seção de ofício
2. `app/(dashboard)/precatorios/[id]/page.tsx` - Mostrar ofício (opcional)

### **Reutilizar:**
1. `components/pdf-viewer-modal.tsx` - Visualizador existente
2. `lib/utils/pdf-upload.ts` - Lógica de upload existente (adaptar)

---

## 📋 Checklist de Implementação

- [ ] Criar componente `UploadOficio`
- [ ] Criar função `uploadOficio` em `lib/utils/oficio-upload.ts`
- [ ] Integrar na página `/calcular`
- [ ] Adicionar botão "Ver Ofício"
- [ ] Adicionar botão "Substituir Ofício"
- [ ] Testar upload
- [ ] Testar visualização
- [ ] Testar substituição
- [ ] Verificar persistência ao refazer cálculo

---

**Data:** 2024  
**Documentado por:** BLACKBOX AI  
**Status:** 📝 **PLANEJADO - AGUARDANDO IMPLEMENTAÇÃO**
