"use client"

import { createBrowserClient } from "@/lib/supabase/client"
import { createLegalOpinion } from "@/features/legal-opinion/api"
import type { LegalOpinionSource, LegalOpinionType } from "@/features/legal-opinion/types"

type EnsureLegalOpinionInput = {
  precatorioId: string
  motivo: string
  motivoLabel?: string
  descricao: string
  origemSolicitacao?: LegalOpinionSource
}

type EnsureLegalOpinionResult = {
  created: boolean
  opinionId?: string
}

const OPEN_OPINION_STATUSES = ["pendente", "em_analise"]

function mapMotivoToOpinionType(motivo: string): LegalOpinionType {
  switch (motivo) {
    case "PENHORA":
      return "penhoras_bloqueios"
    case "CESSAO":
    case "HABILITACAO":
      return "titularidade_cessao"
    case "HONORARIOS":
    case "DUVIDA_BASE_INDICE":
      return "calculos"
    default:
      return "risco_processual"
  }
}

function buildPrecatorioLabel(precatorio: {
  titulo: string | null
  numero_precatorio: string | null
  numero_processo: string | null
  credor_nome: string | null
}) {
  return (
    precatorio.titulo ||
    precatorio.numero_precatorio ||
    precatorio.numero_processo ||
    precatorio.credor_nome ||
    "Precatorio sem identificacao"
  )
}

export async function ensureOpenLegalOpinionForPrecatorio({
  precatorioId,
  motivo,
  motivoLabel,
  descricao,
  origemSolicitacao = "kanban",
}: EnsureLegalOpinionInput): Promise<EnsureLegalOpinionResult> {
  const supabase = createBrowserClient()
  if (!supabase) throw new Error("Supabase nao disponivel.")

  const { data: tenantData, error: tenantError } = await supabase.rpc("app_current_tenant_id")
  if (tenantError) throw new Error(tenantError.message)

  const tenantId = String(tenantData || "").trim()
  if (!tenantId) throw new Error("Tenant nao identificado para criar parecer juridico.")

  const { data: existing, error: existingError } = await supabase
    .from("legal_opinions")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("precatorio_id", precatorioId)
    .in("status", OPEN_OPINION_STATUSES)
    .limit(1)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)
  if (existing?.id) {
    return { created: false, opinionId: existing.id }
  }

  const { data: precatorioData } = await supabase
    .from("precatorios")
    .select("titulo, numero_precatorio, numero_processo, credor_nome")
    .eq("id", precatorioId)
    .maybeSingle()

  const precatorioLabel = precatorioData ? buildPrecatorioLabel(precatorioData) : "Precatorio"
  const safeMotivo = (motivoLabel || motivo || "Solicitacao juridica").trim()
  const safeDescricao = String(descricao || "").trim()
  const opinion = await createLegalOpinion({
    precatorioId,
    title: `Solicitacao Juridica - ${precatorioLabel}`,
    type: mapMotivoToOpinionType(motivo),
    status: "pendente",
    priority: "media",
    origemSolicitacao,
    executiveSummary: `${safeMotivo}: ${safeDescricao}`.slice(0, 5000),
    analysis: safeDescricao || null,
  })

  return { created: true, opinionId: opinion.id }
}
