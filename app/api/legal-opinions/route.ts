import { NextResponse } from "next/server"
import { z } from "zod"
import {
  legalOpinionCreateSchema,
  legalOpinionListQuerySchema,
} from "@/lib/legal-opinion/schemas"
import {
  hydrateLegalOpinions,
  type LegalOpinionRow,
  requireLegalOpinionContext,
  LegalOpinionApiError,
  toApiErrorResponse,
} from "@/lib/legal-opinion/server"

function zodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message || "Dados invalidos."
}

function normalizeSearchTerm(value?: string) {
  const term = String(value || "").trim()
  return term.length > 0 ? term : ""
}

export async function GET(request: Request) {
  try {
    const ctx = await requireLegalOpinionContext()
    const { searchParams } = new URL(request.url)
    const parsedQuery = legalOpinionListQuerySchema.safeParse(Object.fromEntries(searchParams))

    if (!parsedQuery.success) {
      throw new LegalOpinionApiError(zodErrorMessage(parsedQuery.error), 400)
    }

    const query = parsedQuery.data
    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1

    let dbQuery = ctx.supabase
      .from("legal_opinions")
      .select("*", { count: "exact" })
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: false })

    if (query.status) dbQuery = dbQuery.eq("status", query.status)
    if (query.type) dbQuery = dbQuery.eq("type", query.type)
    if (query.priority) dbQuery = dbQuery.eq("priority", query.priority)
    if (query.assignedTo) dbQuery = dbQuery.eq("assigned_to", query.assignedTo)
    if (query.precatorioId) dbQuery = dbQuery.eq("precatorio_id", query.precatorioId)
    if (query.dueStart) dbQuery = dbQuery.gte("due_date", query.dueStart)
    if (query.dueEnd) dbQuery = dbQuery.lte("due_date", query.dueEnd)

    const searchTerm = normalizeSearchTerm(query.search)
    if (searchTerm) {
      const escaped = searchTerm.replace(/,/g, " ")

      const { data: matchingPrecatorios } = await ctx.supabase
        .from("precatorios")
        .select("id")
        .or(
          `numero_precatorio.ilike.%${escaped}%,numero_processo.ilike.%${escaped}%,credor_nome.ilike.%${escaped}%,titulo.ilike.%${escaped}%`
        )
        .limit(200)

      const precatorioIds = (matchingPrecatorios || []).map((row) => row.id).filter(Boolean)

      const searchClauses = [
        `title.ilike.%${escaped}%`,
        `executive_summary.ilike.%${escaped}%`,
        `analysis.ilike.%${escaped}%`,
      ]

      if (precatorioIds.length > 0) {
        searchClauses.push(`precatorio_id.in.(${precatorioIds.join(",")})`)
      }

      dbQuery = dbQuery.or(searchClauses.join(","))
    }

    const { data, error, count } = await dbQuery.range(from, to)
    if (error) {
      throw new LegalOpinionApiError(error.message, 400)
    }

    const hydrated = await hydrateLegalOpinions(ctx, (data || []) as LegalOpinionRow[])

    return NextResponse.json({
      data: hydrated,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: count || 0,
        totalPages: Math.max(1, Math.ceil((count || 0) / query.pageSize)),
      },
    })
  } catch (error) {
    return toApiErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireLegalOpinionContext()
    const payload = await request.json()
    const parsedBody = legalOpinionCreateSchema.safeParse(payload)

    if (!parsedBody.success) {
      throw new LegalOpinionApiError(zodErrorMessage(parsedBody.error), 400)
    }

    const body = parsedBody.data

    const { data: precatorioExists, error: precatorioError } = await ctx.supabase
      .from("precatorios")
      .select("id")
      .eq("id", body.precatorioId)
      .maybeSingle()

    if (precatorioError) {
      throw new LegalOpinionApiError(precatorioError.message, 400)
    }

    if (!precatorioExists) {
      throw new LegalOpinionApiError("Precatório não encontrado ou sem acesso.", 404)
    }

    if (body.assignedTo) {
      const { data: memberExists, error: memberError } = await ctx.supabase
        .from("tenant_members")
        .select("id")
        .eq("tenant_id", ctx.tenantId)
        .eq("user_id", body.assignedTo)
        .eq("is_active", true)
        .maybeSingle()

      if (memberError) {
        throw new LegalOpinionApiError(memberError.message, 400)
      }

      if (!memberExists) {
        throw new LegalOpinionApiError("Responsável atribuído não pertence ao tenant atual.", 400)
      }
    }

    const insertPayload = {
      tenant_id: ctx.tenantId,
      precatorio_id: body.precatorioId,
      requested_by: ctx.userId,
      assigned_to: body.assignedTo || null,
      title: body.title,
      type: body.type,
      status: body.status,
      priority: body.priority,
      due_date: body.dueDate || null,
      executive_summary: body.executiveSummary || null,
      analysis: body.analysis || null,
      recommendation: body.recommendation || null,
      conclusion: body.conclusion || null,
      checklist: body.checklist || {},
    }

    const { data: inserted, error: insertError } = await ctx.supabase
      .from("legal_opinions")
      .insert(insertPayload)
      .select("*")
      .single()

    if (insertError || !inserted) {
      throw new LegalOpinionApiError(insertError?.message || "Falha ao criar parecer.", 400)
    }

    const [hydrated] = await hydrateLegalOpinions(ctx, [inserted as LegalOpinionRow])
    return NextResponse.json({ data: hydrated }, { status: 201 })
  } catch (error) {
    return toApiErrorResponse(error)
  }
}
