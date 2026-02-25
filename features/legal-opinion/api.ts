"use client"

import { createBrowserClient } from "@/lib/supabase/client"
import {
  legalOpinionAttachmentCreateSchema,
  legalOpinionAttachmentSignedUrlSchema,
  legalOpinionCommentCreateSchema,
  legalOpinionCreateSchema,
  legalOpinionEventCreateSchema,
  legalOpinionListQuerySchema,
  legalOpinionUpdateSchema,
} from "@/lib/legal-opinion/schemas"
import type {
  LegalOpinion,
  LegalOpinionAttachment,
  LegalOpinionComment,
  LegalOpinionEvent,
  LegalOpinionPriority,
  LegalOpinionStatus,
  LegalOpinionType,
  LegalOpinionUserRef,
  LegalOpinionPrecatorioRef,
} from "@/features/legal-opinion/types"

type LegalOpinionListResponse = {
  data: LegalOpinion[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

type LegalOpinionDetailResponse = {
  data: LegalOpinion
  comments: LegalOpinionComment[]
  events: LegalOpinionEvent[]
  attachments: LegalOpinionAttachment[]
}

type LegalOpinionListQuery = {
  page?: number
  pageSize?: number
  search?: string
  status?: LegalOpinionStatus
  type?: LegalOpinionType
  priority?: LegalOpinionPriority
  assignedTo?: string
  precatorioId?: string
  dueStart?: string
  dueEnd?: string
}

export type LegalOpinionMetadata = {
  tenant: {
    id: string
    name: string | null
    slug: string | null
  } | null
  users: Array<{
    id: string
    nome: string
    email: string | null
  }>
  precatorios: Array<{
    id: string
    titulo: string | null
    numero_precatorio: string | null
    numero_processo: string | null
    credor_nome: string | null
  }>
}

export type LegalOpinionCreatePayload = {
  precatorioId: string
  assignedTo?: string | null
  title: string
  type: LegalOpinionType
  status?: LegalOpinionStatus
  priority?: LegalOpinionPriority
  dueDate?: string | null
  executiveSummary?: string | null
  analysis?: string | null
  recommendation?: string | null
  conclusion?: string | null
  checklist?: Record<string, boolean>
}

export type LegalOpinionUpdatePayload = Partial<Omit<LegalOpinionCreatePayload, "precatorioId">>

type OpinionRow = {
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
  checklist: Record<string, boolean> | null
  created_at: string
  updated_at: string
}

type CommentRow = {
  id: string
  tenant_id: string
  legal_opinion_id: string
  author_id: string
  content: string
  created_at: string
}

type EventRow = {
  id: string
  tenant_id: string
  legal_opinion_id: string
  actor_id: string | null
  event_type: string
  payload: Record<string, unknown> | null
  created_at: string
}

type AttachmentRow = {
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

type TenantContext = {
  supabase: NonNullable<ReturnType<typeof createBrowserClient>>
  tenantId: string
  userId: string
}

const ALLOWED_ATTACHMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024

function firstIssueMessage(error: { issues?: Array<{ message?: string }> }) {
  return error.issues?.[0]?.message || "Dados invalidos."
}

function normalizeSearchTerm(value?: string) {
  const term = String(value || "").trim()
  return term.length > 0 ? term : ""
}

function getSupabaseOrThrow() {
  const supabase = createBrowserClient()
  if (!supabase) {
    throw new Error("Supabase nao disponivel no navegador.")
  }
  return supabase
}

async function resolveTenantContext(): Promise<TenantContext> {
  const supabase = getSupabaseOrThrow()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("Nao autenticado.")
  }

  const { data: tenantIdData, error: tenantError } = await supabase.rpc("app_current_tenant_id")
  if (tenantError) {
    throw new Error(tenantError.message)
  }

  const tenantId = String(tenantIdData || "").trim()
  if (!tenantId) {
    throw new Error("Usuario sem tenant associado.")
  }

  return {
    supabase,
    tenantId,
    userId: user.id,
  }
}

async function assertActiveTenantMember(
  ctx: TenantContext,
  userId: string
): Promise<void> {
  const { data, error } = await ctx.supabase
    .from("tenant_members")
    .select("id")
    .eq("tenant_id", ctx.tenantId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error("Usuario informado nao pertence ao tenant atual.")
  }
}

async function assertPrecatorioExists(ctx: TenantContext, precatorioId: string): Promise<void> {
  const { data, error } = await ctx.supabase
    .from("precatorios")
    .select("id")
    .eq("id", precatorioId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error("Precatrio nao encontrado.")
  }
}

async function fetchUsersMap(
  ctx: TenantContext,
  userIds: string[]
): Promise<Map<string, LegalOpinionUserRef>> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
  const map = new Map<string, LegalOpinionUserRef>()
  if (uniqueIds.length === 0) return map

  const { data, error } = await ctx.supabase
    .from("usuarios")
    .select("id, nome, email")
    .in("id", uniqueIds)

  if (error) {
    throw new Error(error.message)
  }

  for (const row of (data || []) as Array<{ id: string; nome: string | null; email: string | null }>) {
    map.set(row.id, {
      id: row.id,
      nome: row.nome || null,
      email: row.email || null,
    })
  }

  return map
}

async function fetchPrecatoriosMap(
  ctx: TenantContext,
  precatorioIds: string[]
): Promise<Map<string, LegalOpinionPrecatorioRef>> {
  const uniqueIds = Array.from(new Set(precatorioIds.filter(Boolean)))
  const map = new Map<string, LegalOpinionPrecatorioRef>()
  if (uniqueIds.length === 0) return map

  const { data, error } = await ctx.supabase
    .from("precatorios")
    .select("id, numero_precatorio, numero_processo, credor_nome, titulo")
    .in("id", uniqueIds)

  if (error) {
    throw new Error(error.message)
  }

  for (const row of (data || []) as Array<{
    id: string
    numero_precatorio: string | null
    numero_processo: string | null
    credor_nome: string | null
    titulo: string | null
  }>) {
    map.set(row.id, {
      id: row.id,
      numero_precatorio: row.numero_precatorio || null,
      numero_processo: row.numero_processo || null,
      credor_nome: row.credor_nome || null,
      titulo: row.titulo || null,
    })
  }

  return map
}

async function hydrateOpinions(ctx: TenantContext, rows: OpinionRow[]): Promise<LegalOpinion[]> {
  const usersMap = await fetchUsersMap(
    ctx,
    rows.flatMap((row) => [row.requested_by, row.assigned_to || ""])
  )
  const precatoriosMap = await fetchPrecatoriosMap(
    ctx,
    rows.map((row) => row.precatorio_id)
  )

  return rows.map((row) => ({
    ...row,
    type: row.type as LegalOpinionType,
    status: row.status as LegalOpinionStatus,
    priority: row.priority as LegalOpinionPriority,
    checklist: row.checklist || {},
    requested_by_user: usersMap.get(row.requested_by) || null,
    assigned_to_user: row.assigned_to ? usersMap.get(row.assigned_to) || null : null,
    precatorio: precatoriosMap.get(row.precatorio_id) || null,
  }))
}

async function hydrateComments(ctx: TenantContext, rows: CommentRow[]): Promise<LegalOpinionComment[]> {
  const usersMap = await fetchUsersMap(
    ctx,
    rows.map((row) => row.author_id)
  )

  return rows.map((row) => ({
    ...row,
    author: usersMap.get(row.author_id) || null,
  }))
}

async function hydrateEvents(ctx: TenantContext, rows: EventRow[]): Promise<LegalOpinionEvent[]> {
  const usersMap = await fetchUsersMap(
    ctx,
    rows.map((row) => row.actor_id || "").filter(Boolean)
  )

  return rows.map((row) => ({
    ...row,
    payload: row.payload || {},
    actor: row.actor_id ? usersMap.get(row.actor_id) || null : null,
  }))
}

async function hydrateAttachments(
  ctx: TenantContext,
  rows: AttachmentRow[]
): Promise<LegalOpinionAttachment[]> {
  const usersMap = await fetchUsersMap(
    ctx,
    rows.map((row) => row.uploaded_by)
  )

  return rows.map((row) => ({
    ...row,
    uploader: usersMap.get(row.uploaded_by) || null,
  }))
}

export async function listLegalOpinions(query: LegalOpinionListQuery = {}): Promise<LegalOpinionListResponse> {
  const ctx = await resolveTenantContext()
  const parsedQuery = legalOpinionListQuerySchema.safeParse(query)
  if (!parsedQuery.success) {
    throw new Error(firstIssueMessage(parsedQuery.error))
  }

  const q = parsedQuery.data
  const from = (q.page - 1) * q.pageSize
  const to = from + q.pageSize - 1

  let dbQuery = ctx.supabase
    .from("legal_opinions")
    .select("*", { count: "exact" })
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false })

  if (q.status) dbQuery = dbQuery.eq("status", q.status)
  if (q.type) dbQuery = dbQuery.eq("type", q.type)
  if (q.priority) dbQuery = dbQuery.eq("priority", q.priority)
  if (q.assignedTo) dbQuery = dbQuery.eq("assigned_to", q.assignedTo)
  if (q.precatorioId) dbQuery = dbQuery.eq("precatorio_id", q.precatorioId)
  if (q.dueStart) dbQuery = dbQuery.gte("due_date", q.dueStart)
  if (q.dueEnd) dbQuery = dbQuery.lte("due_date", q.dueEnd)

  const searchTerm = normalizeSearchTerm(q.search)
  if (searchTerm) {
    const escaped = searchTerm.replace(/,/g, " ")
    const { data: matchingPrecatorios, error: precatorioSearchError } = await ctx.supabase
      .from("precatorios")
      .select("id")
      .or(
        `numero_precatorio.ilike.%${escaped}%,numero_processo.ilike.%${escaped}%,credor_nome.ilike.%${escaped}%,titulo.ilike.%${escaped}%`
      )
      .limit(200)

    if (precatorioSearchError) {
      throw new Error(precatorioSearchError.message)
    }

    const precatorioIds = (matchingPrecatorios || [])
      .map((row) => row.id)
      .filter(Boolean) as string[]

    const searchClauses = [
      `title.ilike.%${escaped}%`,
      `executive_summary.ilike.%${escaped}%`,
      `analysis.ilike.%${escaped}%`,
    ]

    if (precatorioIds.length > 0) {
      searchClauses.push(`precatorio_id.in.(${precatorioIds.join(",")})`)
    }

    dbQuery = dbQuery.or(searchClauses.join(","))
  }

  const { data, error, count } = await dbQuery.range(from, to)
  if (error) {
    throw new Error(error.message)
  }

  const hydrated = await hydrateOpinions(ctx, (data || []) as OpinionRow[])
  return {
    data: hydrated,
    pagination: {
      page: q.page,
      pageSize: q.pageSize,
      total: count || 0,
      totalPages: Math.max(1, Math.ceil((count || 0) / q.pageSize)),
    },
  }
}

