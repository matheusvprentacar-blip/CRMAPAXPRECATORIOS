# 📋 Admin Precatórios - Upload em Lote de Ofícios

## ✅ Implementação Final

### Fluxo Correto:
1. **Admin faz upload de VÁRIOS PDFs** (ofícios requisitórios)
2. **Sistema cria precatórios vazios** (só com PDF anexado)
3. **Admin distribui** para operadores na aba "Pendentes"
4. **Operador preenche** TODAS as informações (exceto cálculos)

### Mudanças Necessárias no Modal:

**ANTES** (Errado):
- Campos: Título, Número, Credor, Valor
- Upload de 1 PDF apenas
- Admin preenchia dados

**DEPOIS** (Correto):
- **Apenas upload de múltiplos PDFs**
- Sem campos de formulário
- Precatórios criados vazios
- Operador preenche tudo

### Código do Modal Correto:

```tsx
// Estado
const [oficiosFiles, setOficiosFiles] = useState<File[]>([])

// Função de upload
async function handleUploadOficios() {
  if (!currentUser || oficiosFiles.length === 0) {
    toast.error("Selecione pelo menos um arquivo PDF")
    return
  }

  setSaving(true)
  let criados = 0
  let erros = 0

  try {
    const supabase = createBrowserClient()
    if (!supabase) throw new Error("Supabase não disponível")

    for (const file of oficiosFiles) {
      try {
        // Upload do PDF
        const fileName = `${Date.now()}-${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(`oficios/${fileName}`, file)

        if (uploadError) throw uploadError

        // URL pública
        const { data: urlData } = supabase.storage
          .from('documentos')
          .getPublicUrl(`oficios/${fileName}`)

        // Criar precatório VAZIO
        const { error: insertError } = await supabase.from("precatorios").insert({
          titulo: file.name.replace('.pdf', ''),
          numero_precatorio: `OFICIO-${Date.now()}`,
          credor_nome: "A preencher",
          pdf_url: urlData.publicUrl,
          created_by: currentUser.id,
          responsavel: currentUser.id,
          status: "novo",
          status_kanban: "entrada",
        })

        if (insertError) throw insertError
        criados++
      } catch (error) {
        console.error(`Erro ${file.name}:`, error)
        erros++
      }
    }

    toast.success(`${criados} precatórios criados!${erros > 0 ? ` (${erros} erros)` : ''}`)
    setCreateDialogOpen(false)
    setOficiosFiles([])
    await loadData()
  } catch (error: any) {
    toast.error(error.message || "Erro ao fazer upload")
  } finally {
    setSaving(false)
  }
}

// JSX do Modal
<Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Upload de Ofícios Requisitórios</DialogTitle>
      <DialogDescription>
        Selecione um ou vários PDFs. Os operadores preencherão todas as informações depois.
      </DialogDescription>
    </DialogHeader>
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label>Selecione os Ofícios (PDFs) *</Label>
        <Input
          type="file"
          accept=".pdf"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || [])
            setOficiosFiles(files)
          }}
        />
        {oficiosFiles.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-sm font-medium">{oficiosFiles.length} arquivo(s):</p>
            {oficiosFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between bg-muted p-2 rounded">
                <span className="text-xs truncate flex-1">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOficiosFiles(oficiosFiles.filter((_, i) => i !== idx))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Precatórios criados vazios. Distribua para operadores preencherem.
        </p>
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => {
        setCreateDialogOpen(false)
        setOficiosFiles([])
      }} disabled={saving}>
        Cancelar
      </Button>
      <Button onClick={handleUploadOficios} disabled={saving || oficiosFiles.length === 0}>
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Fazendo Upload...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Upload ({oficiosFiles.length})
          </>
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Imports Necessários:
```tsx
import { X, Upload } from "lucide-react"
```

---

## 🔄 Como Aplicar

Substitua o modal "Criar Novo Precatório" pelo código acima no arquivo:
`app/(dashboard)/admin/precatorios/page.tsx`

---

## ✅ Resultado Final

**Modal "Upload de Ofícios"**:
- Seleciona múltiplos PDFs
- Lista arquivos selecionados
- Botão X para remover
- Cria precatórios vazios
- Operador preenche depois
