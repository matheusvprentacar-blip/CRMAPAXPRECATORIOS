"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Calculator, AlertCircle } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import { CardPrecatorioCalculo } from "@/components/calculo/card-precatorio-calculo"
import { ComplexityBadge } from "@/components/ui/complexity-badge"
import { SLAIndicator } from "@/components/ui/sla-indicator"
import { ModalAtraso } from "@/components/calculo/modal-atraso"
import { ModalEnviarJuridico } from "@/components/calculo/modal-enviar-juridico"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PrecatorioCalculo {
  id: string
  titulo: string | null
  numero_processo: string | null
  numero_precatorio: string | null
  credor_nome: string | null
  valor_principal: number | null
  valor_atualizado: number | null
  status: string | null
  created_at: string
  urgente?: boolean
  tribunal?: string | null
  criador_nome?: string | null
  responsavel_nome?: string | null
  responsavel_calculo_nome?: string | null
  motivo_atraso_calculo?: string | null
  data_atraso_calculo?: string | null
  // FASE 1: Complexidade e SLA
  score_complexidade?: number
  nivel_complexidade?: "baixa" | "media" | "alta"
  data_entrada_calculo?: string | null
  sla_horas?: number
  sla_status?: "nao_iniciado" | "no_prazo" | "atencao" | "atrasado" | "concluido"
}

