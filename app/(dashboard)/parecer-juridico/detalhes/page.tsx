"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getLegalOpinionDetail } from "@/features/legal-opinion/api"
import {
  LEGAL_OPINION_STATUS_LABELS,
  LEGAL_OPINION_TYPE_LABELS,
  LEGAL_OPINION_PRIORITY_LABELS,
  type LegalOpinion,
  type LegalOpinionStatus,
} from "@/features/legal-opinion/types"
import { formatDateTime } from "@/features/legal-opinion/format"
import { ArrowLeft, Scale } from "@/components/icons"
import { LegalOpinionPanel } from "@/features/legal-opinion/components/legal-opinion-panel"
import { useAuth } from "@/lib/auth/auth-context"
import { RoleGuard } from "@/lib/auth/role-guard"

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ")

function getStatusTagClass(status: LegalOpinionStatus): string {
  switch (status) {
    case "pendente":
      return "border-amber-200 bg-amber-500/10 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300"
    case "em_analise":
      return "border-blue-200 bg-blue-500/10 text-blue-600 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300"
    case "concluido":
      return "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
    case "rejeitado":
      return "border-rose-200 bg-rose-500/10 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300"
    case "arquivado":
      return "border-slate-200 bg-slate-500/10 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
  }
}

export default function LegalOpinionDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const opinionId = searchParams.get("id") || ""
  const { profile } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [opinion, setOpinion] = useState<LegalOpinion | null>(null)
  const [error, setError] = useState<string | null>(null)

  const userRoles = Array.isArray(profile?.role)
    ? profile.role
    : profile?.role
    ? [profile.role]
    : []
  const canManageOpinions = userRoles.some((role) =>
    ["admin", "juridico", "gestor"].includes(role)
  )

  useEffect(() => {
    async function load() {
      if (!opinionId) {
        setError("Parecer não informado.")
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      try {
        const detail = await getLegalOpinionDetail(opinionId)
        setOpinion(detail.data)
        setError(null)
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Falha ao carregar parecer."
        )
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [opinionId])

  return (
    <RoleGuard allowedRoles={["admin", "juridico", "gestor"]}>
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-4 py-6 pb-24 sm:px-5">

        {/* Hero Header */}
        <section className="relative overflow-hidden rounded-[24px] border border-slate-900/10 bg-[linear-gradient(135deg,#ffffff_60%,#fff7ed_100%)] px-5 py-6 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[linear-gradient(135deg,#18181b_60%,rgba(124,45,18,0.35)_100%)] sm:px-8">
          <div className="pointer-events-none absolute -right-5 -top-16 h-[200px] w-[200px] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.14)_0%,transparent_70%)]" />
          <div className="pointer-events-none absolute -bottom-12 left-4 h-[160px] w-[160px] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.10)_0%,transparent_70%)]" />

          <div className="relative z-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <button
                  type="button"
                  onClick={() => router.push("/parecer-juridico")}
                  className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 transition hover:text-orange-500 dark:text-slate-400"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar para lista
                </button>

                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Departamento Jurídico
                </p>
                <h1 className="mt-1 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
                  {isLoading
                    ? "Carregando..."
                    : opinion?.title || "Detalhes do Parecer"}
                </h1>
                <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Análise detalhada do parecer jurídico vinculado ao precatório.
                </p>
              </div>

              {opinion && (
                <div className="flex items-center gap-2 pt-1">
                  <span
                    className={cx(
                      "inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em]",
                      getStatusTagClass(opinion.status)
                    )}
                  >
                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                    {LEGAL_OPINION_STATUS_LABELS[opinion.status]}
                  </span>
                </div>
              )}
            </div>

            {/* Info grid — só exibe quando o parecer foi carregado */}
            {opinion && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[14px] border border-slate-900/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#18181b]">
                  <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Precatório
                  </div>
                  <div className="mt-1 truncate text-[13px] font-semibold text-slate-900 dark:text-slate-50">
                    {opinion.precatorio?.numero_precatorio ||
                      opinion.precatorio?.titulo ||
                      "Não informado"}
                  </div>
                  {opinion.precatorio?.credor_nome && (
                    <div className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
                      {opinion.precatorio.credor_nome}
                    </div>
                  )}
                </div>

                <div className="rounded-[14px] border border-slate-900/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#18181b]">
                  <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Responsável
                  </div>
                  <div className="mt-1 text-[13px] font-semibold text-slate-900 dark:text-slate-50">
                    {opinion.assigned_to_user?.nome || "Não atribuído"}
                  </div>
                </div>

                <div className="rounded-[14px] border border-slate-900/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#18181b]">
                  <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Tipo / Prioridade
                  </div>
                  <div className="mt-1 text-[13px] font-semibold text-slate-900 dark:text-slate-50">
                    {LEGAL_OPINION_TYPE_LABELS[opinion.type]}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                    Prioridade: {LEGAL_OPINION_PRIORITY_LABELS[opinion.priority]}
                  </div>
                </div>

                <div className="rounded-[14px] border border-slate-900/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#18181b]">
                  <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Atualizado em
                  </div>
                  <div className="mt-1 text-[13px] font-semibold text-slate-900 dark:text-slate-50">
                    {formatDateTime(opinion.updated_at)}
                  </div>
                  {opinion.due_date && (
                    <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                      Prazo: {new Date(opinion.due_date).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Conteúdo */}
        {isLoading ? (
          <div className="flex items-center justify-center rounded-[18px] border border-slate-900/10 bg-white py-16 dark:border-white/10 dark:bg-[#18181b]">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-500/20 border-t-orange-500" />
          </div>
        ) : error ? (
          <div className="rounded-[18px] border border-rose-500/25 bg-rose-500/10 px-6 py-8">
            <div className="flex items-center gap-3">
              <Scale className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{error}</p>
            </div>
          </div>
        ) : opinion ? (
          <LegalOpinionPanel
            precatorioId={opinion.precatorio_id}
            initialOpinionId={opinion.id}
            canCreate={canManageOpinions}
            canEdit={canManageOpinions}
            showOpenModuleButton={false}
          />
        ) : null}
      </div>
    </RoleGuard>
  )
}