export async function listLegalOpinionsByPrecatorio(precatorioId: string): Promise<LegalOpinion[]> {
  const ctx = await resolveTenantContext()
  const { data, error } = await ctx.supabase
    .from("legal_opinions")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .eq("precatorio_id", precatorioId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return hydrateOpinions(ctx, (data || []) as OpinionRow[])
}

export async function getLegalOpinionMetadata(options?: {
  search?: string
  precatorioLimit?: number
}): Promise<LegalOpinionMetadata> {
  const ctx = await resolveTenantContext()
  const search = normalizeSearchTerm(options?.search)
  const precatorioLimit = Math.max(20, Math.min(options?.precatorioLimit || 120, 300))

  const { data: tenant, error: tenantError } = await ctx.supabase
    .from("tenants")
    .select("id, name, slug")
    .eq("id", ctx.tenantId)
    .maybeSingle()

  if (tenantError) {
    throw new Error(tenantError.message)
  }

  const { data: members, error: membersError } = await ctx.supabase
    .from("tenant_members")
    .select("user_id")
    .eq("tenant_id", ctx.tenantId)
    .eq("is_active", true)
    .limit(500)

  if (membersError) {
    throw new Error(membersError.message)
  }

  const memberIds = Array.from(
    new Set((members || []).map((item) => item.user_id).filter(Boolean))
  ) as string[]

  let users: LegalOpinionMetadata["users"] = []
  if (memberIds.length > 0) {
    let usersQuery = ctx.supabase
      .from("usuarios")
      .select("id, nome, email")
      .in("id", memberIds)
      .order("nome", { ascending: true })

    if (search) {
      usersQuery = usersQuery.or(`nome.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: userRows, error: usersError } = await usersQuery
    if (usersError) {
      throw new Error(usersError.message)
    }

    users = (userRows || []).map((item) => ({
      id: item.id,
      nome: item.nome || item.email || "Usuario",
      email: item.email || null,
    }))
  }

  let precatoriosQuery = ctx.supabase
    .from("precatorios")
    .select("id, titulo, numero_precatorio, numero_processo, credor_nome")
    .order("created_at", { ascending: false })
    .limit(precatorioLimit)

  if (search) {
    precatoriosQuery = precatoriosQuery.or(
      `titulo.ilike.%${search}%,numero_precatorio.ilike.%${search}%,numero_processo.ilike.%${search}%,credor_nome.ilike.%${search}%`
    )
  }

  const { data: precatorios, error: precatoriosError } = await precatoriosQuery
  if (precatoriosError) {
    throw new Error(precatoriosError.message)
  }

  return {
    tenant: tenant || null,
    users,
    precatorios: (precatorios || []) as LegalOpinionMetadata["precatorios"],
  }
}

export async function getLegalOpinionDetail(id: string): Promise<LegalOpinionDetailResponse> {
  const ctx = await resolveTenantContext()

  const { data: opinion, error: opinionError } = await ctx.supabase
    .from("legal_opinions")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", id)
    .maybeSingle()

  if (opinionError) {
    throw new Error(opinionError.message)
  }

  if (!opinion) {
    throw new Error("Parecer juridico nao encontrado.")
  }

  const [commentsResult, eventsResult, attachmentsResult] = await Promise.all([
    ctx.supabase
      .from("legal_opinion_comments")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("legal_opinion_id", id)
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("legal_opinion_events")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("legal_opinion_id", id)
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("legal_opinion_attachments")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("legal_opinion_id", id)
      .order("created_at", { ascending: false }),
  ])

  if (commentsResult.error) throw new Error(commentsResult.error.message)
  if (eventsResult.error) throw new Error(eventsResult.error.message)
  if (attachmentsResult.error) throw new Error(attachmentsResult.error.message)

  const [hydratedOpinion] = await hydrateOpinions(ctx, [opinion as OpinionRow])
  const hydratedComments = await hydrateComments(ctx, (commentsResult.data || []) as CommentRow[])
  const hydratedEvents = await hydrateEvents(ctx, (eventsResult.data || []) as EventRow[])
  const hydratedAttachments = await hydrateAttachments(
    ctx,
    (attachmentsResult.data || []) as AttachmentRow[]
  )

  return {
    data: hydratedOpinion,
    comments: hydratedComments,
    events: hydratedEvents,
    attachments: hydratedAttachments,
  }
}

export async function createLegalOpinion(payload: LegalOpinionCreatePayload): Promise<LegalOpinion> {
  const ctx = await resolveTenantContext()
  const parsed = legalOpinionCreateSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error(firstIssueMessage(parsed.error))
  }
  const data = parsed.data

  await assertPrecatorioExists(ctx, data.precatorioId)
  if (data.assignedTo) {
    await assertActiveTenantMember(ctx, data.assignedTo)
  }

  const { data: inserted, error } = await ctx.supabase
    .from("legal_opinions")
    .insert({
      tenant_id: ctx.tenantId,
      precatorio_id: data.precatorioId,
      requested_by: ctx.userId,
      assigned_to: data.assignedTo || null,
      title: data.title,
      type: data.type,
      status: data.status,
      priority: data.priority,
      due_date: data.dueDate || null,
      executive_summary: data.executiveSummary || null,
      analysis: data.analysis || null,
      recommendation: data.recommendation || null,
      conclusion: data.conclusion || null,
      checklist: data.checklist || {},
    })
    .select("*")
    .single()

  if (error || !inserted) {
    throw new Error(error?.message || "Falha ao criar parecer.")
  }

  const [hydrated] = await hydrateOpinions(ctx, [inserted as OpinionRow])
  return hydrated
}

export async function updateLegalOpinion(
  id: string,
  payload: LegalOpinionUpdatePayload
): Promise<LegalOpinion> {
  const ctx = await resolveTenantContext()
  const parsed = legalOpinionUpdateSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error(firstIssueMessage(parsed.error))
  }

  if (parsed.data.assignedTo) {
    await assertActiveTenantMember(ctx, parsed.data.assignedTo)
  }

  const updatePayload: Record<string, unknown> = {}
  if (parsed.data.assignedTo !== undefined) updatePayload.assigned_to = parsed.data.assignedTo || null
  if (parsed.data.title !== undefined) updatePayload.title = parsed.data.title
  if (parsed.data.type !== undefined) updatePayload.type = parsed.data.type
  if (parsed.data.status !== undefined) updatePayload.status = parsed.data.status
  if (parsed.data.priority !== undefined) updatePayload.priority = parsed.data.priority
  if (parsed.data.dueDate !== undefined) updatePayload.due_date = parsed.data.dueDate || null
  if (parsed.data.executiveSummary !== undefined) {
    updatePayload.executive_summary = parsed.data.executiveSummary || null
  }
  if (parsed.data.analysis !== undefined) updatePayload.analysis = parsed.data.analysis || null
  if (parsed.data.recommendation !== undefined) {
    updatePayload.recommendation = parsed.data.recommendation || null
  }
  if (parsed.data.conclusion !== undefined) updatePayload.conclusion = parsed.data.conclusion || null
  if (parsed.data.checklist !== undefined) updatePayload.checklist = parsed.data.checklist || {}

  const { data: updated, error } = await ctx.supabase
    .from("legal_opinions")
    .update(updatePayload)
    .eq("tenant_id", ctx.tenantId)
    .eq("id", id)
    .select("*")
    .single()

  if (error || !updated) {
    throw new Error(error?.message || "Falha ao atualizar parecer.")
  }

  const [hydrated] = await hydrateOpinions(ctx, [updated as OpinionRow])
  return hydrated
}

export async function addLegalOpinionComment(
  id: string,
  content: string
): Promise<LegalOpinionComment> {
  const ctx = await resolveTenantContext()
  const parsed = legalOpinionCommentCreateSchema.safeParse({ content })
  if (!parsed.success) {
    throw new Error(firstIssueMessage(parsed.error))
  }

  const { data: inserted, error } = await ctx.supabase
    .from("legal_opinion_comments")
    .insert({
      tenant_id: ctx.tenantId,
      legal_opinion_id: id,
      author_id: ctx.userId,
      content: parsed.data.content,
    })
    .select("*")
    .single()

  if (error || !inserted) {
    throw new Error(error?.message || "Falha ao adicionar comentario.")
  }

  await ctx.supabase.rpc("log_legal_opinion_event", {
    p_legal_opinion_id: id,
    p_event_type: "comment_added",
    p_payload: { comment_id: inserted.id },
  })

  const [hydrated] = await hydrateComments(ctx, [inserted as CommentRow])
  return hydrated
}

export async function addLegalOpinionEvent(
  id: string,
  eventType: string,
  payload: Record<string, unknown> = {}
): Promise<{ data: { id: string } }> {
  const ctx = await resolveTenantContext()
  const parsed = legalOpinionEventCreateSchema.safeParse({
    eventType,
    payload,
  })
  if (!parsed.success) {
    throw new Error(firstIssueMessage(parsed.error))
  }

  const { data, error } = await ctx.supabase.rpc("log_legal_opinion_event", {
    p_legal_opinion_id: id,
    p_event_type: parsed.data.eventType,
    p_payload: parsed.data.payload || {},
  })

  if (error) {
    throw new Error(error.message)
  }

  return { data: { id: String(data || "") } }
}

export async function registerLegalOpinionAttachment(
  id: string,
  payload: {
    storagePath: string
    fileName: string
    mimeType: string
    size: number
  }
): Promise<LegalOpinionAttachment> {
  const ctx = await resolveTenantContext()
  const parsed = legalOpinionAttachmentCreateSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error(firstIssueMessage(parsed.error))
  }

  const expectedPrefix = `${ctx.tenantId}/${id}/`
  if (!parsed.data.storagePath.startsWith(expectedPrefix)) {
    throw new Error("Caminho do anexo invalido.")
  }

  const { data: inserted, error } = await ctx.supabase
    .from("legal_opinion_attachments")
    .insert({
      tenant_id: ctx.tenantId,
      legal_opinion_id: id,
      storage_path: parsed.data.storagePath,
      file_name: parsed.data.fileName,
      mime_type: parsed.data.mimeType,
      size: parsed.data.size,
      uploaded_by: ctx.userId,
    })
    .select("*")
    .single()

  if (error || !inserted) {
    throw new Error(error?.message || "Falha ao registrar anexo.")
  }

  await ctx.supabase.rpc("log_legal_opinion_event", {
    p_legal_opinion_id: id,
    p_event_type: "attachment_added",
    p_payload: {
      attachment_id: inserted.id,
      file_name: inserted.file_name,
    },
  })

  const [hydrated] = await hydrateAttachments(ctx, [inserted as AttachmentRow])
  return hydrated
}

export async function getLegalOpinionAttachments(id: string): Promise<LegalOpinionAttachment[]> {
  const ctx = await resolveTenantContext()
  const { data, error } = await ctx.supabase
    .from("legal_opinion_attachments")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .eq("legal_opinion_id", id)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return hydrateAttachments(ctx, (data || []) as AttachmentRow[])
}

export async function getLegalOpinionAttachmentSignedUrl(
  opinionId: string,
  attachmentId: string,
  expiresIn = 3600
): Promise<{
  attachmentId: string
  fileName: string
  signedUrl: string
  expiresIn: number
}> {
  const ctx = await resolveTenantContext()
  const parsed = legalOpinionAttachmentSignedUrlSchema.safeParse({
    attachmentId,
    expiresIn,
  })
  if (!parsed.success) {
    throw new Error(firstIssueMessage(parsed.error))
  }

  const { data: attachment, error: attachmentError } = await ctx.supabase
    .from("legal_opinion_attachments")
    .select("id, storage_path, file_name")
    .eq("tenant_id", ctx.tenantId)
    .eq("legal_opinion_id", opinionId)
    .eq("id", parsed.data.attachmentId)
    .maybeSingle()

  if (attachmentError) {
    throw new Error(attachmentError.message)
  }

  if (!attachment) {
    throw new Error("Anexo nao encontrado.")
  }

  const { data: signedData, error: signedError } = await ctx.supabase.storage
    .from("legal-opinions")
    .createSignedUrl(attachment.storage_path, parsed.data.expiresIn)

  if (signedError || !signedData?.signedUrl) {
    throw new Error(signedError?.message || "Falha ao gerar URL assinada.")
  }

  return {
    attachmentId: attachment.id,
    fileName: attachment.file_name,
    signedUrl: signedData.signedUrl,
    expiresIn: parsed.data.expiresIn,
  }
}

function sanitizeFilename(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
}

function validateAttachment(file: File) {
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    throw new Error("Tipo de arquivo nao permitido. Use PDF, JPG, PNG ou DOCX.")
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error("Arquivo excede 20MB.")
  }
}

export async function uploadAndRegisterLegalAttachment(
  opinion: Pick<LegalOpinion, "id" | "tenant_id">,
  file: File
): Promise<LegalOpinionAttachment> {
  validateAttachment(file)

  const supabase = getSupabaseOrThrow()
  const fileName = sanitizeFilename(file.name)
  const storagePath = `${opinion.tenant_id}/${opinion.id}/${Date.now()}-${fileName}`

  const { error: uploadError } = await supabase.storage
    .from("legal-opinions")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  return registerLegalOpinionAttachment(opinion.id, {
    storagePath,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
  })
}