export default function FilaCalculoPage() {
  const router = useRouter()
  const [filaCalculo, setFilaCalculo] = useState<PrecatorioCalculo[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [modalAtrasoOpen, setModalAtrasoOpen] = useState(false)
  const [modalJuridicoOpen, setModalJuridicoOpen] = useState(false)
  const [precatorioSelecionado, setPrecatorioSelecionado] = useState<PrecatorioCalculo | null>(null)
  const [calculando, setCalculando] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("aguardando")

  useEffect(() => {
    loadData()
  }, [activeTab]) // Reload when tab changes

  async function loadData() {
    setLoading(true) // Ensure loading state shows during fetch
    try {
      const supabase = getSupabase()
      if (!supabase) return

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Buscar perfil do usuário para verificar role
      const { data: profile } = await supabase
        .from("usuarios")
        .select("role")
        .eq("id", user.id)
        .single()

      // Buscar precatórios
      let query = supabase
        .from("precatorios_cards")
        .select(
          `id,
          titulo,
          numero_processo,
          numero_precatorio,
          credor_nome,
          valor_principal,
          valor_atualizado,
          status,
          created_at,
          urgente,
          tribunal,
          criador_nome,
          responsavel_nome,
          responsavel_calculo_nome,
          responsavel_calculo_id,
          motivo_atraso_calculo,
          data_atraso_calculo,
          score_complexidade,
          nivel_complexidade,
          data_entrada_calculo,
          sla_horas,
          sla_status`
        )

      // Filter based on active tab
      if (activeTab === "aguardando") {
        query = query.in("status", ["pronto_calculo", "calculo_andamento", "em_calculo"])
      } else {
        query = query.in("status", ["calculo_concluido", "calculado"])
      }

      // Se for operador de cálculo (e não for admin), filtrar apenas os atribuídos a ele
      const roles = (Array.isArray(profile?.role) ? profile?.role : [profile?.role].filter(Boolean)) as any[]
      const isAdmin = roles.includes("admin")

      if (roles.includes("operador_calculo") && !isAdmin) {
        // Filtrar: (responsavel = usuario ID) OU (responsavel IS NULL)
        query = query.or(`responsavel_calculo_id.eq.${user.id},responsavel_calculo_id.is.null`)
      }

      const { data, error } = await query
        .order("urgente", { ascending: false })
        .order("created_at", { ascending: true })

      if (error) {
        console.error("[FILA CALCULO] Erro ao carregar:", error)
        throw error
      }

      setFilaCalculo((data as PrecatorioCalculo[]) || [])
    } catch (error) {
      console.error("[FILA CALCULO] Erro:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCalcular = async (precatorioId: string) => {
    setCalculando(precatorioId)
    try {
      const supabase = getSupabase()
      if (supabase) {
        // Auto-move to "Em Andamento" on Kanban
        await supabase.from('precatorios').update({
          status: 'calculo_andamento',
          status_kanban: 'calculo_andamento', // Nome correto da coluna Kanban
          localizacao_kanban: 'calculo_andamento',
          updated_at: new Date().toISOString()
        }).eq('id', precatorioId)
      }
    } catch (e) {
      console.error("Erro ao atualizar status para andamento:", e)
    }
    router.push(`/calcular?id=${precatorioId}`)
  }

  const handleReportarAtraso = (precatorio: PrecatorioCalculo) => {
    setPrecatorioSelecionado(precatorio)
    setModalAtrasoOpen(true)
  }

  const handleAtrasoSuccess = () => {
    loadData()
  }

  const handleRemoverAtraso = async (precatorioId: string) => {
    try {
      const supabase = getSupabase()
      if (!supabase) return

      // Remover atraso (limpar campos)
      const { error } = await supabase
        .from("precatorios")
        .update({
          motivo_atraso_calculo: null,
          data_atraso_calculo: null,
          tipo_atraso: null,
          impacto_atraso: null,
        })
        .eq("id", precatorioId)

      if (error) throw error

      // Registrar atividade
      await supabase.from("atividades").insert({
        precatorio_id: precatorioId,
        tipo: "atualizacao",
        descricao: "Atraso removido - precatório retomado",
      })

      // Recarregar dados
      loadData()
    } catch (error) {
      console.error("[FILA CALCULO] Erro ao remover atraso:", error)
    }
  }

  const filteredFila = searchTerm
    ? filaCalculo.filter(
      (p) =>
        p.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.numero_precatorio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.credor_nome?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : filaCalculo

  return (
    <div className="container mx-auto max-w-[100vw] p-6 space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fila de Cálculo</h1>
          <p className="text-muted-foreground">
            Gestão de precatórios para cálculo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <span className="text-2xl font-bold">{filteredFila.length}</span>
          <span className="text-sm text-muted-foreground">
            {activeTab === "aguardando" ? "na fila" : "concluídos"}
          </span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="aguardando">Aguardando Cálculo</TabsTrigger>
          <TabsTrigger value="concluidos">Cálculos Concluídos</TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-6">
          {/* Barra de Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, número do precatório ou credor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFila.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Calculator className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchTerm ? "Nenhum precatório encontrado" : "Lista vazia"}
                    </h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      {searchTerm
                        ? "Tente ajustar os termos da busca"
                        : activeTab === "aguardando"
                          ? "Não há precatórios aguardando cálculo no momento"
                          : "Nenhum cálculo concluído encontrado"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {filteredFila.map((precatorio, index) => (
                    <CardPrecatorioCalculo
                      key={precatorio.id}
                      precatorio={precatorio}
                      posicao={index + 1}
                      onCalcular={() => handleCalcular(precatorio.id)}
                      onReportarAtraso={() => handleReportarAtraso(precatorio)}
                      onRemoverAtraso={() => handleRemoverAtraso(precatorio.id)}
                      onEnviarJuridico={() => {
                        setPrecatorioSelecionado(precatorio)
                        setModalJuridicoOpen(true)
                      }}
                      isCalculando={calculando === precatorio.id}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </Tabs>

      {/* Modal de Atraso */}
      {precatorioSelecionado && (
        <ModalAtraso
          open={modalAtrasoOpen}
          onOpenChange={setModalAtrasoOpen}
          precatorioId={precatorioSelecionado.id}
          precatorioTitulo={
            precatorioSelecionado.titulo ||
            precatorioSelecionado.numero_precatorio ||
            "Sem título"
          }
          onSuccess={handleAtrasoSuccess}
        />
      )}

      {/* Modal de Jurídico */}
      {precatorioSelecionado && (
        <ModalEnviarJuridico
          open={modalJuridicoOpen}
          onOpenChange={setModalJuridicoOpen}
          precatorioId={precatorioSelecionado.id}
          precatorioTitulo={
            precatorioSelecionado.titulo ||
            precatorioSelecionado.numero_precatorio ||
            "Sem título"
          }
          onSuccess={handleAtrasoSuccess}
        />
      )}
    </div>
  )
}
