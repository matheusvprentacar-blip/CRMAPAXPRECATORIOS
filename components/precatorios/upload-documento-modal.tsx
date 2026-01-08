"use client"

import { useState } from "react"
import { Upload, X, FileText, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { TipoDocumento } from "@/lib/types/documento"
import {
  TIPO_DOCUMENTO_LABELS,
  TIPO_DOCUMENTO_DESCRICOES,
  DOCUMENTOS_OBRIGATORIOS,
  TAMANHO_MAXIMO_BYTES,
  MIME_TYPES_PERMITIDOS,
  formatarTamanho,
} from "@/lib/types/documento"
import { uploadDocumento } from "@/lib/utils/documento-upload"
import { toast } from "sonner"

interface UploadDocumentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  precatorioId: string
  onSuccess?: () => void
  tiposJaAnexados?: TipoDocumento[]
}

export function UploadDocumentoModal({
  open,
  onOpenChange,
  precatorioId,
  onSuccess,
  tiposJaAnexados = [],
}: UploadDocumentoModalProps) {
  const [loading, setLoading] = useState(false)
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento | "">("")
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [observacao, setObservacao] = useState("")
  const [dragActive, setDragActive] = useState(false)

  const tiposDisponiveis = Object.keys(TIPO_DOCUMENTO_LABELS).filter(
    (tipo) => !tiposJaAnexados.includes(tipo as TipoDocumento)
  ) as TipoDocumento[]

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (file: File) => {
    // Validar tipo
    if (!MIME_TYPES_PERMITIDOS.includes(file.type)) {
      toast.error("Tipo de arquivo não permitido")
      return
    }

    // Validar tamanho
    if (file.size > TAMANHO_MAXIMO_BYTES) {
      toast.error(`Arquivo muito grande. Máximo: ${formatarTamanho(TAMANHO_MAXIMO_BYTES)}`)
      return
    }

    setArquivo(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!tipoDocumento) {
      toast.error("Selecione o tipo de documento")
      return
    }

    if (!arquivo) {
      toast.error("Selecione um arquivo")
      return
    }

    setLoading(true)
    try {
      const opcional = !DOCUMENTOS_OBRIGATORIOS.includes(tipoDocumento)

      const result = await uploadDocumento({
        precatorio_id: precatorioId,
        tipo_documento: tipoDocumento,
        arquivo,
        observacao: observacao.trim() || undefined,
        opcional,
      })

      if (result.success) {
        toast.success("Documento enviado com sucesso!")
        handleClose()
        onSuccess?.()
      } else {
        toast.error(result.error || "Erro ao enviar documento")
      }
    } catch (error) {
      console.error("[UploadDocumentoModal] Erro:", error)
      toast.error("Erro ao enviar documento")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setTipoDocumento("")
    setArquivo(null)
    setObservacao("")
    setDragActive(false)
    onOpenChange(false)
  }

  const isObrigatorio = tipoDocumento && DOCUMENTOS_OBRIGATORIOS.includes(tipoDocumento)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Anexar Documento</DialogTitle>
          <DialogDescription>
            Faça upload de um documento relacionado ao precatório
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tipo de Documento */}
          <div className="space-y-2">
            <Label htmlFor="tipo">
              Tipo de Documento <span className="text-destructive">*</span>
            </Label>
            <Select
              value={tipoDocumento}
              onValueChange={(value) => setTipoDocumento(value as TipoDocumento)}
              disabled={loading}
            >
              <SelectTrigger id="tipo">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {tiposDisponiveis.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {TIPO_DOCUMENTO_LABELS[tipo]}
                    {DOCUMENTOS_OBRIGATORIOS.includes(tipo) && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tipoDocumento && TIPO_DOCUMENTO_DESCRICOES[tipoDocumento] && (
              <p className="text-xs text-muted-foreground">
                {TIPO_DOCUMENTO_DESCRICOES[tipoDocumento]}
              </p>
            )}
          </div>

          {/* Upload de Arquivo */}
          <div className="space-y-2">
            <Label>
              Arquivo <span className="text-destructive">*</span>
            </Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {!arquivo ? (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    <label
                      htmlFor="file-upload"
                      className="text-primary cursor-pointer hover:underline"
                    >
                      Clique para selecionar
                    </label>{" "}
                    ou arraste o arquivo aqui
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PDF, JPG, PNG, DOC, DOCX (máx. {formatarTamanho(TAMANHO_MAXIMO_BYTES)})
                  </p>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept={MIME_TYPES_PERMITIDOS.join(",")}
                    onChange={handleFileInputChange}
                    disabled={loading}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-medium">{arquivo.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatarTamanho(arquivo.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setArquivo(null)}
                    disabled={loading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Observação */}
          <div className="space-y-2">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Adicione uma observação sobre este documento..."
              className="min-h-[80px]"
              disabled={loading}
            />
          </div>

          {/* Alert de documento obrigatório */}
          {isObrigatorio && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Este é um documento <strong>obrigatório</strong> para o precatório.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={loading || !tipoDocumento || !arquivo}>
            {loading ? "Enviando..." : "Enviar Documento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
