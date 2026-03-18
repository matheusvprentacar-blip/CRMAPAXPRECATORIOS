const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function jsonResponse(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "object" && error && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message
    if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
      return maybeMessage
    }
  }
  return "Erro desconhecido"
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Metodo nao permitido. Use POST." })
  }

  try {
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || Deno.env.get("NEXT_PUBLIC_APP_URL")
    const refreshSecret = Deno.env.get("MARKET_REFRESH_SECRET")

    if (!appBaseUrl) {
      return jsonResponse(500, { error: "APP_BASE_URL nao configurada no ambiente." })
    }

    if (!refreshSecret) {
      return jsonResponse(500, { error: "MARKET_REFRESH_SECRET nao configurada no ambiente." })
    }

    const endpoint = `${appBaseUrl.replace(/\/$/, "")}/api/market/refresh`

    const refreshResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-market-refresh-secret": refreshSecret,
      },
    })

    const rawBody = await refreshResponse.text()
    let parsedBody: unknown = rawBody

    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : null
    } catch {
      // Mantem rawBody quando nao vier JSON valido
    }

    if (!refreshResponse.ok) {
      return jsonResponse(refreshResponse.status, {
        ok: false,
        error: "Falha ao atualizar snapshot via endpoint interno.",
        endpoint,
        response: parsedBody,
      })
    }

    return jsonResponse(200, {
      ok: true,
      endpoint,
      response: parsedBody,
    })
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: "Erro interno ao executar refresh diario de mercado.",
      details: getErrorMessage(error),
    })
  }
})
