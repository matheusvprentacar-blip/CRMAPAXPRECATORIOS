"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "@/components/icons"

interface Tentativa {
  id: string
  agente_nome: string
  criado_em: string
  tipo: "ligacao" | "whatsapp" | "email"
  resultado: "atendeu" | "nao_atendeu" | "interessado" | "sem_interesse"
  observacoes: string | null
  contato_nome?: string | null
  contato_telefone?: string | null
  interesse_receber_proposta?: boolean | null
}

const TIPO_LABELS: Record<string, string> = {
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
}

const RESULTADO_COLORS: Record<string, string> = {
  atendeu: "bg-blue-100 text-blue-800",
  nao_atendeu: "bg-gray-100 text-gray-700",
  interessado: "bg-green-100 text-green-800",
  sem_interesse: "bg-red-100 text-red-800",
}

const RESULTADO_LABELS: Record<string, string> = {
  atendeu: "Atendeu",
  nao_atendeu: "Não atendeu",
  interessado: "Interessado",
  sem_interesse: "Sem interesse",
}

interface HistoricoTentativasProps {
  precatorioId: string
  refreshKey?: number
}

export function HistoricoTentativas({ precatorioId, refreshKey }: HistoricoTentativasProps) {
  const [tentativas, setTentativas] = useState<Tentativa[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTentativas = async () => {
      setLoading(true)
      try {
        const supabase = createBrowserClient()
        if (!supabase) return

        const { data, error } = await supabase
          .from("atendimento_tentativas")
          .select("id, agente_nome, criado_em, tipo, resultado, observacoes, contato_nome, contato_telefone, interesse_receber_proposta")
          .eq("precatorio_id", precatorioId)
          .order("criado_em", { ascending: false })

        if (!error) setTentativas(data ?? [])
      } finally {
        setLoading(false)
      }
    }

    fetchTentativas()
  }, [precatorioId, refreshKey])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Carregando histórico...
      </div>
    )
  }

  if (tentativas.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">Nenhuma tentativa registrada.</p>
  }

  return (
    <div className="space-y-2">
      {tentativas.map((t) => (
        <div key={t.id} className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{TIPO_LABELS[t.tipo] ?? t.tipo}</span>
            <Badge className={RESULTADO_COLORS[t.resultado] ?? ""}>
              {RESULTADO_LABELS[t.resultado] ?? t.resultado}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(t.criado_em).toLocaleString("pt-BR")}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">por {t.agente_nome}</p>
          {t.resultado === "interessado" && (
            <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {t.contato_nome && <p>{`Contato: ${t.contato_nome}`}</p>}
              {t.contato_telefone && <p>{`Telefone: ${t.contato_telefone}`}</p>}
              {typeof t.interesse_receber_proposta === "boolean" && (
                <p>{`Aceita proposta: ${t.interesse_receber_proposta ? "Sim" : "Não"}`}</p>
              )}
            </div>
          )}
          {t.observacoes && (
            <p className="mt-1 text-xs text-foreground/80">{t.observacoes}</p>
          )}
        </div>
      ))}
    </div>
  )
}
