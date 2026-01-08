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
  const [precatorioSelecionado, setPrecatorioSelecionado] = useState<PrecatorioCalculo | null>(null)
  const [calculando, setCalculando] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const supabase = getSupabase()
      if (!supabase) return

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      console.log("[FILA CALCULO] Carregando fila para usuário:", user.id)

      // Buscar TODOS os precatórios em cálculo (FIFO)
      const { data, error } = await supabase
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
          motivo_atraso_calculo,
          data_atraso_calculo,
          score_complexidade,
          nivel_complexidade,
          data_entrada_calculo,
          sla_horas,
          sla_status`
        )
        .eq("status", "em_calculo")
        .order("urgente", { ascending: false })
        .order("created_at", { ascending: true })

      if (error) {
        console.error("[FILA CALCULO] Erro ao carregar:", error)
        throw error
      }

      console.log("[FILA CALCULO] Carregados:", data?.length || 0, "precatórios")
      setFilaCalculo((data as PrecatorioCalculo[]) || [])
    } catch (error) {
      console.error("[FILA CALCULO] Erro:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCalcular = (precatorioId: string) => {
    setCalculando(precatorioId)
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
        tipo: "atraso_removido",
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fila de Cálculo</h1>
          <p className="text-muted-foreground">
            Todos os precatórios aguardando cálculo • Ordenação FIFO (Primeiro a Entrar, Primeiro a Sair)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <span className="text-2xl font-bold">{filaCalculo.length}</span>
          <span className="text-sm text-muted-foreground">na fila</span>
        </div>
      </div>

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

      {/* Lista de Precatórios */}
      <div className="space-y-4">
        {filteredFila.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Calculator className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? "Nenhum precatório encontrado" : "Fila vazia"}
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                {searchTerm
                  ? "Tente ajustar os termos da busca"
                  : "Não há precatórios aguardando cálculo no momento"}
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
                isCalculando={calculando === precatorio.id}
              />
            ))}
          </>
        )}
      </div>

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
    </div>
  )
}
