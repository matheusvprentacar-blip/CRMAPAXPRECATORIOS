import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

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

type Tone = "formal" | "direto" | "inspirador" | "neutro"

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}

function normalizeRoles(input: unknown): string[] {
  if (Array.isArray(input)) return input.map((item) => String(item).trim()).filter(Boolean)
  if (typeof input === "string" && input.trim().length > 0) return [input.trim()]
  return []
}

function normalizeTone(value: string | undefined): Tone {
  const tone = String(value || "neutro").toLowerCase()
  if (tone === "formal" || tone === "direto" || tone === "inspirador" || tone === "neutro") {
    return tone
  }
  return "neutro"
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === "string" && message.trim().length > 0) return message
  }
  return "Erro desconhecido."
}

function normalizeAiText(input: unknown): string {
  if (typeof input !== "string") return ""
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function buildToneInstruction(tone: Tone): string {
  const instructionByTone: Record<Tone, string> = {
    formal:
      "Tom formal e corporativo. Frases completas, vocativo profissional e fechamento institucional.",
    direto:
      "Tom direto e objetivo. Frases curtas, foco em acao, sem rodeios e sem excesso de adjetivos.",
    inspirador:
      "Tom positivo e mobilizador. Clareza, energia e foco em colaboracao, sem exageros promocionais.",
    neutro:
      "Tom equilibrado e profissional. Linguagem simples, clara e sem floreios.",
  }
  return instructionByTone[tone]
}

function buildPrompt(title: string, message: string, tone: Tone): string {
  return `
Voce e um especialista em comunicacao interna para times de operacao e administracao.
Reescreva o comunicado mantendo 100% dos fatos, datas e instrucoes.

Regras obrigatorias:
- Corrigir ortografia, gramatica e fluidez.
- Organizar em blocos legiveis (sem texto corrido gigante).
- Diferenciar estilo conforme o tom solicitado.
- Nao inventar informacoes.
- Retornar SOMENTE JSON valido com as chaves:
  - titulo_sugerido (string)
  - mensagem_revisada (string)
  - versao_curta (string)
  - observacoes (array de strings, maximo 4 itens)
- Dentro das strings, use quebras de linha reais. NUNCA escreva "\\n" literal.
- Nao usar markdown com crases.

Guia de tom:
${buildToneInstruction(tone)}

Estrutura desejada para mensagem_revisada:
1) abertura curta
2) corpo principal organizado em paragrafos ou bullets
3) fechamento com proximo passo (quando aplicavel)

Titulo original:
${title || "(sem titulo)"}

Mensagem original:
${message}
`.trim()
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return jsonResponse({ error: "Nao autenticado." }, 401)

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return jsonResponse({ error: "Nao autenticado." }, 401)
    }

    const { data: profile, error: profileError } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError) {
      return jsonResponse({ error: "Nao foi possivel validar perfil." }, 403)
    }

    const roles = normalizeRoles(profile?.role)
    if (!roles.includes("admin")) {
      return jsonResponse({ error: "Apenas admin pode usar este recurso." }, 403)
    }

    let body: AiRequestBody
    try {
      body = (await req.json()) as AiRequestBody
    } catch {
      return jsonResponse({ error: "Corpo da requisicao invalido." }, 400)
    }

    const title = String(body?.title || "").trim()
    const message = String(body?.message || "").trim()
    const tone = normalizeTone(body?.tone)

    if (!message) {
      return jsonResponse({ error: "Mensagem e obrigatoria." }, 400)
    }

    if (message.length > 12000) {
      return jsonResponse({ error: "Mensagem excede o limite de tamanho." }, 400)
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY")
    if (!apiKey) {
      return jsonResponse({ error: "OPENAI_API_KEY nao configurada no Supabase Functions." }, 500)
    }

    const prompt = buildPrompt(title, message, tone)

    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Voce e especialista em comunicacao interna. Retorne apenas JSON valido, sem markdown e sem texto extra.",
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
      return jsonResponse({ error: "Falha ao consultar OpenAI.", details: errText.slice(0, 1500) }, 502)
    }

    const completion = (await openAiResponse.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>
    }
    const content = completion?.choices?.[0]?.message?.content

    if (typeof content !== "string" || content.trim().length === 0) {
      return jsonResponse({ error: "Resposta invalida da OpenAI (sem conteudo)." }, 502)
    }

    let parsed: Partial<AiResponseShape> = {}
    try {
      parsed = JSON.parse(content) as Partial<AiResponseShape>
    } catch {
      parsed = {
        titulo_sugerido: title || "Comunicado interno",
        mensagem_revisada: normalizeAiText(content),
        versao_curta: normalizeAiText(content).slice(0, 280),
        observacoes: ["Resposta retornada fora do formato JSON esperado."],
      }
    }

    const mensagemRevisada = normalizeAiText(parsed.mensagem_revisada) || normalizeAiText(message)
    const versaoCurta =
      normalizeAiText(parsed.versao_curta) ||
      mensagemRevisada.slice(0, 280) ||
      normalizeAiText(message).slice(0, 280)

    const payload: AiResponseShape = {
      titulo_sugerido: normalizeAiText(parsed.titulo_sugerido) || normalizeAiText(title) || "Comunicado interno",
      mensagem_revisada: mensagemRevisada,
      versao_curta: versaoCurta,
      observacoes: Array.isArray(parsed.observacoes)
        ? parsed.observacoes.map((item) => normalizeAiText(String(item))).filter(Boolean).slice(0, 4)
        : [],
    }

    return jsonResponse({ ok: true, data: payload }, 200)
  } catch (error: unknown) {
    return jsonResponse(
      { error: "Erro interno ao revisar comunicado.", details: toErrorMessage(error) },
      500
    )
  }
})
