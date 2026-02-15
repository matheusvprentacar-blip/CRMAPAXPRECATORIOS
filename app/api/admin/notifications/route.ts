import { NextResponse } from "next/server"
import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

type NotificationKind = "critical" | "warn" | "info"

type NotifyRequestBody = {
  userId?: string
  title?: string
  body?: string
  kind?: NotificationKind | string
  eventType?: string
  entityType?: string
  entityId?: string
  linkUrl?: string
  payload?: Record<string, unknown>
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeRoles(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof input === "string" && input.trim().length > 0) {
    return [input.trim()]
  }
  return []
}

function normalizeKind(value: unknown): NotificationKind {
  const kind = String(value || "info").toLowerCase()
  if (kind === "critical" || kind === "warn" || kind === "info") return kind
  return "info"
}

function normalizeUuid(value: unknown): string | null {
  const text = String(value || "").trim()
  if (!text || !UUID_REGEX.test(text)) return null
  return text
}

function asNonEmptyString(value: unknown): string {
  return String(value || "").trim()
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
      return NextResponse.json({ error: "Supabase nao configurado no servidor." }, { status: 500 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: "Nao foi possivel validar perfil." }, { status: 403 })
    }

    const roles = normalizeRoles(profile?.role)
    if (!roles.includes("admin")) {
      return NextResponse.json({ error: "Apenas admin pode enviar alertas." }, { status: 403 })
    }

    const body = (await request.json()) as NotifyRequestBody
    const userId = normalizeUuid(body?.userId)
    const title = asNonEmptyString(body?.title)
    const messageBody = asNonEmptyString(body?.body)
    const kind = normalizeKind(body?.kind)
    const eventType = asNonEmptyString(body?.eventType) || null
    const entityType = asNonEmptyString(body?.entityType) || null
    const entityId = normalizeUuid(body?.entityId)
    const linkUrl = asNonEmptyString(body?.linkUrl) || null
    const payload =
      body?.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
        ? body.payload
        : {}

    if (!userId) {
      return NextResponse.json({ error: "Destinatario invalido." }, { status: 400 })
    }
    if (!title) {
      return NextResponse.json({ error: "Titulo obrigatorio." }, { status: 400 })
    }
    if (!messageBody) {
      return NextResponse.json({ error: "Mensagem obrigatoria." }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY nao configurada." }, { status: 500 })
    }

    const serviceClient = createSupabaseServiceClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const payloadWithActor = {
      ...payload,
      actor_user_id: user.id,
      source: "admin_notifications_api",
    }

    const { data: rpcId, error: rpcError } = await serviceClient.rpc("notify_create", {
      p_user_id: userId,
      p_title: title,
      p_body: messageBody,
      p_kind: kind,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_event_type: eventType,
      p_link_url: linkUrl,
      p_payload: payloadWithActor,
    })

    if (!rpcError) {
      return NextResponse.json({ ok: true, id: rpcId || null, method: "rpc" })
    }

    const { data: inserted, error: insertError } = await serviceClient
      .from("notifications")
      .insert({
        user_id: userId,
        title,
        body: messageBody,
        kind,
        link_url: linkUrl,
        entity_type: entityType,
        entity_id: entityId,
        event_type: eventType,
      })
      .select("id")
      .single()

    if (insertError) {
      return NextResponse.json(
        {
          error: "Falha ao enviar notificacao.",
          details: `RPC: ${rpcError.message} | INSERT: ${insertError.message}`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      id: inserted?.id || null,
      method: "insert_fallback",
      warning: rpcError.message,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Erro interno ao enviar notificacao.", details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
