import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  DATAJUD_BASE_URL,
  getDataJudFirstSource,
  getDataJudTotalHits,
  normalizeProcessNumber,
  resolveDataJudEndpoint,
  type DataJudConsultaSuccess,
  type DataJudSearchApiResponse,
} from "@/lib/datajud"

export const runtime = "nodejs"

const DATAJUD_DEFAULT_API_KEY =
  "APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=="

function normalizeDataJudAuthorization(value: string | undefined): string {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "")

  if (!cleaned) return DATAJUD_DEFAULT_API_KEY
  return cleaned.startsWith("APIKey ") ? cleaned : `APIKey ${cleaned}`
}

const DATAJUD_API_KEY = normalizeDataJudAuthorization(process.env.DATAJUD_API_KEY)

type DataJudRequestBody = {
  numeroProcesso?: string
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === "string" && message.trim().length > 0) return message
  }
  return "Erro desconhecido."
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase nao configurado no servidor." }, { status: 500 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 })
    }

    const body = ((await request.json().catch(() => ({}))) || {}) as DataJudRequestBody
    const numeroProcesso = normalizeProcessNumber(body?.numeroProcesso)

    if (numeroProcesso.length !== 20) {
      return NextResponse.json(
        { error: "Numero de processo CNJ invalido. Informe exatamente 20 digitos." },
        { status: 400 },
      )
    }

    const resolution = resolveDataJudEndpoint(numeroProcesso)
    if (!resolution) {
      return NextResponse.json(
        {
          error:
            "O tribunal identificado pelo numero de processo nao possui endpoint publico no DataJud.",
        },
        { status: 422 },
      )
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)

    try {
      const response = await fetch(`${DATAJUD_BASE_URL}/${resolution.endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: DATAJUD_API_KEY,
          Accept: "application/json",
        },
        body: JSON.stringify({
          size: 1,
          track_total_hits: true,
          query: {
            match: {
              numeroProcesso,
            },
          },
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const details = await response.text().catch(() => "")
        return NextResponse.json(
          {
            error: "Falha ao consultar DataJud.",
            details: details || `HTTP ${response.status}`,
          },
          { status: 502 },
        )
      }

      const rawResponse = (await response.json()) as DataJudSearchApiResponse
      const source = getDataJudFirstSource(rawResponse)
      const totalResultados = getDataJudTotalHits(rawResponse)
      const payload: DataJudConsultaSuccess = {
        ok: true,
        query: {
          numeroProcesso,
          tribunalAlias: resolution.alias,
          endpoint: resolution.endpoint,
        },
        meta: {
          took: typeof rawResponse.took === "number" ? rawResponse.took : null,
          timedOut: Boolean(rawResponse.timed_out),
          totalResultados,
          fetchedAt: new Date().toISOString(),
        },
        found: Boolean(source),
        source,
        rawResponse,
      }

      return NextResponse.json(payload)
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error: unknown) {
    const message = getErrorMessage(error)
    const status = message.toLowerCase().includes("abort") ? 504 : 500
    return NextResponse.json(
      {
        error:
          status === 504
            ? "A consulta ao DataJud demorou demais para responder."
            : "Erro interno ao consultar DataJud.",
        details: message,
      },
      { status },
    )
  }
}
