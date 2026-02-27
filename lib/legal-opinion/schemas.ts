import { z } from "zod"
import {
  LEGAL_OPINION_EVENT_TYPES,
  LEGAL_OPINION_PRIORITIES,
  LEGAL_OPINION_SOURCES,
  LEGAL_OPINION_STATUSES,
  LEGAL_OPINION_TYPES,
} from "@/features/legal-opinion/types"

const uuidSchema = z.string().uuid()

const checklistSchema = z.record(z.string(), z.boolean()).default({})

export const legalOpinionCreateSchema = z.object({
  precatorioId: uuidSchema,
  assignedTo: uuidSchema.nullish(),
  title: z.string().trim().min(3).max(220),
  type: z.enum(LEGAL_OPINION_TYPES),
  status: z.enum(LEGAL_OPINION_STATUSES).optional().default("pendente"),
  priority: z.enum(LEGAL_OPINION_PRIORITIES).optional().default("media"),
  origemSolicitacao: z.enum(LEGAL_OPINION_SOURCES).optional().default("manual"),
  dueDate: z.string().date().nullish(),
  executiveSummary: z.string().trim().max(5000).nullish(),
  analysis: z.string().trim().max(25000).nullish(),
  recommendation: z.string().trim().max(12000).nullish(),
  conclusion: z.string().trim().max(12000).nullish(),
  checklist: checklistSchema.optional(),
})

export const legalOpinionUpdateSchema = z
  .object({
    assignedTo: uuidSchema.nullish(),
    title: z.string().trim().min(3).max(220).optional(),
    type: z.enum(LEGAL_OPINION_TYPES).optional(),
    status: z.enum(LEGAL_OPINION_STATUSES).optional(),
    priority: z.enum(LEGAL_OPINION_PRIORITIES).optional(),
    origemSolicitacao: z.enum(LEGAL_OPINION_SOURCES).optional(),
    dueDate: z.string().date().nullish(),
    executiveSummary: z.string().trim().max(5000).nullish(),
    analysis: z.string().trim().max(25000).nullish(),
    recommendation: z.string().trim().max(12000).nullish(),
    conclusion: z.string().trim().max(12000).nullish(),
    checklist: checklistSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Nenhum campo para atualizar.",
  })

export const legalOpinionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(LEGAL_OPINION_STATUSES).optional(),
  type: z.enum(LEGAL_OPINION_TYPES).optional(),
  priority: z.enum(LEGAL_OPINION_PRIORITIES).optional(),
  origemSolicitacao: z.enum(LEGAL_OPINION_SOURCES).optional(),
  assignedTo: uuidSchema.optional(),
  precatorioId: uuidSchema.optional(),
  search: z.string().trim().max(200).optional(),
  dueStart: z.string().date().optional(),
  dueEnd: z.string().date().optional(),
})

export const legalOpinionCommentCreateSchema = z.object({
  content: z.string().trim().min(1).max(4000),
})

export const legalOpinionEventCreateSchema = z.object({
  eventType: z.enum(LEGAL_OPINION_EVENT_TYPES),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
})

export const legalOpinionAttachmentCreateSchema = z.object({
  storagePath: z.string().trim().min(1).max(500),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z
    .string()
    .trim()
    .min(3)
    .max(180)
    .refine(
      (value) =>
        [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ].includes(value),
      "Mime type nao permitido."
    ),
  size: z.coerce.number().int().positive().max(20 * 1024 * 1024),
})

export const legalOpinionAttachmentSignedUrlSchema = z.object({
  attachmentId: uuidSchema,
  expiresIn: z.coerce.number().int().min(60).max(60 * 60 * 12).optional().default(3600),
})

export type LegalOpinionCreateInput = z.infer<typeof legalOpinionCreateSchema>
export type LegalOpinionUpdateInput = z.infer<typeof legalOpinionUpdateSchema>
export type LegalOpinionListQueryInput = z.infer<typeof legalOpinionListQuerySchema>
export type LegalOpinionCommentCreateInput = z.infer<typeof legalOpinionCommentCreateSchema>
export type LegalOpinionEventCreateInput = z.infer<typeof legalOpinionEventCreateSchema>
export type LegalOpinionAttachmentCreateInput = z.infer<typeof legalOpinionAttachmentCreateSchema>
export type LegalOpinionAttachmentSignedUrlInput = z.infer<typeof legalOpinionAttachmentSignedUrlSchema>
