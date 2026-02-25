import { NextResponse } from "next/server"
import { z } from "zod"
import { legalOpinionEventCreateSchema } from "@/lib/legal-opinion/schemas"
import {
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
    const parsedBody = legalOpinionEventCreateSchema.safeParse(payload)
    if (!parsedBody.success) {
      throw new LegalOpinionApiError(zodErrorMessage(parsedBody.error), 400)
    }

    const opinionId = parsedParams.data.id
    const { data: opinion, error: opinionError } = await ctx.supabase
      .from("legal_opinions")
      .select("id")
      .eq("tenant_id", ctx.tenantId)
      .eq("id", opinionId)
      .maybeSingle()

    if (opinionError) {
      throw new LegalOpinionApiError(opinionError.message, 400)
    }

    if (!opinion) {
      throw new LegalOpinionApiError("Parecer jurídico não encontrado.", 404)
    }

    const { data: eventId, error: eventError } = await ctx.supabase.rpc("log_legal_opinion_event", {
      p_legal_opinion_id: opinionId,
      p_event_type: parsedBody.data.eventType,
      p_payload: parsedBody.data.payload || {},
    })

    if (eventError) {
      throw new LegalOpinionApiError(eventError.message, 400)
    }

    return NextResponse.json({ data: { id: eventId } }, { status: 201 })
  } catch (error) {
    return toApiErrorResponse(error)
  }
}

