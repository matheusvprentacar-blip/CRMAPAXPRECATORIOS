import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type AiRequestBody = {
  title?: string
  message?: string
  tone?: "formal" | "direto" | "inspirador" | "neutro" | string
}

type AiResponseShape = {
  titulo_sugerido: string
  mensagem_revisada: string
  versao_curta: string
  observacoes: string[]
}

function normalizeRoles(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof input === "string" && input.trim().length > 0) {
    return [input.trim()]
  }
  return []
}

function normalizeTone(value: string | undefined): string {
  const tone = String(value || "neutro").toLowerCase()
  if (tone === "formal" || tone === "direto" || tone === "inspirador" || tone === "neutro") {
    return tone
  }
  return "neutro"
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === "string" && message.trim().length > 0) return message
  }
  return "Erro desconhecido."
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase não configurado no servidor." },
        { status: 500 }
      )
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: "Não foi possível validar perfil." }, { status: 403 })
    }

    const roles = normalizeRoles(profile?.role)
    if (!roles.includes("admin")) {
      return NextResponse.json({ error: "Apenas admin pode usar este recurso." }, { status: 403 })
    }

    const body = (await request.json()) as AiRequestBody
    const title = String(body?.title || "").trim()
    const message = String(body?.message || "").trim()
    const tone = normalizeTone(body?.tone)

    if (!message) {
      return NextResponse.json({ error: "Mensagem é obrigatória." }, { status: 400 })
    }

    if (message.length > 12000) {
      return NextResponse.json({ error: "Mensagem excede o limite de tamanho." }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não configurada no servidor." },
        { status: 500 }
      )
    }

    const toneInstruction: Record<string, string> = {
      formal: "Tom formal, corporativo e objetivo.",
      direto: "Tom direto, curto e com foco em ação.",
      inspirador: "Tom positivo e engajador, sem exageros.",
      neutro: "Tom neutro, claro e profissional.",
    }

    const prompt = `
Você é um revisor profissional de comunicados internos corporativos.
Reescreva e melhore o texto abaixo em português do Brasil sem perder o conteúdo.

Regras:
- Corrigir gramática e ortografia.
- Melhorar clareza e estrutura.
- Manter fatos e instruções originais.
- Evitar linguagem prolixa.
- Retornar JSON válido com as chaves:
  - titulo_sugerido (string)
  - mensagem_revisada (string)
  - versao_curta (string)
  - observacoes (array de strings, máximo 4 itens)

Tom desejado: ${toneInstruction[tone] || toneInstruction.neutro}

Título original:
${title || "(sem título)"}

Mensagem original:
${message}
`.trim()

    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Você é especialista em comunicação interna e deve retornar apenas JSON válido.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    })

    if (!openAiResponse.ok) {
      const errText = await openAiResponse.text()
      return NextResponse.json(
        { error: "Falha ao consultar OpenAI.", details: errText },
        { status: 502 }
      )
    }

    const completion = await openAiResponse.json()
    const content = completion?.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: "Resposta inválida da OpenAI (sem conteúdo)." },
        { status: 502 }
      )
    }

    let parsed: Partial<AiResponseShape> = {}
    try {
      parsed = JSON.parse(content)
    } catch {
      parsed = {
        titulo_sugerido: title || "Comunicado interno",
        mensagem_revisada: content,
        versao_curta: content.slice(0, 240),
        observacoes: ["Resposta retornada fora do formato JSON esperado."],
      }
    }

    const payload: AiResponseShape = {
      titulo_sugerido:
        String(parsed.titulo_sugerido || "").trim() || title || "Comunicado interno",
      mensagem_revisada:
        String(parsed.mensagem_revisada || "").trim() || message,
      versao_curta:
        String(parsed.versao_curta || "").trim() ||
        String(parsed.mensagem_revisada || "").trim().slice(0, 240) ||
        message.slice(0, 240),
      observacoes: Array.isArray(parsed.observacoes)
        ? parsed.observacoes.map((item) => String(item)).filter(Boolean).slice(0, 4)
        : [],
    }

    return NextResponse.json({ ok: true, data: payload })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Erro interno ao revisar comunicado.", details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
