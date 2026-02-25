"use client"

import { useId, useState, type ChangeEvent, type DragEvent } from "react"
import { AlertCircle, FileText, Paperclip, Upload, X } from "@/components/icons"
import { Button, Chip, Label, Modal, Surface } from "@heroui/react"
import { toast } from "sonner"
import { uploadAndAttachPdf } from "@/lib/utils/pdf-upload"

interface UploadOficioModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  precatorioId: string
  credorNome?: string
  numeroProcesso?: string
  numeroPrecatorio?: string
  onSuccess?: () => void
}

const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024

function formatBytes(size: number): string {
  if (size <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const unit = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  const value = size / 1024 ** unit
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`
}

function isPdf(file: File): boolean {
  const mime = (file.type || "").toLowerCase()
  const name = (file.name || "").toLowerCase()
  return mime === "application/pdf" || name.endsWith(".pdf")
}

export function UploadOficioModal({
  open,
  onOpenChange,
  precatorioId,
  credorNome,
  numeroProcesso,
  numeroPrecatorio,
  onSuccess,
}: UploadOficioModalProps) {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputId = useId()

  const resetForm = () => {
    setArquivo(null)
    setDragActive(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }

  const handleDrag = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true)
    } else if (event.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleFileSelect = (file: File) => {
    if (!isPdf(file)) {
      toast.error("Envie apenas arquivo PDF.")
      return
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      toast.error(`Arquivo muito grande. Maximo: ${formatBytes(MAX_PDF_SIZE_BYTES)}.`)
      return
    }

    setArquivo(file)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFileSelect(event.dataTransfer.files[0])
    }
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      handleFileSelect(event.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!arquivo || loading) return

    setLoading(true)
    try {
      await uploadAndAttachPdf({
        precatorioId,
        file: arquivo,
      })

      toast.success("Oficio anexado com sucesso.")
      handleOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("[UploadOficioModal] Erro no upload:", error)
      const message = error instanceof Error ? error.message : "Erro ao anexar oficio."
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal.Backdrop
      isOpen={open}
      onOpenChange={handleOpenChange}
      isDismissable={!loading}
      isKeyboardDismissDisabled={loading}
      className="bg-black/60 backdrop-blur-[4px] supports-[backdrop-filter]:bg-black/50"
    >
      <Modal.Container placement="center" size="lg" className="px-3 sm:px-5">
        <Modal.Dialog className="w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-default-200/75 bg-content1 shadow-[0_30px_85px_-45px_hsl(var(--primary)/0.58)]">
          <Modal.CloseTrigger
            className={[
              "absolute right-4 top-4 z-20 rounded-full border border-default-200/70 bg-content1/95 hover:bg-content2",
              loading ? "pointer-events-none opacity-60" : "",
            ].join(" ")}
          />

          <Modal.Header className="flex flex-col gap-3 border-b border-default-200/70 px-5 pb-4 pt-5 sm:px-6">
            <Modal.Icon className="size-11 rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-sm">
              <Paperclip className="size-5" />
            </Modal.Icon>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Chip size="sm" variant="flat" color="warning" className="border border-warning/35 font-semibold">
                  Etapa de oficios
                </Chip>
                <Chip size="sm" variant="flat" color="default" className="border border-default-200/70 font-semibold">
                  PDF obrigatorio
                </Chip>
              </div>
              <Modal.Heading className="text-xl font-bold tracking-tight">Anexar oficio requisitorio</Modal.Heading>
              <p className="text-sm text-foreground/70">
                Envie o PDF oficial para liberar o fluxo operacional do precatorio.
              </p>
            </div>
          </Modal.Header>

          <Modal.Body className="space-y-4 px-5 py-5 sm:px-6">
            <Surface className="rounded-2xl border border-default-200/70 bg-content2/45 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/55">Precatorio selecionado</p>
              <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-foreground/55">Credor</p>
                  <p className="truncate font-medium text-foreground" title={credorNome || "Nao informado"}>
                    {credorNome || "Nao informado"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-foreground/55">Processo</p>
                  <p className="truncate font-mono text-foreground" title={numeroProcesso || "N/A"}>
                    {numeroProcesso || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-foreground/55">Precatorio</p>
                  <p className="truncate text-foreground" title={numeroPrecatorio || "N/A"}>
                    {numeroPrecatorio || "N/A"}
                  </p>
                </div>
              </div>
            </Surface>

            <div className="space-y-2">
              <Label htmlFor={fileInputId} className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                Arquivo do oficio (PDF)
              </Label>
              <div
                className={[
                  "rounded-2xl border-2 border-dashed p-5 transition-colors",
                  dragActive ? "border-primary/80 bg-primary/10" : "border-default-300/75 bg-content2/40",
                ].join(" ")}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {!arquivo ? (
                  <div className="space-y-3 text-center">
                    <Upload className="mx-auto h-9 w-9 text-primary/80" />
                    <p className="text-sm text-foreground/80">
                      Arraste o PDF aqui ou{" "}
                      <label htmlFor={fileInputId} className="cursor-pointer font-semibold text-primary hover:underline">
                        selecione do computador
                      </label>
                    </p>
                    <p className="text-xs text-foreground/60">Somente PDF ate {formatBytes(MAX_PDF_SIZE_BYTES)}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{arquivo.name}</p>
                        <p className="text-xs text-foreground/60">{formatBytes(arquivo.size)}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-full"
                      onPress={() => setArquivo(null)}
                      isDisabled={loading}
                    >
                      <span className="inline-flex items-center gap-1">
                        <X className="h-4 w-4" />
                        Remover
                      </span>
                    </Button>
                  </div>
                )}
                <input
                  id={fileInputId}
                  type="file"
                  className="hidden"
                  accept=".pdf,application/pdf"
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>
            </div>

            {!arquivo && (
              <Surface className="flex items-start gap-2 rounded-xl border border-warning/35 bg-warning/10 px-3 py-2 text-xs text-warning">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>Selecione um PDF para habilitar o envio.</p>
              </Surface>
            )}
          </Modal.Body>

          <Modal.Footer className="flex flex-col-reverse gap-2 border-t border-default-200/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button variant="secondary" className="rounded-full" slot="close" isDisabled={loading}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              className={[
                "rounded-full font-semibold transition-colors",
                arquivo
                  ? "!bg-orange-500 !text-white hover:!bg-orange-600 dark:!bg-orange-500 dark:hover:!bg-orange-600"
                  : "",
              ].join(" ")}
              onPress={handleUpload}
              isPending={loading}
              isDisabled={!arquivo || loading}
            >
              Anexar oficio
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
