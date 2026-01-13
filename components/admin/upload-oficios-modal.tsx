"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Upload, X, Loader2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { trackSupabaseError, trackStorageError, trackError } from "@/lib/utils/error-tracker"

interface UploadOficiosModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function UploadOficiosModal({ open, onOpenChange, onSuccess }: UploadOficiosModalProps) {
  const [oficiosFiles, setOficiosFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  async function handleUpload() {
    if (oficiosFiles.length === 0) {
      toast.error("Selecione pelo menos um arquivo PDF")
      return
    }

    setUploading(true)
    let criados = 0
    let erros = 0

    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não disponível")

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      for (const file of oficiosFiles) {
        try {
          // Upload do PDF
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`
          
          console.log(`[Upload] Iniciando upload: ${fileName}`)
          
          const { error: uploadError } = await supabase.storage
            .from('documentos')
            .upload(`oficios/${fileName}`, file)

          if (uploadError) {
            trackStorageError('upload', uploadError, {
              fileName,
              fileSize: file.size,
              fileType: file.type
            })
            throw uploadError
          }

          console.log(`[Upload] Upload bem-sucedido: ${fileName}`)

          // URL pública
          const { data: urlData } = supabase.storage
            .from('documentos')
            .getPublicUrl(`oficios/${fileName}`)

          console.log(`[Upload] URL gerada: ${urlData.publicUrl}`)

          // Criar precatório vazio
          const precatorioData = {
            titulo: file.name.replace('.pdf', ''),
            numero_precatorio: `OFICIO-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            credor_nome: "A preencher pelo operador",
            pdf_url: urlData.publicUrl,
            criado_por: user.id,
            responsavel: user.id,
            status: "novo",
            status_kanban: "entrada",
          }

          console.log(`[Upload] Criando precatório:`, precatorioData)

          const { error: insertError } = await supabase.from("precatorios").insert(precatorioData)

          if (insertError) {
            trackSupabaseError('insert precatorio', insertError, {
              fileName,
              precatorioData
            })
            throw insertError
          }

          console.log(`[Upload] Precatório criado com sucesso`)
          criados++
        } catch (error) {
          console.error(`[Upload] Erro ao processar ${file.name}:`, error)
          trackError(`Erro ao processar ${file.name}`, {
            error,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
          }, 'high')
          erros++
        }
      }

      toast.success(`${criados} precatórios criados!${erros > 0 ? ` (${erros} com erro)` : ''}`)
      onOpenChange(false)
      setOficiosFiles([])
      onSuccess()
    } catch (error: any) {
      console.error("[Upload] Erro geral:", error)
      trackError('Erro geral no upload de ofícios', {
        error,
        totalFiles: oficiosFiles.length
      }, 'critical')
      toast.error(error.message || "Erro ao fazer upload")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                <p className="text-sm font-medium">{oficiosFiles.length} arquivo(s) selecionado(s):</p>
                <div className="max-h-60 overflow-y-auto space-y-1">
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
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Os precatórios serão criados vazios. Distribua para operadores que preencherão os dados.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              setOficiosFiles([])
            }}
            disabled={uploading}
          >
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={uploading || oficiosFiles.length === 0}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Fazendo Upload...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Fazer Upload ({oficiosFiles.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
