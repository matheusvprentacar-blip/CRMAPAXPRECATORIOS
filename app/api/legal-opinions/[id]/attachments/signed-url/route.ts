import { NextResponse } from "next/server"
import { z } from "zod"
import { legalOpinionAttachmentSignedUrlSchema } from "@/lib/legal-opinion/schemas"
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
    const parsedBody = legalOpinionAttachmentSignedUrlSchema.safeParse(payload)
    if (!parsedBody.success) {
      throw new LegalOpinionApiError(zodErrorMessage(parsedBody.error), 400)
    }

    const opinionId = parsedParams.data.id

    const { data: attachment, error: attachmentError } = await ctx.supabase
      .from("legal_opinion_attachments")
      .select("id, storage_path, file_name")
      .eq("tenant_id", ctx.tenantId)
      .eq("legal_opinion_id", opinionId)
      .eq("id", parsedBody.data.attachmentId)
      .maybeSingle()

    if (attachmentError) {
      throw new LegalOpinionApiError(attachmentError.message, 400)
    }

    if (!attachment) {
      throw new LegalOpinionApiError("Anexo não encontrado.", 404)
    }

    const { data: signedData, error: signedError } = await ctx.supabase.storage
      .from("legal-opinions")
      .createSignedUrl(attachment.storage_path, parsedBody.data.expiresIn)

    if (signedError || !signedData?.signedUrl) {
      throw new LegalOpinionApiError(signedError?.message || "Falha ao gerar URL assinada.", 400)
    }

    return NextResponse.json({
      data: {
        attachmentId: attachment.id,
        fileName: attachment.file_name,
        signedUrl: signedData.signedUrl,
        expiresIn: parsedBody.data.expiresIn,
      },
    })
  } catch (error) {
    return toApiErrorResponse(error)
  }
}

