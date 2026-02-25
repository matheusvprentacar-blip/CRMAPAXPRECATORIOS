"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button, Card, Chip, Spinner } from "@heroui/react"
import { getLegalOpinionDetail } from "@/features/legal-opinion/api"
import { LEGAL_OPINION_STATUS_COLORS, LEGAL_OPINION_STATUS_LABELS, type LegalOpinion } from "@/features/legal-opinion/types"
import { formatDateTime } from "@/features/legal-opinion/format"
import { ArrowLeft, Scale } from "@/components/icons"
import { LegalOpinionPanel } from "@/features/legal-opinion/components/legal-opinion-panel"

export default function LegalOpinionDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const opinionId = searchParams.get("id") || ""

  const [isLoading, setIsLoading] = useState(true)
  const [opinion, setOpinion] = useState<LegalOpinion | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!opinionId) {
        setError("Parecer nao informado.")
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const detail = await getLegalOpinionDetail(opinionId)
        setOpinion(detail.data)
        setError(null)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Falha ao carregar parecer.")
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [opinionId])

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Card className="border border-default-200/75 bg-content1 shadow-sm">
        <Card.Header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Dashboard / Parecer Juridico / Detalhes</div>
            <Card.Title className="flex items-center gap-2 text-xl font-semibold">
              <Scale className="h-5 w-5 text-primary" />
              {opinion?.title || "Detalhes do parecer"}
            </Card.Title>
            <Card.Description>
              Analise detalhada do parecer juridico vinculado ao precatorio.
            </Card.Description>
          </div>
          <div className="flex items-center gap-2">
            {opinion ? (
              <Chip size="sm" variant="flat" color={LEGAL_OPINION_STATUS_COLORS[opinion.status]}>
                {LEGAL_OPINION_STATUS_LABELS[opinion.status]}
              </Chip>
            ) : null}
            <Button variant="secondary" size="sm" onPress={() => router.push("/parecer-juridico")}>
              <ArrowLeft className="h-4 w-4" />
              Voltar para lista
            </Button>
          </div>
        </Card.Header>
        {opinion ? (
          <Card.Content className="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
            <div className="rounded-xl border border-default-200/70 bg-default-100/45 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/60">Precatório</p>
              <p className="mt-1 font-medium">
                {opinion.precatorio?.numero_precatorio || opinion.precatorio?.titulo || "Nao informado"}
              </p>
            </div>
            <div className="rounded-xl border border-default-200/70 bg-default-100/45 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/60">Responsavel</p>
              <p className="mt-1 font-medium">{opinion.assigned_to_user?.nome || "Nao atribuido"}</p>
            </div>
            <div className="rounded-xl border border-default-200/70 bg-default-100/45 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/60">Atualizado em</p>
              <p className="mt-1 font-medium">{formatDateTime(opinion.updated_at)}</p>
            </div>
          </Card.Content>
        ) : null}
      </Card>

      {isLoading ? (
        <Card className="border border-default-200/75 bg-content1">
          <Card.Content className="flex items-center justify-center py-16">
            <Spinner size="sm" />
          </Card.Content>
        </Card>
      ) : error ? (
        <Card className="border border-danger/40 bg-danger/10">
          <Card.Content className="py-8 text-sm text-danger">{error}</Card.Content>
        </Card>
      ) : opinion ? (
        <LegalOpinionPanel
          precatorioId={opinion.precatorio_id}
          initialOpinionId={opinion.id}
          showOpenModuleButton={false}
        />
      ) : null}
    </div>
  )
}

