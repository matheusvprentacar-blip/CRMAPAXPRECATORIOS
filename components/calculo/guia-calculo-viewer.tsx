"use client"

import { useEffect, useMemo, useState } from "react"

type GuideDetailSection = {
  title: string
  summary: string
  items: string[]
}

type CalculoFlowHighlightedNode = {
  title: string
  formula: string[]
  objective: string
  logic: string[]
  alerts: string[]
}

type CalculoFlowStep = {
  title: string
  summary: string
  objective: string
  inputs: string[]
  operations: string[]
  outputs: string[]
  explanations: string[]
  codeRefs: string[]
}

type CalculoFlowGuide = {
  sourcePath: string
  updatedAt: string
  overview: string
  highlightedNode: CalculoFlowHighlightedNode
  steps: CalculoFlowStep[]
  engineRules: GuideDetailSection[]
  closingFormulas: GuideDetailSection[]
  divergences: string[]
  syncNotes: string[]
}

interface GuiaCalculoViewerProps {
  onClose: () => void
}

const palette = {
  surface: "#ffffff",
  muted: "#f6f7fb",
  border: "rgba(0,0,0,0.08)",
  ink: "#0b0c10",
  text: "#374151",
  soft: "#9ca3af",
  accent: "#0e4d6a",
  accentSoft: "rgba(14,77,106,0.08)",
  accentMid: "rgba(14,77,106,0.2)",
  danger: "#dc2626",
  dangerSoft: "rgba(220,38,38,0.08)",
}

