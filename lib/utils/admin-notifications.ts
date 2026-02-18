import { createBrowserClient } from "@/lib/supabase/client"

type NotificationKind = "critical" | "warn" | "info"

type AdminNotificationInput = {
  userId: string
  title: string
  body: string
  kind: NotificationKind
  eventType?: string
  entityType?: string
  entityId?: string
  linkUrl?: string
  payload?: Record<string, unknown>
}

type ApiNotificationPayload = {
  ok?: boolean
  error?: string
  details?: string
}

const isHtmlLike = (content: string) => {
  const trimmed = content.trimStart().toLowerCase()
  return trimmed.startsWith("<!doctype") || trimmed.startsWith("<html") || trimmed.startsWith("<head")
}

const parseApiPayload = (raw: string): ApiNotificationPayload | null => {
  if (!raw || !raw.trim().startsWith("{")) return null
  try {
    return JSON.parse(raw) as ApiNotificationPayload
  } catch {
    return null
  }
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error.trim().length > 0) return error
  return "Falha ao enviar alerta."
}

async function sendViaApi(input: AdminNotificationInput): Promise<{
  ok: boolean
  shouldFallback: boolean
  errorMessage?: string
}> {
  try {
    const response = await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })

    const raw = await response.text()
    const payload = parseApiPayload(raw)
    const contentType = response.headers.get("content-type") || ""

    if (response.ok && payload?.ok) {
      return { ok: true, shouldFallback: false }
    }

    const apiMissingInStaticBuild =
      response.ok &&
      !payload?.ok &&
      (contentType.includes("text/html") || isHtmlLike(raw))

    if (apiMissingInStaticBuild) {
      return { ok: false, shouldFallback: true }
    }

    return {
      ok: false,
      shouldFallback: false,
      errorMessage: payload?.error || payload?.details || `Falha ao enviar alerta (HTTP ${response.status}).`,
    }
  } catch (error) {
    const message = getErrorMessage(error)
    const networkLikeFailure =
      /failed to fetch|networkerror|network request failed|load failed/i.test(message)

    if (networkLikeFailure) {
      return { ok: false, shouldFallback: true }
    }

    return { ok: false, shouldFallback: false, errorMessage: message }
  }
}

async function sendViaRpc(input: AdminNotificationInput) {
  const supabase = createBrowserClient()
  if (!supabase) {
    throw new Error("Supabase nao disponivel para envio de alerta.")
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("Sessao invalida para envio do alerta.")
  }

  const rawSource = input.payload?.source
  const payloadWithActor = {
    ...(input.payload || {}),
    actor_user_id: user.id,
    source: String(rawSource || "admin_notifications_client_fallback"),
  }

  const { error } = await supabase.rpc("notify_create", {
    p_user_id: input.userId,
    p_title: input.title,
    p_body: input.body,
    p_kind: input.kind,
    p_entity_type: input.entityType || null,
    p_entity_id: input.entityId || null,
    p_event_type: input.eventType || null,
    p_link_url: input.linkUrl || null,
    p_payload: payloadWithActor,
  })

  if (error) {
    throw new Error(error.message || "Falha ao enviar alerta via RPC.")
  }
}

export async function sendAdminNotification(input: AdminNotificationInput) {
  const apiAttempt = await sendViaApi(input)
  if (apiAttempt.ok) return
  if (!apiAttempt.shouldFallback) {
    throw new Error(apiAttempt.errorMessage || "Falha ao enviar alerta.")
  }
  await sendViaRpc(input)
}
