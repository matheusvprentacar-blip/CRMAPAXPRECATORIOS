import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getLatestSnapshot } from "@/services/market-data"
import {
  runComparativoSimulation,
  normalizePagamentoDateInput,
  normalizeVendaDateInput,
} from "@/services/simulation"
import { ModoCdi } from "@/services/simulation/types"

export const runtime = "nodejs"

type SimulateBody = {
  dataVenda?: string
  precoCompra?: number | string
  dataPagamento?: string
  modoCdi?: ModoCdi | string
  tesouroTituloNome?: string | null
}

type PrecatorioPriceSource = {
  proposta_menor_valor?: unknown
  saldo_liquido?: unknown
  valor_atualizado?: unknown
  valor_principal?: unknown
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === "string" && message.trim().length > 0) return message
  }
  return "Erro desconhecido"
}

function getSaoPauloTodayIso(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const getPart = (type: string) => parts.find((part) => part.type === type)?.value || ""
  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`
}

function normalizeModoCdi(value: unknown): ModoCdi {
  return value === "cdi_plus_10pp" ? "cdi_plus_10pp" : "cdi_110"
}

function parsePrecoCompra(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

function pickDefaultPrecoCompra(precatorio: PrecatorioPriceSource): number {
  const candidates = [
    precatorio?.proposta_menor_valor,
    precatorio?.saldo_liquido,
    precatorio?.valor_atualizado,
    precatorio?.valor_principal,
  ]

  for (const candidate of candidates) {
    const parsed = Number(candidate)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }

  return 0
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: "ID do precatorio nao informado." }, { status: 400 })
    }

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

    const { data: precatorio, error: precatorioError } = await supabase
      .from("precatorios")
      .select("id, previsao_pagamento, proposta_menor_valor, saldo_liquido, valor_atualizado, valor_principal")
      .eq("id", id)
      .maybeSingle()

    if (precatorioError) {
      return NextResponse.json({ error: "Falha ao carregar precatorio.", details: precatorioError.message }, { status: 500 })
    }

    if (!precatorio) {
      return NextResponse.json({ error: "Precatorio nao encontrado ou sem permissao de acesso." }, { status: 404 })
    }

    const snapshot = await getLatestSnapshot(supabase)
    if (!snapshot) {
      return NextResponse.json({ error: "Nenhum snapshot de mercado disponivel. Atualize os dados de mercado primeiro." }, { status: 409 })
    }

    const body = (await request.json().catch(() => ({}))) as SimulateBody

    const defaultDataVenda = getSaoPauloTodayIso()
    const dataVenda = normalizeVendaDateInput(body?.dataVenda || defaultDataVenda) || defaultDataVenda

    const pagamentoRaw =
      normalizePagamentoDateInput(body?.dataPagamento || "") || normalizePagamentoDateInput(String(precatorio?.previsao_pagamento || ""))

    if (!pagamentoRaw) {
      return NextResponse.json(
        { error: "Data de pagamento nao informada. Defina no cenario ou no cadastro do precatorio." },
        { status: 400 },
      )
    }

    const bodyPrecoCompra = parsePrecoCompra(body?.precoCompra)
    const precoCompra = bodyPrecoCompra > 0 ? bodyPrecoCompra : pickDefaultPrecoCompra(precatorio)

    if (precoCompra <= 0) {
      return NextResponse.json(
        {
          error:
            "Preco de compra invalido. Informe um valor maior que zero para simular o comparativo.",
        },
        { status: 400 },
      )
    }

    const modoCdi = normalizeModoCdi(body?.modoCdi)

    const normalizedInput = {
      dataVenda,
      precoCompra,
      dataPagamento: pagamentoRaw,
      modoCdi,
      tesouroTituloNome: body?.tesouroTituloNome || null,
    }

    const simulation = runComparativoSimulation(snapshot, normalizedInput)

    const { data: inserted, error: insertError } = await supabase
      .from("precatorio_simulations")
      .insert({
        precatorio_id: id,
        created_by: user.id,
        inputs_json: normalizedInput,
        outputs_json: simulation,
        snapshot_ref_date: snapshot.refDate,
      })
      .select("id, created_at")
      .single()

    if (insertError) {
      return NextResponse.json(
        {
          error: "Falha ao persistir simulacao.",
          details: insertError.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      simulationId: inserted?.id || null,
      createdAt: inserted?.created_at || null,
      snapshotRefDate: snapshot.refDate,
      inputs: normalizedInput,
      outputs: simulation,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erro interno ao simular comparativo.",
        details: getErrorMessage(error),
      },
      { status: 500 },
    )
  }
}
