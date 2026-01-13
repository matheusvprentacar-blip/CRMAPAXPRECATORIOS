"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Loader2, Save, Trash2, Upload, FileText } from "lucide-react"

interface ItemChecklistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: any | null
  tipo: "DOCUMENTO" | "CERTIDAO"
  onSave: (data: any) => Promise<void>
  onDelete?: () => Promise<void>
}

const STATUS_OPTIONS = [
  { value: "PENDENTE", label: "Pendente" },
  { value: "SOLICITADO", label: "Solicitado" },
  { value: "RECEBIDO", label: "Recebido" },
  { value: "INCOMPLETO", label: "Incompleto" },
  { value: "VENCIDO", label: "Vencido" },
  { value: "NAO_APLICAVEL", label: "Não Aplicável" },
]

export function ItemChecklistDialog({
  open,
  onOpenChange,
  item,
  tipo,
  onSave,
  onDelete,
}: ItemChecklistDialogProps) {
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState({
    nome: "",
    status: "PENDENTE",
    observacao: "",
    validade: "",
    arquivo_url: "",
  })

  useEffect(() => {
    if (item) {
      setFormData({
        nome: item.nome || item.nome_item || "",
        status: item.status || item.status_item || "PENDENTE",
        observacao: item.observacao || "",
        validade: item.validade || "",
        arquivo_url: item.arquivo_url || "",
      })
    } else {
      setFormData({
        nome: "",
        status: "PENDENTE",
        observacao: "",
        validade: "",
        arquivo_url: "",
      })
    }
  }, [item, open])

  async function handleSave() {
    if (!formData.nome.trim()) {
      alert("Nome é obrigatório")
      return
    }

    try {
      setSaving(true)
      await onSave(formData)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    // Confirm handled by AlertDialog now

    try {
      setDeleting(true)
      await onDelete()
      onOpenChange(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Editar" : "Adicionar"} {tipo === "DOCUMENTO" ? "Documento" : "Certidão"}</DialogTitle>
          <DialogDescription>
            {item ? "Atualize as informações do item" : "Adicione um novo item customizado"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder={tipo === "DOCUMENTO" ? "Ex: Contrato Social" : "Ex: Certidão Municipal"}
              disabled={!!item} // Não permite editar nome de itens padrão
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tipo === "CERTIDAO" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Definir Validade (Preenchimento Rápido)</Label>
                <div className="flex gap-2 flex-wrap">
                  {[30, 60, 90, 180].map((dias) => (
                    <Button
                      key={dias}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const data = new Date()
                        data.setDate(data.getDate() + dias)
                        setFormData({ ...formData, validade: data.toISOString().split("T")[0] })
                      }}
                    >
                      {dias} dias
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="validade">Data de Validade (Manual)</Label>
                <Input
                  id="validade"
                  type="date"
                  value={formData.validade}
                  onChange={(e) => setFormData({ ...formData, validade: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Selecione um prazo acima ou informe a data manualmente.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="observacao">Observações</Label>
            <Textarea
              id="observacao"
              value={formData.observacao}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
              placeholder="Adicione observações relevantes..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Arquivo / Comprovante</Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={formData.arquivo_url ? "outline" : "secondary"}
                  size="sm"
                  onClick={() => document.getElementById("file-upload-dialog")?.click()}
                  disabled={saving}
                >
                  {formData.arquivo_url ? (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Substituir Arquivo
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Anexar Arquivo (PDF/Imagem)
                    </>
                  )}
                </Button>
                {/* Visualizar Link */}
                {formData.arquivo_url && (
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                    Arquivo anexado
                  </p>
                )}
              </div>

              <input
                id="file-upload-dialog"
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    // Feedback visual simples via texto botão (ou poderia usar state local uploading)
                    const { toast } = await import("sonner") // Lazy load toast
                    toast.info("Enviando arquivo...")

                    const { uploadFile } = await import("@/lib/utils/file-upload")
                    const { storageRef } = await uploadFile({
                      file,
                      pathPrefix: tipo === "CERTIDAO" ? "certidoes" : "documentos"
                    })

                    setFormData(prev => ({ ...prev, arquivo_url: storageRef }))
                    toast.success("Arquivo anexado!")
                  } catch (err: any) {
                    console.error(err)
                    alert("Erro ao enviar arquivo: " + err.message)
                  }
                  e.target.value = "" // reset
                }}
              />
            </div>
            {/* Fallback manual input se quiserem colar link externo ainda? 
                Talvez esconder ou deixar como opcional. 
                Vou deixar apenas o upload por enquanto para simplificar conforme pedido.
                Se o usuário quiser ver a URL crua, poderia ser um input readonly.
             */}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {item && onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleting || saving}>
                    {deleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Removendo...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso irá limpar os dados deste item. Ele voltará para o status "Pendente".
                      O histórico do arquivo e a validade serão removidos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                      Sim, remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || deleting}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || deleting}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
