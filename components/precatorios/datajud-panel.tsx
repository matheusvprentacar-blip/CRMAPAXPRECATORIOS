"use client"

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  FileSearch,
  FileText,
  Info,
  Loader2,
  Search,
} from "@/components/icons"
import { maskProcesso } from "@/lib/masks"
import {
  normalizeProcessNumber,
  resolveDataJudEndpoint,
  type DataJudConsultaSuccess,
  type DataJudNamedValue,
} from "@/lib/datajud"

type DataJudConsultaPanelProps = {
  numeroProcesso?: string | null
  tribunal?: string | null
  titulo?: string | null
}

type ApiErrorPayload = {
  error?: string
  details?: string
}

function isTauriRuntime(): boolean {
  if (typeof window === "undefined") return false
  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window
}

function isDataJudSuccess(value: unknown): value is DataJudConsultaSuccess {
  return Boolean(
    value &&
      typeof value === "object" &&
      "ok" in value &&
      (value as { ok?: unknown }).ok === true &&
      "query" in value &&
      "meta" in value,
  )
}

function getText(value: unknown, fallback = "-"): string {
  if (value === null || value === undefined) return fallback
  if (typeof value === "string") return value.trim() || fallback
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return fallback
}

function formatDateTime(value: unknown): string {
  const text = getText(value, "")
  if (!text) return "-"

  let date = new Date(text)

  // Formato YYYYMMDDHHmmss (ex: 20240412115411)
  if (Number.isNaN(date.getTime()) && /^\d{14}$/.test(text)) {
    date = new Date(
      `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}T${text.slice(8, 10)}:${text.slice(10, 12)}:${text.slice(12, 14)}`
    )
  }

  if (Number.isNaN(date.getTime())) return text

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date)
}

function formatNamedValue(value: DataJudNamedValue | null | undefined): string {
  if (!value) return "-"

  const codigo = getText(value.codigo, "")
  const nome = getText(value.nome, "")

  if (codigo && nome) return `${codigo} - ${nome}`
  return nome || codigo || "-"
}

function formatLooseValue(value: unknown): string {
  if (value === null || value === undefined) return "-"
  if (typeof value === "string") return value.trim() || "-"
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) {
    return value
      .map((item) => formatLooseValue(item))
      .filter((item) => item !== "-")
      .join(", ")
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entryValue]) => {
        const formattedValue = formatLooseValue(entryValue)
        return formattedValue !== "-" ? `${key}: ${formattedValue}` : ""
      })
      .filter(Boolean)
      .join(" | ")
  }
  return String(value)
}

function formatSigilo(value: unknown): string {
  const normalized = Number(value)
  if (Number.isFinite(normalized) && normalized === 0) {
    return "0 - Publico"
  }
  if (value === null || value === undefined || value === "") return "-"
  return getText(value)
}

function renderField({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={mono ? "font-mono text-sm break-all" : "text-sm"}>{value}</p>
    </div>
  )
}

