import { NextResponse } from "next/server"
import { z } from "zod"
import { legalOpinionCommentCreateSchema } from "@/lib/legal-opinion/schemas"
import {
  hydrateLegalComments,
  type LegalOpinionCommentRow,
  LegalOpinionApiError,
  requireLegalOpinionContext,
  toApiErrorResponse,
} from "@/lib/legal-opinion/server"

const paramsSchema = z.object({
  id: z.string().uuid(),
})

function zodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message || "Dados invalidos."
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireLegalOpinionContext()
    const parsedParams = paramsSchema.safeParse(await context.params)
    if (!parsedParams.success) {
      throw new LegalOpinionApiError("Parecer jurídico inválido.", 400)
    }

    const payload = await request.json()
    const parsedBody = legalOpinionCommentCreateSchema.safeParse(payload)
    if (!parsedBody.success) {
      throw new LegalOpinionApiError(zodErrorMessage(parsedBody.error), 400)
    }

    const opinionId = parsedParams.data.id
    const { data: opinion, error: opinionError } = await ctx.supabase
      .from("legal_opinions")
      .select("id, tenant_id")
      .eq("tenant_id", ctx.tenantId)
      .eq("id", opinionId)
      .maybeSingle()

    if (opinionError) {
      throw new LegalOpinionApiError(opinionError.message, 400)
    }

    if (!opinion) {
      throw new LegalOpinionApiError("Parecer jurídico não encontrado.", 404)
    }

    const { data: inserted, error: insertError } = await ctx.supabase
      .from("legal_opinion_comments")
      .insert({
        tenant_id: ctx.tenantId,
        legal_opinion_id: opinionId,
        author_id: ctx.userId,
        content: parsedBody.data.content,
      })
      .select("*")
      .single()

    if (insertError || !inserted) {
      throw new LegalOpinionApiError(insertError?.message || "Falha ao criar comentário.", 400)
    }

    await ctx.supabase.rpc("log_legal_opinion_event", {
      p_legal_opinion_id: opinionId,
      p_event_type: "comment_added",
      p_payload: { comment_id: inserted.id },
    })

    const [hydrated] = await hydrateLegalComments(ctx, [inserted as LegalOpinionCommentRow])
    return NextResponse.json({ data: hydrated }, { status: 201 })
  } catch (error) {
    return toApiErrorResponse(error)
  }
}
