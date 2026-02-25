import { NextResponse } from "next/server"
import { z } from "zod"
import { legalOpinionAttachmentCreateSchema } from "@/lib/legal-opinion/schemas"
import {
  hydrateLegalAttachments,
  type LegalOpinionAttachmentRow,
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
      throw new LegalOpinionApiError("Parecer jurídico inválido.", 400)
    }

    const opinionId = parsedParams.data.id
    const { data, error } = await ctx.supabase
      .from("legal_opinion_attachments")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("legal_opinion_id", opinionId)
      .order("created_at", { ascending: false })

    if (error) {
      throw new LegalOpinionApiError(error.message, 400)
    }

    const hydrated = await hydrateLegalAttachments(ctx, (data || []) as LegalOpinionAttachmentRow[])
    return NextResponse.json({ data: hydrated })
  } catch (error) {
    return toApiErrorResponse(error)
  }
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
    const parsedBody = legalOpinionAttachmentCreateSchema.safeParse(payload)
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

    const expectedPrefix = `${ctx.tenantId}/${opinionId}/`
    if (!parsedBody.data.storagePath.startsWith(expectedPrefix)) {
      throw new LegalOpinionApiError(
        "Caminho do anexo inválido. Use o padrão tenant_id/legal_opinion_id/arquivo.",
        400
      )
    }

    const { data: inserted, error: insertError } = await ctx.supabase
      .from("legal_opinion_attachments")
      .insert({
        tenant_id: ctx.tenantId,
        legal_opinion_id: opinionId,
        storage_path: parsedBody.data.storagePath,
        file_name: parsedBody.data.fileName,
        mime_type: parsedBody.data.mimeType,
        size: parsedBody.data.size,
        uploaded_by: ctx.userId,
      })
      .select("*")
      .single()

    if (insertError || !inserted) {
      throw new LegalOpinionApiError(insertError?.message || "Falha ao registrar anexo.", 400)
    }

    await ctx.supabase.rpc("log_legal_opinion_event", {
      p_legal_opinion_id: opinionId,
      p_event_type: "attachment_added",
      p_payload: {
        attachment_id: inserted.id,
        file_name: inserted.file_name,
      },
    })

    const [hydrated] = await hydrateLegalAttachments(ctx, [inserted as LegalOpinionAttachmentRow])
    return NextResponse.json({ data: hydrated }, { status: 201 })
  } catch (error) {
    return toApiErrorResponse(error)
  }
}
