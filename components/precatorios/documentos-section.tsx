"use client"

import { useState, useEffect } from "react"
import { Upload, FileText, List, CheckSquare } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DocumentoCard } from "./documento-card"
import { UploadDocumentoModal } from "./upload-documento-modal"
import { ChecklistDocumentos } from "./checklist-documentos"
import type { DocumentoPrecatorio, TipoDocumento } from "@/lib/types/documento"
import { gerarChecklist } from "@/lib/types/documento"
import { listarDocumentos } from "@/lib/utils/documento-upload"
import { toast } from "sonner"

interface DocumentosSectionProps {
  precatorioId: string
  canEdit?: boolean
  canDelete?: boolean
}

export function DocumentosSection({
  precatorioId,
  canEdit = true,
  canDelete = true,
}: DocumentosSectionProps) {
  const [documentos, setDocumentos] = useState<DocumentoPrecatorio[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoDocumento | undefined>()

  // Carregar documentos
  useEffect(() => {
    loadDocumentos()
  }, [precatorioId])

  const loadDocumentos = async () => {
    setLoading(true)
    try {
      const result = await listarDocumentos(precatorioId)
      if (result.success && result.documentos) {
        setDocumentos(result.documentos)
      } else {
        toast.error(result.error || "Erro ao carregar documentos")
      }
    } catch (error) {
      console.error("[DocumentosSection] Erro ao carregar:", error)
      toast.error("Erro ao carregar documentos")
    } finally {
      setLoading(false)
    }
  }

  const handleAnexarClick = (tipo?: string) => {
    setTipoSelecionado(tipo as TipoDocumento | undefined)
    setShowUploadModal(true)
  }

  const handleUploadSuccess = () => {
    loadDocumentos()
    setTipoSelecionado(undefined)
  }

  const handleRemove = (id: string) => {
    setDocumentos((prev) => prev.filter((doc) => doc.id !== id))
  }

  // Gerar checklist
  const checklist = gerarChecklist(documentos)
  const obrigatorios = documentos.filter((doc) => !doc.opcional)
  const opcionais = documentos.filter((doc) => doc.opcional)
  const tiposJaAnexados = documentos.map((doc) => doc.tipo_documento)

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
              <p className="mt-2 text-sm text-muted-foreground">Carregando documentos...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header com botão de upload */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Documentos do Precatório</h3>
          <p className="text-sm text-muted-foreground">
            {documentos.length} {documentos.length === 1 ? "documento anexado" : "documentos anexados"}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => handleAnexarClick()}>
            <Upload className="w-4 h-4 mr-2" />
            Anexar Documento
          </Button>
        )}
      </div>

      {/* Alert se não houver documentos */}
      {documentos.length === 0 && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            Nenhum documento anexado ainda. Clique em "Anexar Documento" para começar.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="todos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="todos" className="gap-2">
            <List className="w-4 h-4" />
            Todos ({documentos.length})
          </TabsTrigger>
          <TabsTrigger value="obrigatorios" className="gap-2">
            <FileText className="w-4 h-4" />
            Obrigatórios ({obrigatorios.length})
          </TabsTrigger>
          <TabsTrigger value="checklist" className="gap-2">
            <CheckSquare className="w-4 h-4" />
            Checklist
          </TabsTrigger>
        </TabsList>

        {/* Tab: Todos os Documentos */}
        <TabsContent value="todos" className="space-y-3 mt-4">
          {documentos.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Nenhum documento anexado
              </CardContent>
            </Card>
          ) : (
            documentos.map((doc) => (
              <DocumentoCard
                key={doc.id}
                documento={doc}
                onRemove={handleRemove}
                onUpdate={loadDocumentos}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            ))
          )}
        </TabsContent>

        {/* Tab: Documentos Obrigatórios */}
        <TabsContent value="obrigatorios" className="space-y-3 mt-4">
          {obrigatorios.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  Nenhum documento obrigatório anexado ainda
                </p>
                {canEdit && (
                  <Button
                    variant="outline"
                    onClick={() => handleAnexarClick()}
                    className="mt-4"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Anexar Documento Obrigatório
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            obrigatorios.map((doc) => (
              <DocumentoCard
                key={doc.id}
                documento={doc}
                onRemove={handleRemove}
                onUpdate={loadDocumentos}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            ))
          )}
        </TabsContent>

        {/* Tab: Checklist */}
        <TabsContent value="checklist" className="mt-4">
          <ChecklistDocumentos
            checklist={checklist}
            onAnexarClick={canEdit ? handleAnexarClick : undefined}
            showProgress={true}
          />
        </TabsContent>
      </Tabs>

      {/* Modal de Upload */}
      <UploadDocumentoModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        precatorioId={precatorioId}
        onSuccess={handleUploadSuccess}
        tiposJaAnexados={tiposJaAnexados}
      />
    </div>
  )
}
