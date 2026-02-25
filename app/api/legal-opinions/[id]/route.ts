import { NextResponse } from "next/server"
import { z } from "zod"
import { legalOpinionUpdateSchema } from "@/lib/legal-opinion/schemas"
import {
  hydrateLegalAttachments,
  hydrateLegalComments,
  hydrateLegalEvents,
  hydrateLegalOpinions,
  type LegalOpinionAttachmentRow,
  type LegalOpinionCommentRow,
  type LegalOpinionEventRow,
  type LegalOpinionRow,
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireLegalOpinionContext()
    const parsedParams = paramsSchema.safeParse(await context.params)

    if (!parsedParams.success) {
      throw new LegalOpinionApiError(zodErrorMessage(parsedParams.error), 400)
    }

    const { id } = parsedParams.data

    const { data: opinion, error: opinionError } = await ctx.supabase
      .from("legal_opinions")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("id", id)
      .maybeSingle()

    if (opinionError) {
      throw new LegalOpinionApiError(opinionError.message, 400)
    }

    if (!opinion) {
      throw new LegalOpinionApiError("Parecer jurídico não encontrado.", 404)
    }

    const { data: comments, error: commentsError } = await ctx.supabase
      .from("legal_opinion_comments")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("legal_opinion_id", id)
      .order("created_at", { ascending: false })

    if (commentsError) {
      throw new LegalOpinionApiError(commentsError.message, 400)
    }

    const { data: events, error: eventsError } = await ctx.supabase
      .from("legal_opinion_events")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("legal_opinion_id", id)
      .order("created_at", { ascending: false })

    if (eventsError) {
      throw new LegalOpinionApiError(eventsError.message, 400)
    }

    const { data: attachments, error: attachmentsError } = await ctx.supabase
      .from("legal_opinion_attachments")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("legal_opinion_id", id)
      .order("created_at", { ascending: false })

    if (attachmentsError) {
      throw new LegalOpinionApiError(attachmentsError.message, 400)
    }

    const [hydratedOpinion] = await hydrateLegalOpinions(ctx, [opinion as LegalOpinionRow])
    const hydratedComments = await hydrateLegalComments(ctx, (comments || []) as LegalOpinionCommentRow[])
    const hydratedEvents = await hydrateLegalEvents(ctx, (events || []) as LegalOpinionEventRow[])
    const hydratedAttachments = await hydrateLegalAttachments(
      ctx,
      (attachments || []) as LegalOpinionAttachmentRow[]
    )

    return NextResponse.json({
      data: hydratedOpinion,
      comments: hydratedComments,
      events: hydratedEvents,
      attachments: hydratedAttachments,
    })
  } catch (error) {
    return toApiErrorResponse(error)
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireLegalOpinionContext()
    const parsedParams = paramsSchema.safeParse(await context.params)
    if (!parsedParams.success) {
      throw new LegalOpinionApiError(zodErrorMessage(parsedParams.error), 400)
    }

    const payload = await request.json()
    const parsedBody = legalOpinionUpdateSchema.safeParse(payload)
    if (!parsedBody.success) {
      throw new LegalOpinionApiError(zodErrorMessage(parsedBody.error), 400)
    }

    const { id } = parsedParams.data
    const body = parsedBody.data

    const { data: existingOpinion, error: existingError } = await ctx.supabase
      .from("legal_opinions")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("id", id)
      .maybeSingle()

    if (existingError) {
      throw new LegalOpinionApiError(existingError.message, 400)
    }

    if (!existingOpinion) {
      throw new LegalOpinionApiError("Parecer jurídico não encontrado.", 404)
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

    const updatePayload: Record<string, unknown> = {}

    if (body.assignedTo !== undefined) updatePayload.assigned_to = body.assignedTo || null
    if (body.title !== undefined) updatePayload.title = body.title
    if (body.type !== undefined) updatePayload.type = body.type
    if (body.status !== undefined) updatePayload.status = body.status
    if (body.priority !== undefined) updatePayload.priority = body.priority
    if (body.dueDate !== undefined) updatePayload.due_date = body.dueDate || null
    if (body.executiveSummary !== undefined) updatePayload.executive_summary = body.executiveSummary || null
    if (body.analysis !== undefined) updatePayload.analysis = body.analysis || null
    if (body.recommendation !== undefined) updatePayload.recommendation = body.recommendation || null
    if (body.conclusion !== undefined) updatePayload.conclusion = body.conclusion || null
    if (body.checklist !== undefined) updatePayload.checklist = body.checklist || {}

    const { data: updatedOpinion, error: updateError } = await ctx.supabase
      .from("legal_opinions")
      .update(updatePayload)
      .eq("tenant_id", ctx.tenantId)
      .eq("id", id)
      .select("*")
      .single()

    if (updateError || !updatedOpinion) {
      throw new LegalOpinionApiError(updateError?.message || "Falha ao atualizar parecer.", 400)
    }

    const [hydratedOpinion] = await hydrateLegalOpinions(ctx, [updatedOpinion as LegalOpinionRow])
    return NextResponse.json({ data: hydratedOpinion })
  } catch (error) {
    return toApiErrorResponse(error)
  }
}
