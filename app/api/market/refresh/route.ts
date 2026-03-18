import { NextResponse } from "next/server"
import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { refreshTodaySnapshot } from "@/services/market-data"

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

function isAllowedRole(roles: string[]): boolean {
  return roles.includes("admin") || roles.includes("gestor")
}

function resolveInternalSecretAuth(request: Request): boolean {
  const expectedSecret = process.env.MARKET_REFRESH_SECRET
  if (!expectedSecret) return false
  const provided = request.headers.get("x-market-refresh-secret") || ""
  return provided.length > 0 && provided === expectedSecret
}

export async function POST(request: Request) {
  try {
    const internalAuth = resolveInternalSecretAuth(request)

    if (!internalAuth) {
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

      const { data: profile, error: profileError } = await supabase
        .from("usuarios")
        .select("role")
        .eq("id", user.id)
        .single()

      if (profileError) {
        return NextResponse.json({ error: "Nao foi possivel validar perfil." }, { status: 403 })
      }

      const roles = normalizeRoles(profile?.role)
      if (!isAllowedRole(roles)) {
        return NextResponse.json({ error: "Apenas admin ou gestor pode atualizar dados de mercado." }, { status: 403 })
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias." },
        { status: 500 },
      )
    }

    const serviceClient = createSupabaseServiceClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const result = await refreshTodaySnapshot(serviceClient)

    return NextResponse.json({
      ok: true,
      created: result.created,
      snapshot: result.snapshot,
      source: internalAuth ? "internal-secret" : "user-trigger",
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erro interno ao atualizar snapshot de mercado.",
        details: getErrorMessage(error),
      },
      { status: 500 },
    )
  }
}