export function DataJudConsultaPanel({
  numeroProcesso,
  tribunal,
  titulo,
}: DataJudConsultaPanelProps) {
  const numeroProcessoLocal = normalizeProcessNumber(numeroProcesso || "")
  const [numeroProcessoInput, setNumeroProcessoInput] = useState(() =>
    maskProcesso(numeroProcessoLocal),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<DataJudConsultaSuccess | null>(null)
  const requestIdRef = useRef(0)
  const processoLocalValido = numeroProcessoLocal.length === 20

  const consultarDataJud = useCallback(async (numeroConsulta: string) => {
    const numeroNormalizado = normalizeProcessNumber(numeroConsulta)
    if (numeroNormalizado.length !== 20) {
      setResponse(null)
      setError("Informe um numero de processo CNJ valido com 20 digitos.")
      return
    }

    const resolution = resolveDataJudEndpoint(numeroNormalizado)
    if (!resolution) {
      setResponse(null)
      setError("O tribunal identificado pelo numero de processo nao possui endpoint publico no DataJud.")
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    setLoading(true)
    setError(null)

    try {
      let payload: unknown

      if (isTauriRuntime()) {
        const { invoke } = await import("@tauri-apps/api/core")
        payload = await invoke<DataJudConsultaSuccess>("consultar_datajud", {
          numeroProcesso: numeroNormalizado,
          tribunalAlias: resolution.alias,
          endpoint: resolution.endpoint,
        })
      } else {
        const res = await fetch("/api/precatorios/datajud", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            numeroProcesso: numeroNormalizado,
          }),
        })

        payload = await res.json().catch(() => null)
        if (!res.ok || !isDataJudSuccess(payload)) {
          const apiError = payload && typeof payload === "object" ? (payload as ApiErrorPayload) : null
          const message =
            apiError && typeof apiError.error === "string" && apiError.error.trim().length > 0
              ? apiError.error
              : `Falha ao consultar DataJud (${res.status}).`
          const details =
            apiError && typeof apiError.details === "string" && apiError.details.trim().length > 0
              ? ` ${apiError.details}`
              : ""
          throw new Error(`${message}${details}`)
        }
      }

      if (!isDataJudSuccess(payload)) {
        throw new Error("Resposta inesperada ao consultar DataJud.")
      }

      if (requestIdRef.current !== requestId) return
      setResponse(payload)
    } catch (fetchError) {
      if (requestIdRef.current !== requestId) return
      setResponse(null)
      setError(fetchError instanceof Error ? fetchError.message : "Erro inesperado ao consultar DataJud.")
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const initial = maskProcesso(numeroProcessoLocal)
    setNumeroProcessoInput(initial)
    setError(null)
    setResponse(null)

    if (processoLocalValido) {
      void consultarDataJud(initial)
    }
  }, [consultarDataJud, numeroProcessoLocal, processoLocalValido])

  const normalizedInput = normalizeProcessNumber(numeroProcessoInput)
  const endpointPreview = normalizedInput.length === 20 ? resolveDataJudEndpoint(normalizedInput) : null
  const source = response?.source || null
  const assuntos = Array.isArray(source?.assuntos) ? source.assuntos : []
  const movimentos = Array.isArray(source?.movimentos) ? source.movimentos : []
  const rawResponseJson = response ? JSON.stringify(response.rawResponse, null, 2) : ""

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void consultarDataJud(numeroProcessoInput)
  }

  const handleReset = () => {
    const initial = maskProcesso(numeroProcessoLocal)
    setNumeroProcessoInput(initial)
    setError(null)
    setResponse(null)

    if (processoLocalValido) {
      void consultarDataJud(initial)
    }
  }

  return (
    <Card className="overflow-hidden border-border/80 bg-background/80 shadow-sm backdrop-blur">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileSearch className="h-5 w-5" />
              Consulta DataJud
            </CardTitle>
            <CardDescription className="max-w-3xl">
              Consulta externa e somente leitura na API publica do CNJ. Os dados retornados nao
              sobrescrevem o cadastro local e servem para consultas rapidas do processo.
            </CardDescription>
          </div>
          <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 text-primary">
            Area separada
          </Badge>
        </div>

        {titulo ? (
          <p className="text-sm text-muted-foreground">
            Precatório: <span className="font-medium text-foreground">{titulo}</span>
          </p>
        ) : null}

        {!processoLocalValido ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-700 dark:text-amber-300">
                  {numeroProcessoLocal
                    ? "O numero de processo cadastrado nao parece um CNJ valido."
                    : "Este precatório ainda nao tem numero de processo CNJ cadastrado."}
                </p>
                <p className="text-sm text-amber-700/90 dark:text-amber-200/90">
                  A consulta DataJud precisa de um numero CNJ com 20 digitos. O numero do precatorio
                  nao substitui o processo; voce pode digitar o processo manualmente acima para fazer
                  a consulta rapida.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Numero do processo
              </p>
              <Input
                value={numeroProcessoInput}
                onChange={(event) => setNumeroProcessoInput(maskProcesso(event.target.value))}
                placeholder="0000000-00.0000.0.00.0000"
                inputMode="numeric"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Use o numero CNJ do precatorio. Se quiser consultar outro processo, basta trocar o valor
                aqui sem alterar nenhum dado salvo.
              </p>
            </div>

            <div className="flex flex-col gap-2 lg:self-end">
              <Button type="submit" disabled={loading || normalizedInput.length !== 20} className="min-w-40">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                {loading ? "Consultando..." : "Consultar"}
              </Button>
              <Button type="button" variant="outline" onClick={handleReset} className="min-w-40">
                Voltar ao processo do precatório
              </Button>
            </div>
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {endpointPreview ? (
            <Badge variant="secondary" className="rounded-full">
              Endpoint {endpointPreview.alias}
            </Badge>
          ) : (
            <Badge variant="outline" className="rounded-full">
              Aguardando numero CNJ valido
            </Badge>
          )}
          {tribunal ? (
            <Badge variant="outline" className="rounded-full">
              Tribunal local: {tribunal}
            </Badge>
          ) : null}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-muted/30 p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="font-medium">Consultando DataJud</p>
                <p className="text-sm text-muted-foreground">
                  Buscando dados oficiais do processo na API publica do CNJ.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-destructive">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5" />
              <div className="space-y-1">
                <p className="font-semibold">Nao foi possivel consultar o DataJud</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        ) : null}

        {!loading && !error && response && !response.found ? (
          <div className="rounded-2xl border border-border bg-muted/30 p-5">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div className="space-y-1">
                <p className="font-semibold">Nenhum resultado retornado pela API publica</p>
                <p className="text-sm text-muted-foreground">
                  Isso pode acontecer se o processo estiver em sigilo, se o tribunal ainda nao estiver
                  disponivel no DataJud ou se o numero informado nao tiver correspondencia publica.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {!loading && response?.found && source ? (
          <div className="space-y-6">
            {response.meta.timedOut ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-700 dark:text-amber-300">
                      A API respondeu com timeout parcial
                    </p>
                    <p className="text-sm text-amber-700/90 dark:text-amber-200/90">
                      O resultado foi encontrado, mas o retorno indicou timeout no processamento da busca.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                <div>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                    Processo localizado no DataJud
                  </p>
                  <p className="text-sm text-emerald-700/90 dark:text-emerald-200/90">
                    Resultado somente leitura, sem impacto no cadastro do precatório.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="border-border/70 bg-muted/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4" />
                    Identificacao do processo
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  {renderField({
                    label: "Numero do processo",
                    value: getText(source.numeroProcesso || normalizedInput),
                    mono: true,
                  })}
                  {renderField({
                    label: "Tribunal",
                    value: getText(source.tribunal || response.query.tribunalAlias.toUpperCase()),
                  })}
                  {renderField({
                    label: "Endpoint consultado",
                    value: `${response.query.endpoint}`,
                    mono: true,
                  })}
                  {renderField({
                    label: "Grau",
                    value: getText(source.grau),
                  })}
                  {renderField({
                    label: "Nivel de sigilo",
                    value: formatSigilo(source.nivelSigilo),
                  })}
                  {renderField({
                    label: "Data de ajuizamento",
                    value: formatDateTime(source.dataAjuizamento),
                  })}
                  {renderField({
                    label: "Sistema",
                    value: formatNamedValue(source.sistema),
                  })}
                  {renderField({
                    label: "Formato",
                    value: formatNamedValue(source.formato),
                  })}
                  {renderField({
                    label: "Orgao julgador",
                    value: formatNamedValue(source.orgaoJulgador),
                  })}
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-muted/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Classe e assuntos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {renderField({
                      label: "Classe processual",
                      value: formatNamedValue(source.classe),
                    })}
                    {renderField({
                      label: "Resultados retornados",
                      value: String(response.meta.totalResultados || 0),
                    })}
                    {renderField({
                      label: "Tempo da consulta",
                      value:
                        response.meta.took !== null && response.meta.took !== undefined
                          ? `${response.meta.took} ms`
                          : "-",
                    })}
                    {renderField({
                      label: "Atualizado em",
                      value: formatDateTime(response.meta.fetchedAt),
                    })}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Assuntos ({assuntos.length})
                    </p>
                    {assuntos.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {assuntos.map((assunto, index) => (
                          <Badge
                            key={`${getText(assunto.codigo, "assunto")}-${index}`}
                            variant="outline"
                            className="max-w-full whitespace-normal text-left"
                          >
                            {formatNamedValue(assunto)}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum assunto listado na resposta.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/70 bg-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" />
                  Movimentacoes processuais ({movimentos.length})
                </CardTitle>
                <CardDescription>
                  Lista das movimentacoes que a API publica disponibilizou para este processo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {movimentos.length > 0 ? (
                  <div className="max-h-[28rem] space-y-3 overflow-auto pr-1">
                    {movimentos.map((movimento, index) => {
                      const complementos = Array.isArray(movimento.complementosTabelados)
                        ? movimento.complementosTabelados
                            .map((item) => formatNamedValue(item))
                            .filter((item) => item !== "-")
                        : []

                      return (
                        <div
                          key={`${getText(movimento.dataHora, "movimento")}-${index}`}
                          className="rounded-2xl border border-border bg-background/80 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="font-medium">{getText(movimento.nome)}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(movimento.dataHora)}
                              </p>
                            </div>
                            {complementos.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {complementos.map((complemento, complementoIndex) => (
                                  <Badge
                                    key={`${complemento}-${complementoIndex}`}
                                    variant="secondary"
                                    className="max-w-full whitespace-normal"
                                  >
                                    {complemento}
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          {movimento.complemento ? (
                            <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                              {formatLooseValue(movimento.complemento)}
                            </p>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">
                    Nenhuma movimentacao retornou da API publica.
                  </div>
                )}
              </CardContent>
            </Card>

            <details className="rounded-2xl border border-border bg-background/80 p-4">
              <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                Resposta bruta da API
              </summary>
              <Separator className="my-4" />
              <div className="max-h-[32rem] overflow-auto rounded-xl bg-muted/40 p-4">
                <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-foreground">
                  {rawResponseJson}
                </pre>
              </div>
            </details>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
