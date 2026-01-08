"use client"

import { useState } from "react"
import { Download, Trash2, FileText, Edit2, Check, X, File } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { DocumentoPrecatorio } from "@/lib/types/documento"
import {
  TIPO_DOCUMENTO_LABELS,
  formatarTamanho,
  getIconeArquivo,
} from "@/lib/types/documento"
import {
  downloadDocumento,
  removerDocumento,
  atualizarObservacao,
} from "@/lib/utils/documento-upload"
import { toast } from "sonner"

interface DocumentoCardProps {
  documento: DocumentoPrecatorio
  onRemove?: (id: string) => void
  onUpdate?: () => void
  canEdit?: boolean
  canDelete?: boolean
}

export function DocumentoCard({
  documento,
  onRemove,
  onUpdate,
  canEdit = true,
  canDelete = true,
}: DocumentoCardProps) {
  const [loading, setLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingObs, setEditingObs] = useState(false)
  const [observacao, setObservacao] = useState(documento.observacao || "")

  const handleDownload = async () => {
    setLoading(true)
    try {
      const result = await downloadDocumento(
        documento.storage_path,
        documento.nome_arquivo
      )
      if (result.success) {
        toast.success("Download iniciado")
      } else {
        toast.error(result.error || "Erro ao fazer download")
      }
    } catch (error) {
      console.error("[DocumentoCard] Erro ao fazer download:", error)
      toast.error("Erro ao fazer download")
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    setLoading(true)
    try {
      const result = await removerDocumento(documento.id)
      if (result.success) {
        toast.success("Documento removido")
        onRemove?.(documento.id)
      } else {
        toast.error(result.error || "Erro ao remover documento")
      }
    } catch (error) {
      console.error("[DocumentoCard] Erro ao remover:", error)
      toast.error("Erro ao remover documento")
    } finally {
      setLoading(false)
      setShowDeleteDialog(false)
    }
  }

  const handleSaveObservacao = async () => {
    setLoading(true)
    try {
      const result = await atualizarObservacao(documento.id, observacao)
      if (result.success) {
        toast.success("Observação atualizada")
        setEditingObs(false)
        onUpdate?.()
      } else {
        toast.error(result.error || "Erro ao atualizar observação")
      }
    } catch (error) {
      console.error("[DocumentoCard] Erro ao atualizar observação:", error)
      toast.error("Erro ao atualizar observação")
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setObservacao(documento.observacao || "")
    setEditingObs(false)
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Ícone do arquivo */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <File className="w-5 h-5 text-primary" />
              </div>
            </div>

            {/* Informações do documento */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">
                    {documento.nome_arquivo}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {TIPO_DOCUMENTO_LABELS[documento.tipo_documento]}
                  </p>
                </div>

                {/* Badge opcional */}
                {documento.opcional && (
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    Opcional
                  </Badge>
                )}
              </div>

              {/* Metadados */}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>{formatarTamanho(documento.tamanho_bytes || 0)}</span>
                <span>•</span>
                <span>
                  {new Date(documento.created_at).toLocaleDateString("pt-BR")}
                </span>
                {documento.enviado_por_nome && (
                  <>
                    <span>•</span>
                    <span>Por {documento.enviado_por_nome}</span>
                  </>
                )}
              </div>

              {/* Observação */}
              {!editingObs && documento.observacao && (
                <p className="text-xs text-muted-foreground mt-2 italic">
                  {documento.observacao}
                </p>
              )}

              {/* Editar observação */}
              {editingObs && (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Adicionar observação..."
                    className="text-xs min-h-[60px]"
                    disabled={loading}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveObservacao}
                      disabled={loading}
                      className="h-7 text-xs"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={loading}
                      className="h-7 text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownload}
                  disabled={loading}
                  className="h-8 text-xs"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>

                {canEdit && !editingObs && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingObs(true)}
                    disabled={loading}
                    className="h-8 text-xs"
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    {documento.observacao ? "Editar" : "Adicionar"} Obs
                  </Button>
                )}

                {canDelete && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={loading}
                    className="h-8 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmação de remoção */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o documento "{documento.nome_arquivo}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
