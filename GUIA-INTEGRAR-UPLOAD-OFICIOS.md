# 🚀 Guia: Integrar Upload em Lote de Ofícios

## ✅ Componente Criado
`components/admin/upload-oficios-modal.tsx` - Modal para upload de múltiplos PDFs

## 📝 Passos para Integrar

### 1. Abra o arquivo
`app/(dashboard)/admin/precatorios/page.tsx`

### 2. Adicione o import (linha ~47, após outros imports)
```tsx
import { UploadOficiosModal } from "@/components/admin/upload-oficios-modal"
```

### 3. Remova imports não usados (linha ~32-44)
Remova: `X, Upload` de lucide-react (não serão mais necessários)

### 4. Substitua o estado (linha ~120-130)
**REMOVER**:
```tsx
const [createDialogOpen, setCreateDialogOpen] = useState(false)
const [newPrecatorio, setNewPrecatorio] = useState({
  titulo: "",
  numero_precatorio: "",
  credor_nome: "",
  valor_principal: 0,
})
const [oficioFile, setOficioFile] = useState<File | null>(null)
const [uploadingOficio, setUploadingOficio] = useState(false)
```

**ADICIONAR**:
```tsx
const [uploadOficiosOpen, setUploadOficiosOpen] = useState(false)
```

### 5. Remova a função handleCreatePrecatorio (linha ~220-250)
Delete toda a função `handleCreatePrecatorio`

### 6. Substitua o botão "Novo Precatório" (linha ~360)
**ANTES**:
```tsx
<Button onClick={() => setCreateDialogOpen(true)}>
  <Plus className="h-4 w-4 mr-2" />
  Novo Precatório
</Button>
```

**DEPOIS**:
```tsx
<Button onClick={() => setUploadOficiosOpen(true)}>
  <Plus className="h-4 w-4 mr-2" />
  Upload de Ofícios
</Button>
```

### 7. Substitua o botão na área vazia (linha ~450)
**ANTES**:
```tsx
<Button onClick={() => setCreateDialogOpen(true)}>
  <Plus className="h-4 w-4 mr-2" />
  Criar Precatório
</Button>
```

**DEPOIS**:
```tsx
<Button onClick={() => setUploadOficiosOpen(true)}>
  <Plus className="h-4 w-4 mr-2" />
  Upload de Ofícios
</Button>
```

### 8. Remova o Dialog antigo (linha ~550-650)
Delete TODO o bloco:
```tsx
<Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
  ...
</Dialog>
```

### 9. Adicione o novo componente (antes do Dialog de distribuição)
```tsx
<UploadOficiosModal
  open={uploadOficiosOpen}
  onOpenChange={setUploadOficiosOpen}
  onSuccess={() => loadData()}
/>
```

---

## ✅ Resultado Final

**Modal "Upload de Ofícios"**:
- Seleciona múltiplos PDFs
- Lista arquivos com botão X para remover
- Faz upload e cria precatórios vazios
- Operador preenche depois

**Fluxo**:
1. Admin: Upload de PDFs → Precatórios criados vazios
2. Admin: Distribui para operador
3. Operador: Preenche TODAS as informações
4. Operador: Envia para cálculo (quando pronto)
