import { NextResponse } from "next/server"
import { z } from "zod"
import {
  LegalOpinionApiError,
  requireLegalOpinionContext,
  toApiErrorResponse,
} from "@/lib/legal-opinion/server"

const querySchema = z.object({
  search: z.string().trim().max(120).optional(),
  precatorioLimit: z.coerce.number().int().min(20).max(300).default(120),
})

export async function GET(request: Request) {
  try {
    const ctx = await requireLegalOpinionContext()
    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams))

    if (!parsed.success) {
      throw new LegalOpinionApiError(parsed.error.issues[0]?.message || "Parametros invalidos.", 400)
    }

    const query = parsed.data
    const search = (query.search || "").trim()

    const { data: tenant } = await ctx.supabase
      .from("tenants")
      .select("id, name, slug")
      .eq("id", ctx.tenantId)
      .maybeSingle()

    const { data: members, error: membersError } = await ctx.supabase
      .from("tenant_members")
      .select("user_id")
      .eq("tenant_id", ctx.tenantId)
      .eq("is_active", true)
      .limit(500)

    if (membersError) {
      throw new LegalOpinionApiError(membersError.message, 400)
    }

    const memberIds = Array.from(
      new Set((members || []).map((item) => item.user_id).filter(Boolean))
    )

    let users: Array<{ id: string; nome: string; email: string | null }> = []

    if (memberIds.length > 0) {
      let usersQuery = ctx.supabase
        .from("usuarios")
        .select("id, nome, email")
        .in("id", memberIds)
        .order("nome", { ascending: true })

      if (search) {
        usersQuery = usersQuery.or(`nome.ilike.%${search}%,email.ilike.%${search}%`)
      }

      const { data: usersData, error: usersError } = await usersQuery
      if (usersError) {
        throw new LegalOpinionApiError(usersError.message, 400)
      }

      users = (usersData || []).map((item) => ({
        id: item.id,
        nome: item.nome || item.email || "Usuario",
        email: item.email || null,
      }))
    }

    let precatoriosQuery = ctx.supabase
      .from("precatorios")
      .select("id, titulo, numero_precatorio, numero_processo, credor_nome")
      .order("created_at", { ascending: false })
      .limit(query.precatorioLimit)

    if (search) {
      precatoriosQuery = precatoriosQuery.or(
        `titulo.ilike.%${search}%,numero_precatorio.ilike.%${search}%,numero_processo.ilike.%${search}%,credor_nome.ilike.%${search}%`
      )
    }

    const { data: precatorios, error: precatoriosError } = await precatoriosQuery
    if (precatoriosError) {
      throw new LegalOpinionApiError(precatoriosError.message, 400)
    }

    return NextResponse.json({
      data: {
        tenant: tenant || null,
        users,
        precatorios: precatorios || [],
      },
    })
  } catch (error) {
    return toApiErrorResponse(error)
  }
}

