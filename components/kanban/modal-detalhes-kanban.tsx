"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileText, CheckCircle2, Scale, Calculator, History, FileCheck } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { FormInteresse } from "./form-interesse"
import { ChecklistDocumentos } from "./checklist-documentos"
import { ChecklistCertidoes } from "./checklist-certidoes"
import { FormSolicitarJuridico } from "./form-solicitar-juridico"
import { FormParecerJuridico } from "./form-parecer-juridico"
import { FormExportarCalculo } from "./form-exportar-calculo"
import { HistoricoCalculos } from "./historico-calculos"
import { AbaProposta } from "./aba-proposta"

interface ModalDetalhesKanbanProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  precatorioId: string
  onUpdate: () => void
}

export function ModalDetalhesKanban({
  open,
  onOpenChange,
  precatorioId,
  onUpdate,
}: ModalDetalhesKanbanProps) {
  const [precatorio, setPrecatorio] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("geral")
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    if (open && precatorioId) {
      loadPrecatorio()
      loadUserRole()
    }
  }, [open, precatorioId])

  async function loadUserRole() {
    const supabase = createBrowserClient()
    if (!supabase) return

    const { data } = await supabase.auth.getUser()
    setUserRole(data.user?.app_metadata?.role || null)
  }

  async function loadPrecatorio() {
    try {
      setLoading(true)
      const supabase = createBrowserClient()
      if (!supabase) return

      const { data, error } = await supabase
        .from("precatorios")
        .select(`
          *,
          criador:usuarios!precatorios_criado_por_fkey(nome),
          responsavel_usuario:usuarios!precatorios_responsavel_fkey(nome),
          responsavel_calculo:usuarios!precatorios_responsavel_calculo_id_fkey(nome)
        `)
        .eq("id", precatorioId)
        .single()

      if (error) throw error

      setPrecatorio(data)
    } catch (error) {
      console.error("[Modal Detalhes] Erro:", error)
    } finally {
      setLoading(false)
    }
  }

  function handleUpdate() {
    loadPrecatorio()
    onUpdate()
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!precatorio) return null

  const podeEditarInteresse = ["admin", "operador_comercial"].includes(userRole || "")
  const podeEditarItens = ["admin", "operador_comercial", "operador_calculo"].includes(userRole || "")
  const podeSolicitarJuridico = ["admin", "operador_calculo"].includes(userRole || "")
  const podeDarParecer = ["admin", "juridico"].includes(userRole || "")
  const podeExportarCalculo = ["admin", "operador_calculo"].includes(userRole || "")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {precatorio.titulo || precatorio.numero_precatorio || "Detalhes do Precatório"}
            <Badge variant="outline">{precatorio.status_kanban?.replace("_", " ")}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="documentos">
              <FileText className="h-4 w-4 mr-1" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="certidoes">
              <FileText className="h-4 w-4 mr-1" />
              Certidões
            </TabsTrigger>
            <TabsTrigger value="juridico">
              <Scale className="h-4 w-4 mr-1" />
              Jurídico
            </TabsTrigger>
            <TabsTrigger value="proposta">
              <Calculator className="h-4 w-4 mr-1" />
              Proposta
            </TabsTrigger>
            <TabsTrigger value="auditoria">
              <History className="h-4 w-4 mr-1" />
              Timeline
            </TabsTrigger>
          </TabsList>

          {/* Aba Geral */}
          <TabsContent value="geral" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Credor</label>
                <p className="text-sm text-muted-foreground">{precatorio.credor_nome || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium">CPF/CNPJ</label>
                <p className="text-sm text-muted-foreground">{precatorio.credor_cpf_cnpj || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Devedor</label>
                <p className="text-sm text-muted-foreground">{precatorio.devedor || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Tribunal</label>
                <p className="text-sm text-muted-foreground">{precatorio.tribunal || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Número do Precatório</label>
                <p className="text-sm text-muted-foreground">{precatorio.numero_precatorio || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Processo</label>
                <p className="text-sm text-muted-foreground">{precatorio.numero_processo || "-"}</p>
              </div>
            </div>

            {precatorio.valor_atualizado && (
              <div className="pt-4 border-t">
                <label className="text-sm font-medium">Valor Atualizado</label>
                <p className="text-2xl font-bold text-primary">
                  {Number(precatorio.valor_atualizado).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              </div>
            )}

            {precatorio.saldo_liquido && (
              <div>
                <label className="text-sm font-medium">Saldo Líquido</label>
                <p className="text-2xl font-bold text-blue-600">
                  {Number(precatorio.saldo_liquido).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              </div>
            )}

            {precatorio.calculo_desatualizado && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm font-medium text-destructive">⚠️ Cálculo Desatualizado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Houve mudanças em documentos ou certidões. É necessário recalcular antes de prosseguir.
                </p>
              </div>
            )}
          </TabsContent>


          {/* Aba Documentos */}
          <TabsContent value="documentos">
            <ChecklistDocumentos
              precatorioId={precatorioId}
              canEdit={podeEditarItens}
              onUpdate={handleUpdate}
            />
          </TabsContent>

          {/* Aba Certidões */}
          <TabsContent value="certidoes">
            <ChecklistCertidoes
              precatorioId={precatorioId}
              canEdit={podeEditarItens}
              onUpdate={handleUpdate}
            />
          </TabsContent>

          {/* Aba Jurídico */}
          <TabsContent value="juridico">
            {precatorio.status_kanban === "analise_juridica" ? (
              podeDarParecer ? (
                <FormParecerJuridico precatorioId={precatorioId} precatorio={precatorio} onUpdate={handleUpdate} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Aguardando parecer jurídico...</p>
                  {precatorio.juridico_motivo && (
                    <div className="mt-4 p-4 bg-muted rounded-lg text-left">
                      <p className="text-sm font-medium">Motivo: {precatorio.juridico_motivo}</p>
                      <p className="text-sm text-muted-foreground mt-2">{precatorio.juridico_descricao_bloqueio}</p>
                    </div>
                  )}
                </div>
              )
            ) : precatorio.juridico_parecer_status ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Parecer: {precatorio.juridico_parecer_status}</p>
                  <p className="text-sm text-muted-foreground mt-2">{precatorio.juridico_parecer_texto}</p>
                </div>
              </div>
            ) : podeSolicitarJuridico && precatorio.status_kanban === "calculo_andamento" ? (
              <FormSolicitarJuridico precatorioId={precatorioId} onUpdate={handleUpdate} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Análise jurídica não solicitada para este precatório.</p>
              </div>
            )}
          </TabsContent>


          {/* Aba Proposta */}
          <TabsContent value="proposta">
            <AbaProposta
              precatorioId={precatorioId}
              precatorio={precatorio}
              onUpdate={handleUpdate}
              userRole={userRole}
            />
          </TabsContent>

          {/* Aba Auditoria */}
          <TabsContent value="auditoria">
            <AuditoriaTimeline precatorioId={precatorioId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// Componente de Auditoria (simplificado)
function AuditoriaTimeline({ precatorioId }: { precatorioId: string }) {
  const [auditoria, setAuditoria] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAuditoria()
  }, [precatorioId])

  async function loadAuditoria() {
    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      const { data, error } = await supabase
        .from("precatorio_auditoria")
        .select("*")
        .eq("precatorio_id", precatorioId)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error

      setAuditoria(data || [])
    } catch (error) {
      console.error("[Auditoria] Erro:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (auditoria.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhuma ação registrada ainda.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {auditoria.map((item) => (
        <div key={item.id} className="p-3 bg-muted rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium">{item.acao.replace("_", " ")}</p>
              {item.de && item.para && (
                <p className="text-xs text-muted-foreground mt-1">
                  {item.de} → {item.para}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(item.created_at).toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
