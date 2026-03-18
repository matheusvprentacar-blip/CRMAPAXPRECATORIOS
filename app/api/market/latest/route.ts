import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getLatestSnapshot, isSnapshotStale } from "@/services/market-data"

export const runtime = "nodejs"

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === "string" && message.trim().length > 0) return message
  }
  return "Erro desconhecido"
}

function normalizeRoles(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof input === "string" && input.trim().length > 0) {
    return [input.trim()]
  }
  return []
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(`${dateA}T00:00:00`)
  const b = new Date(`${dateB}T00:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0
  const diffMs = Math.abs(a.getTime() - b.getTime())
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function saoPauloTodayIso(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const getPart = (type: string) => parts.find((part) => part.type === type)?.value || ""
  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`
}

export async function GET() {
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

    const { data: profile } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const roles = normalizeRoles(profile?.role)

    const snapshot = await getLatestSnapshot(supabase)
    if (!snapshot) {
      return NextResponse.json(
        {
          snapshot: null,
          stale: true,
          staleDays: null,
          canRefresh: roles.includes("admin") || roles.includes("gestor"),
          message: "Nenhum snapshot de mercado encontrado.",
        },
        { status: 404 },
      )
    }

    const todayIso = saoPauloTodayIso()
    const stale = isSnapshotStale(snapshot)
    const staleDays = daysBetween(snapshot.refDate, todayIso)

    return NextResponse.json({
      snapshot,
      stale,
      staleDays,
      canRefresh: roles.includes("admin") || roles.includes("gestor"),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erro interno ao carregar snapshot de mercado.",
        details: getErrorMessage(error),
      },
      { status: 500 },
    )
  }
}
