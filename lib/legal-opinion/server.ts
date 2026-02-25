import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type {
  LegalOpinion,
  LegalOpinionComment,
  LegalOpinionEvent,
  LegalOpinionAttachment,
  LegalOpinionPrecatorioRef,
  LegalOpinionUserRef,
} from "@/features/legal-opinion/types"

export class LegalOpinionApiError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
    this.name = "LegalOpinionApiError"
  }
}

export type LegalOpinionRequestContext = {
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>
  userId: string
  tenantId: string
  roles: string[]
}

function normalizeRoles(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? [trimmed] : []
  }

  return []
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === "string" && message.trim().length > 0) return message
  }
  return "Erro interno."
}

export function toApiErrorResponse(error: unknown) {
  if (error instanceof LegalOpinionApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  return NextResponse.json(
    {
      error: "Erro interno.",
      details: getErrorMessage(error),
    },
    { status: 500 }
  )
}

export async function requireLegalOpinionContext(): Promise<LegalOpinionRequestContext> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    throw new LegalOpinionApiError("Supabase nao configurado no servidor.", 500)
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new LegalOpinionApiError("Nao autenticado.", 401)
  }

  const { data: profile, error: profileError } = await supabase
    .from("usuarios")
    .select("id, role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    throw new LegalOpinionApiError("Perfil de usuario nao encontrado.", 403)
  }

  const roles = normalizeRoles(profile.role)

  const { data: tenantIdByRpc, error: tenantRpcError } = await supabase.rpc("app_current_tenant_id")
  if (tenantRpcError) {
    throw new LegalOpinionApiError(
      `Nao foi possivel resolver tenant atual: ${tenantRpcError.message}`,
      500
    )
  }

  const tenantId = String(tenantIdByRpc || "").trim()
  if (!tenantId) {
    throw new LegalOpinionApiError("Usuario sem tenant associado.", 403)
  }

  return {
    supabase,
    userId: user.id,
    tenantId,
    roles,
  }
}

export type LegalOpinionRow = {
  id: string
  tenant_id: string
  precatorio_id: string
  requested_by: string
  assigned_to: string | null
  title: string
  type: string
  status: string
  priority: string
  due_date: string | null
  executive_summary: string | null
  analysis: string | null
  recommendation: string | null
  conclusion: string | null
  checklist: Record<string, boolean>
  created_at: string
  updated_at: string
}

export type LegalOpinionCommentRow = {
  id: string
  tenant_id: string
  legal_opinion_id: string
  author_id: string
  content: string
  created_at: string
}

export type LegalOpinionEventRow = {
  id: string
  tenant_id: string
  legal_opinion_id: string
  actor_id: string | null
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}

export type LegalOpinionAttachmentRow = {
  id: string
  tenant_id: string
  legal_opinion_id: string
  storage_path: string
  file_name: string
  mime_type: string
  size: number
  uploaded_by: string
  created_at: string
}

async function fetchUsersMap(
  supabase: LegalOpinionRequestContext["supabase"],
  userIds: string[]
): Promise<Map<string, LegalOpinionUserRef>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)))
  const map = new Map<string, LegalOpinionUserRef>()
  if (ids.length === 0) return map

  const { data } = await supabase.from("usuarios").select("id, nome, email").in("id", ids)
  for (const row of data || []) {
    map.set(row.id, {
      id: row.id,
      nome: row.nome ?? null,
      email: row.email ?? null,
    })
  }
  return map
}

async function fetchPrecatoriosMap(
  supabase: LegalOpinionRequestContext["supabase"],
  precatorioIds: string[]
): Promise<Map<string, LegalOpinionPrecatorioRef>> {
  const ids = Array.from(new Set(precatorioIds.filter(Boolean)))
  const map = new Map<string, LegalOpinionPrecatorioRef>()
  if (ids.length === 0) return map

  const { data } = await supabase
    .from("precatorios")
    .select("id, numero_precatorio, numero_processo, credor_nome, titulo")
    .in("id", ids)

  for (const row of data || []) {
    map.set(row.id, {
      id: row.id,
      numero_precatorio: row.numero_precatorio ?? null,
      numero_processo: row.numero_processo ?? null,
      credor_nome: row.credor_nome ?? null,
      titulo: row.titulo ?? null,
    })
  }
  return map
}

export async function hydrateLegalOpinions(
  ctx: LegalOpinionRequestContext,
  opinions: LegalOpinionRow[]
): Promise<LegalOpinion[]> {
  const userMap = await fetchUsersMap(
    ctx.supabase,
    opinions.flatMap((item) => [item.requested_by, item.assigned_to || ""])
  )
  const precatorioMap = await fetchPrecatoriosMap(
    ctx.supabase,
    opinions.map((item) => item.precatorio_id)
  )

  return opinions.map((item) => ({
    ...item,
    type: item.type as LegalOpinion["type"],
    status: item.status as LegalOpinion["status"],
    priority: item.priority as LegalOpinion["priority"],
    checklist: (item.checklist || {}) as LegalOpinion["checklist"],
    requested_by_user: userMap.get(item.requested_by) || null,
    assigned_to_user: item.assigned_to ? userMap.get(item.assigned_to) || null : null,
    precatorio: precatorioMap.get(item.precatorio_id) || null,
  }))
}

export async function hydrateLegalComments(
  ctx: LegalOpinionRequestContext,
  comments: LegalOpinionCommentRow[]
): Promise<LegalOpinionComment[]> {
  const userMap = await fetchUsersMap(
    ctx.supabase,
    comments.map((comment) => comment.author_id)
  )

  return comments.map((comment) => ({
    ...comment,
    author: userMap.get(comment.author_id) || null,
  }))
}

export async function hydrateLegalEvents(
  ctx: LegalOpinionRequestContext,
  events: LegalOpinionEventRow[]
): Promise<LegalOpinionEvent[]> {
  const userMap = await fetchUsersMap(
    ctx.supabase,
    events.map((event) => event.actor_id || "").filter(Boolean)
  )

  return events.map((event) => ({
    ...event,
    payload: event.payload || {},
    actor: event.actor_id ? userMap.get(event.actor_id) || null : null,
  }))
}

export async function hydrateLegalAttachments(
  ctx: LegalOpinionRequestContext,
  attachments: LegalOpinionAttachmentRow[]
): Promise<LegalOpinionAttachment[]> {
  const userMap = await fetchUsersMap(
    ctx.supabase,
    attachments.map((attachment) => attachment.uploaded_by)
  )

  return attachments.map((attachment) => ({
    ...attachment,
    uploader: userMap.get(attachment.uploaded_by) || null,
  }))
}
