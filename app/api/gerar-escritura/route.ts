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
      "Escritura_Cessao_Credito_TEMPLATE.docx"
    )

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: "Template não encontrado" },
        { status: 404 }
      )
    }

    const templateBuffer = fs.readFileSync(templatePath)
    const zip = await JSZip.loadAsync(templateBuffer)

    // Arquivos XML que podem conter variáveis
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

      // Primeiro: juntar runs partidos que possam ter quebrado variáveis
      // Padrão: {{...}} pode estar dividido entre tags XML
      xml = repararVariaveisPartidas(xml)

      // Substituir todas as variáveis
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
        "Content-Disposition": `attachment; filename="Escritura_Cessao_Credito.docx"`,
      },
    })
  } catch (error) {
    console.error("[gerar-escritura] Erro:", error)
    return NextResponse.json(
      { error: "Erro ao gerar escritura" },
      { status: 500 }
    )
  }
}

/**
 * Repara variáveis que podem ter sido partidas entre runs do Word.
 * Remove tags XML de dentro de padrões {{...}}.
 */
function repararVariaveisPartidas(xml: string): string {
  // Regex que captura {{...}} onde o conteúdo pode ter tags XML intercaladas
  return xml.replace(/\{\{([^}]*?(?:<[^>]+>[^}]*?)*?)\}\}/g, (match) => {
    // Remove todas as tags XML de dentro do match e retorna o placeholder limpo
    const limpo = match.replace(/<[^>]+>/g, "")
    return limpo
  })
}

/**
 * Escapa caracteres especiais XML para valores substituídos.
 */
function escaparXml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
