"use client"

import { createBrowserClient } from "@/lib/supabase/client"
import type {
  LegalOpinion,
  LegalOpinionAttachment,
  LegalOpinionComment,
  LegalOpinionEvent,
  LegalOpinionPriority,
  LegalOpinionStatus,
  LegalOpinionType,
} from "@/features/legal-opinion/types"

export type LegalOpinionListQuery = {
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "object" && error && "error" in error) {
    const message = (error as { error?: unknown }).error
    if (typeof message === "string" && message.trim().length > 0) return message
  }
  return "Erro inesperado."
}

async function apiRequest<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    credentials: "include",
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(getErrorMessage(payload))
  }
  return payload as T
}

function buildQueryString(query: LegalOpinionListQuery): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue
    params.set(key, String(value))
  }
  const raw = params.toString()
  return raw ? `?${raw}` : ""
}

export async function listLegalOpinions(query: LegalOpinionListQuery = {}) {
  return apiRequest<LegalOpinionListResponse>(`/api/legal-opinions${buildQueryString(query)}`)
}

export async function listLegalOpinionsByPrecatorio(precatorioId: string) {
  const response = await apiRequest<{ data: LegalOpinion[] }>(
    `/api/legal-opinions/by-precatorio/${precatorioId}`
  )
  return response.data
}

export async function getLegalOpinionMetadata(options?: { search?: string; precatorioLimit?: number }) {
  const query = new URLSearchParams()
  if (options?.search) query.set("search", options.search)
  if (options?.precatorioLimit) query.set("precatorioLimit", String(options.precatorioLimit))
  const suffix = query.toString() ? `?${query.toString()}` : ""
  const response = await apiRequest<{ data: LegalOpinionMetadata }>(
    `/api/legal-opinions/metadata${suffix}`
  )
  return response.data
}

export async function getLegalOpinionDetail(id: string) {
  return apiRequest<LegalOpinionDetailResponse>(`/api/legal-opinions/${id}`)
}

export async function createLegalOpinion(payload: LegalOpinionCreatePayload) {
  const response = await apiRequest<{ data: LegalOpinion }>(`/api/legal-opinions`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return response.data
}

export async function updateLegalOpinion(id: string, payload: LegalOpinionUpdatePayload) {
  const response = await apiRequest<{ data: LegalOpinion }>(`/api/legal-opinions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
  return response.data
}

export async function addLegalOpinionComment(id: string, content: string) {
  const response = await apiRequest<{ data: LegalOpinionComment }>(
    `/api/legal-opinions/${id}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    }
  )
  return response.data
}

export async function addLegalOpinionEvent(
  id: string,
  eventType: string,
  payload: Record<string, unknown> = {}
) {
  return apiRequest<{ data: { id: string } }>(`/api/legal-opinions/${id}/events`, {
    method: "POST",
    body: JSON.stringify({ eventType, payload }),
  })
}

export async function registerLegalOpinionAttachment(
  id: string,
  payload: {
    storagePath: string
    fileName: string
    mimeType: string
    size: number
  }
) {
  const response = await apiRequest<{ data: LegalOpinionAttachment }>(
    `/api/legal-opinions/${id}/attachments`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  )
  return response.data
}

export async function getLegalOpinionAttachments(id: string) {
  const response = await apiRequest<{ data: LegalOpinionAttachment[] }>(
    `/api/legal-opinions/${id}/attachments`
  )
  return response.data
}

export async function getLegalOpinionAttachmentSignedUrl(
  opinionId: string,
  attachmentId: string,
  expiresIn = 3600
) {
  const response = await apiRequest<{
    data: {
      attachmentId: string
      fileName: string
      signedUrl: string
      expiresIn: number
    }
  }>(`/api/legal-opinions/${opinionId}/attachments/signed-url`, {
    method: "POST",
    body: JSON.stringify({ attachmentId, expiresIn }),
  })
  return response.data
}

const ALLOWED_ATTACHMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024

function sanitizeFilename(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
}

function validateAttachment(file: File) {
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    throw new Error("Tipo de arquivo não permitido. Use PDF, JPG, PNG ou DOCX.")
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error("Arquivo excede 20MB.")
  }
}

export async function uploadAndRegisterLegalAttachment(
  opinion: Pick<LegalOpinion, "id" | "tenant_id">,
  file: File
) {
  validateAttachment(file)

  const supabase = createBrowserClient()
  if (!supabase) {
    throw new Error("Supabase não disponível no navegador.")
  }

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