function PillList({ items, tone = "accent" }: { items: string[]; tone?: "accent" | "danger" }) {
  const theme =
    tone === "danger"
      ? {
          background: palette.dangerSoft,
          border: "rgba(220,38,38,0.16)",
          color: palette.danger,
        }
      : {
          background: palette.accentSoft,
          border: palette.accentMid,
          color: palette.accent,
        }

  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
          style={{ background: theme.background, border: `1px solid ${theme.border}`, color: theme.color }}
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function Block({
  title,
  items,
  tone = "default",
}: {
  title: string
  items: string[]
  tone?: "default" | "danger"
}) {
  if (items.length === 0) return null

  return (
    <div
      className="rounded-[14px] p-3"
      style={{
        background: tone === "danger" ? palette.dangerSoft : palette.muted,
        border: `1px solid ${tone === "danger" ? "rgba(220,38,38,0.15)" : palette.border}`,
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: tone === "danger" ? palette.danger : palette.soft }}>
        {title}
      </p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="flex gap-2 text-[12px]" style={{ color: tone === "danger" ? palette.danger : palette.text }}>
            <span style={{ color: tone === "danger" ? palette.danger : palette.accent }}>•</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function GuiaCalculoViewer({ onClose }: GuiaCalculoViewerProps) {
  const [guide, setGuide] = useState<CalculoFlowGuide | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadGuide() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch("/api/knowledge/calculo-flow", { cache: "no-store" })
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || "Não foi possível carregar o guia do cálculo.")
        }

        const payload = (await response.json()) as CalculoFlowGuide
        if (!cancelled) {
          setGuide(payload)
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Erro ao carregar o guia.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadGuide()

    return () => {
      cancelled = true
    }
  }, [])

  const updatedLabel = useMemo(() => {
    if (!guide?.updatedAt) return "Sem data"
    return new Date(guide.updatedAt).toLocaleString("pt-BR")
  }, [guide?.updatedAt])

  return (
    <div className="flex h-full flex-col" style={{ background: palette.surface }}>
      <div className="flex items-start justify-between gap-3 px-4 py-4 shrink-0" style={{ borderBottom: `1px solid ${palette.border}` }}>
        <div className="min-w-0">
          <p className="text-[14px] font-black tracking-tight" style={{ color: palette.ink }}>
            Guia do cálculo
          </p>
          <p className="text-[11px] mt-1" style={{ color: palette.soft }}>
            Este painel lê o fluxo diretamente do Obsidian.
          </p>
          {guide && (
            <p className="text-[10px] mt-1" style={{ color: palette.soft }}>
              Fonte: <span style={{ color: palette.accent }}>{guide.sourcePath}</span> • Atualizado em {updatedLabel}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: palette.muted, border: `1px solid ${palette.border}`, color: palette.text }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading && (
          <div className="rounded-[16px] p-6 text-center" style={{ background: palette.muted, border: `1px solid ${palette.border}` }}>
            <div
              className="mx-auto h-7 w-7 rounded-full border-[3px] animate-spin"
              style={{ borderColor: "rgba(14,77,106,0.15)", borderTopColor: palette.accent }}
            />
            <p className="text-[12px] mt-3" style={{ color: palette.soft }}>
              Carregando fluxo do Obsidian...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-[16px] p-4" style={{ background: palette.dangerSoft, border: "1px solid rgba(220,38,38,0.15)" }}>
            <p className="text-[12px] font-bold" style={{ color: palette.danger }}>
              Falha ao carregar o guia
            </p>
            <p className="text-[12px] mt-1" style={{ color: palette.danger }}>
              {error}
            </p>
          </div>
        )}

        {!loading && guide && (
          <>
            <div className="rounded-[18px] p-4" style={{ background: palette.muted, border: `1px solid ${palette.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: palette.soft }}>
                Visão operacional
              </p>
              <p className="text-[12.5px] mt-2 leading-6" style={{ color: palette.text }}>
                {guide.overview}
              </p>
            </div>

            <div
              className="rounded-[20px] p-5"
              style={{
                background: `linear-gradient(160deg, ${palette.accent}, #134a65)`,
                border: `1px solid ${palette.accentMid}`,
                boxShadow: "0 12px 30px rgba(14,77,106,0.18)",
                color: "#ffffff",
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.72)" }}>
                Nó mestre do cálculo
              </p>
              <p className="text-[20px] font-black leading-tight mt-2">{guide.highlightedNode.title}</p>
              <p className="text-[12.5px] leading-6 mt-3" style={{ color: "rgba(255,255,255,0.88)" }}>
                {guide.highlightedNode.objective}
              </p>

              <div className="mt-4 space-y-3">
                <Block title="Fórmula de leitura" items={guide.highlightedNode.formula} />
                <Block title="Ordem lógica" items={guide.highlightedNode.logic} />
                <Block title="Alertas" items={guide.highlightedNode.alerts} tone="danger" />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: palette.soft }}>
                  Passo a passo
                </p>
                <p className="text-[12px] mt-1" style={{ color: palette.text }}>
                  Cada etapa foi separada para facilitar leitura, alteração no Obsidian e handoff entre agentes.
                </p>
              </div>

              {guide.steps.map((step, index) => (
                <details
                  key={step.title}
                  open={index === 0}
                  className="rounded-[18px] overflow-hidden"
                  style={{ background: palette.surface, border: `1px solid ${palette.border}` }}
                >
                  <summary className="cursor-pointer list-none px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-black leading-tight" style={{ color: palette.ink }}>
                          {step.title}
                        </p>
                        {step.summary && (
                          <p className="text-[11px] mt-1" style={{ color: palette.soft }}>
                            {step.summary}
                          </p>
                        )}
                      </div>
                      <span
                        className="inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold"
                        style={{ background: palette.accentSoft, border: `1px solid ${palette.accentMid}`, color: palette.accent }}
                      >
                        Etapa
                      </span>
                    </div>
                  </summary>

                  <div className="px-4 pb-4 space-y-3" style={{ borderTop: `1px solid ${palette.border}` }}>
                    {step.objective && (
                      <div className="rounded-[14px] p-3 mt-3" style={{ background: palette.muted, border: `1px solid ${palette.border}` }}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: palette.soft }}>
                          Objetivo
                        </p>
                        <p className="text-[12px] mt-2 leading-6" style={{ color: palette.text }}>
                          {step.objective}
                        </p>
                      </div>
                    )}

                    <Block title="Entradas" items={step.inputs} />
                    <Block title="Operações" items={step.operations} />
                    <Block title="Saídas" items={step.outputs} />
                    <Block title="Explicações separadas" items={step.explanations} />
                    <Block title="Código relacionado" items={step.codeRefs} />
                  </div>
                </details>
              ))}
            </div>

            {guide.engineRules.length > 0 && (
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: palette.soft }}>
                  Regras da engine
                </p>
                {guide.engineRules.map((rule) => (
                  <div key={rule.title} className="rounded-[16px] p-4" style={{ background: palette.surface, border: `1px solid ${palette.border}` }}>
                    <p className="text-[13px] font-bold" style={{ color: palette.ink }}>
                      {rule.title}
                    </p>
                    {rule.summary && (
                      <p className="text-[11px] mt-1" style={{ color: palette.soft }}>
                        {rule.summary}
                      </p>
                    )}
                    <div className="mt-3">
                      <PillList items={rule.items} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {guide.closingFormulas.length > 0 && (
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: palette.soft }}>
                  Fórmulas de fechamento
                </p>
                {guide.closingFormulas.map((formula) => (
                  <div key={formula.title} className="rounded-[16px] p-4" style={{ background: palette.surface, border: `1px solid ${palette.border}` }}>
                    <p className="text-[13px] font-bold" style={{ color: palette.ink }}>
                      {formula.title}
                    </p>
                    <div className="mt-3">
                      <PillList items={formula.items} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {guide.divergences.length > 0 && (
              <div className="rounded-[16px] p-4" style={{ background: palette.dangerSoft, border: "1px solid rgba(220,38,38,0.15)" }}>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: palette.danger }}>
                  Diferenças entre UI e engine
                </p>
                <div className="mt-3">
                  <PillList items={guide.divergences} tone="danger" />
                </div>
              </div>
            )}

            {guide.syncNotes.length > 0 && (
              <div className="rounded-[16px] p-4" style={{ background: palette.muted, border: `1px solid ${palette.border}` }}>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: palette.soft }}>
                  Sincronização com Obsidian
                </p>
                <div className="mt-3">
                  <PillList items={guide.syncNotes} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
