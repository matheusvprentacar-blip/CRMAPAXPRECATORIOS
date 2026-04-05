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

type SyncAcceptedProposalsOptions = {
  limit?: number
}

type SyncAcceptedProposalsResult = {
  scanned: number
  created: number
  failed: number
}

export async function syncAcceptedProposalsToLegalOpinions(
  options: SyncAcceptedProposalsOptions = {}
): Promise<SyncAcceptedProposalsResult> {
  const supabase = createBrowserClient()
  if (!supabase) throw new Error("Supabase nao disponivel.")

  const limit = Math.max(1, Math.min(options.limit ?? 300, 1000))
  const { data: precatorios, error } = await supabase
    .from("precatorios")
    .select("id")
    .or("proposta_aceita.eq.true,status_kanban.eq.proposta_aceita,localizacao_kanban.eq.proposta_aceita")
    .order("updated_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  const rows = (precatorios || []) as Array<{ id: string }>
  let created = 0
  let failed = 0

  for (const row of rows) {
    try {
      const result = await ensureOpenLegalOpinionForPrecatorio({
        precatorioId: row.id,
        motivo: "OUTROS",
        motivoLabel: "Proposta aceita",
        descricao:
          "Crédito sincronizado automaticamente a partir de Jurídico de fechamento (proposta aceita).",
        origemSolicitacao: "kanban",
      })
      if (result.created) created += 1
    } catch (syncError) {
      failed += 1
      console.error("[LegalOpinion Sync] Falha ao sincronizar precatorio:", row.id, syncError)
    }
  }

  return {
    scanned: rows.length,
    created,
    failed,
  }
}
