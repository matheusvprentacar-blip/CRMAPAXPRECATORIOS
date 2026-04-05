import { NextResponse } from "next/server"
import { processarPDF } from "@/lib/server/nova-pipeline-ocr"

export const runtime = "nodejs"
export const maxDuration = 120

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 })
    }

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) {
      return NextResponse.json(
        { error: "Apenas arquivos PDF são aceitos nesta rota." },
        { status: 400 }
      )
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Limite: 20 MB por PDF." },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const resultado = await processarPDF(buffer, file.name)

    return NextResponse.json({ ok: true, resultado })
  } catch (err) {
    console.error("[OCR_LOTE]", err)
    const message = err instanceof Error ? err.message : "Erro interno no servidor."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
