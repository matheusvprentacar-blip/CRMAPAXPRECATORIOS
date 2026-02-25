import { NextResponse } from "next/server"
import { z } from "zod"
import {
  hydrateLegalOpinions,
  type LegalOpinionRow,
  LegalOpinionApiError,
  requireLegalOpinionContext,
  toApiErrorResponse,
} from "@/lib/legal-opinion/server"

const paramsSchema = z.object({
  precatorioId: z.string().uuid(),
})

export async function GET(
  _request: Request,
  context: { params: Promise<{ precatorioId: string }> }
) {
  try {
    const ctx = await requireLegalOpinionContext()
    const parsed = paramsSchema.safeParse(await context.params)
    if (!parsed.success) {
      throw new LegalOpinionApiError("Precatório inválido.", 400)
    }

    const { precatorioId } = parsed.data
    const { data, error } = await ctx.supabase
      .from("legal_opinions")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("precatorio_id", precatorioId)
      .order("created_at", { ascending: false })

    if (error) {
      throw new LegalOpinionApiError(error.message, 400)
    }

    const hydrated = await hydrateLegalOpinions(ctx, (data || []) as LegalOpinionRow[])
    return NextResponse.json({ data: hydrated })
  } catch (error) {
    return toApiErrorResponse(error)
  }
}
