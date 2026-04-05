import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import JSZip from "jszip"

export async function POST(request: NextRequest) {
  try {
    const variaveis: Record<string, string> = await request.json()

    const templatePath = path.join(
      process.cwd(),
      "templates de documentos",
      "Contrato_Cessao_Credito_TEMPLATE.docx"
    )

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: "Template não encontrado" },
        { status: 404 }
      )
    }

    const templateBuffer = fs.readFileSync(templatePath)
    const zip = await JSZip.loadAsync(templateBuffer)

    const xmlTargets = [
      "word/document.xml",
      "word/header1.xml",
      "word/header2.xml",
      "word/footer1.xml",
      "word/footer2.xml",
    ]

    for (const xmlPath of xmlTargets) {
      const file = zip.file(xmlPath)
      if (!file) continue

      let xml = await file.async("string")

      xml = repararVariaveisPartidas(xml)

      for (const [chave, valor] of Object.entries(variaveis)) {
        const placeholder = `{{${chave}}}`
        xml = xml.split(placeholder).join(escaparXml(valor ?? ""))
      }

      zip.file(xmlPath, xml)
    }

    const docxBuffer = await zip.generateAsync({ type: "nodebuffer" })

    return new NextResponse(docxBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="Contrato_Cessao_Credito.docx"`,
      },
    })
  } catch (error) {
    console.error("[gerar-contrato] Erro:", error)
    return NextResponse.json(
      { error: "Erro ao gerar contrato" },
      { status: 500 }
    )
  }
}

function repararVariaveisPartidas(xml: string): string {
  return xml.replace(/\{\{([^}]*?(?:<[^>]+>[^}]*?)*?)\}\}/g, (match) => {
    const limpo = match.replace(/<[^>]+>/g, "")
    return limpo
  })
}

function escaparXml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
