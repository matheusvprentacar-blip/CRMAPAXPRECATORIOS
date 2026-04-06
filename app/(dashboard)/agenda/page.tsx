"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar as HeroCalendar, DateField, DatePicker } from "@heroui/react"
import { parseDate, parseZonedDateTime, getLocalTimeZone } from "@internationalized/date"
import type { DateValue } from "@internationalized/date"
import {
  addDays,
  addHours,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import {
  AGENDA_DESTINO_LABELS,
  AGENDA_DESTINO_OPTIONS,
  AGENDA_PRIORIDADE_LABELS,
  AGENDA_PRIORIDADE_OPTIONS,
  AGENDA_STATUS_LABELS,
  AGENDA_STATUS_OPTIONS,
  AGENDA_TIPO_OPTIONS,
  type AgendaDestino,
  type AgendaEvento,
  type AgendaPrioridade,
  type AgendaStatus,
  type AgendaTipo,
} from "@/lib/types/agenda"
import {
  Button,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Skeleton,
  Surface,
  TextField,
} from "@heroui/react"
import { Textarea as UiTextarea } from "@/components/ui/textarea"

/* ─────────────────────────────────────────
   APAX CLAY — Design Tokens (inline styles)
   Usamos style={{}} para as sombras 4 camadas
   que não têm equivalente Tailwind nativo.
───────────────────────────────────────── */
const SH_CARD: React.CSSProperties = {
  boxShadow:
    "16px 16px 36px rgba(0,0,0,.08),-8px -8px 20px rgba(255,255,255,.94),inset 1px 1px 4px rgba(255,255,255,.9),inset -1px -1px 2px rgba(0,0,0,.04)",
}
const SH_CARD_HOVER: React.CSSProperties = {
  boxShadow:
    "22px 22px 48px rgba(0,0,0,.12),-10px -10px 26px rgba(255,255,255,.97),inset 1px 1px 4px rgba(255,255,255,.94),inset -1px -1px 2px rgba(0,0,0,.05)",
}
const SH_SM: React.CSSProperties = {
  boxShadow:
    "7px 7px 16px rgba(0,0,0,.07),-4px -4px 10px rgba(255,255,255,.92),inset 1px 1px 2px rgba(255,255,255,.88),inset -1px -1px 2px rgba(0,0,0,.03)",
}
const SH_BTN_AC: React.CSSProperties = {
  boxShadow:
    "8px 8px 20px rgba(14,77,106,.42),-3px -3px 8px rgba(255,255,255,.3),inset 1px 1px 3px rgba(255,255,255,.14),inset -1px -1px 2px rgba(8,40,60,.3)",
}
const SH_BTN_GHOST: React.CSSProperties = {
  boxShadow:
    "5px 5px 12px rgba(0,0,0,.07),-3px -3px 8px rgba(255,255,255,.92),inset 1px 1px 2px rgba(255,255,255,.87),inset -1px -1px 2px rgba(0,0,0,.04)",
}
const SH_INSET: React.CSSProperties = {
  boxShadow:
    "inset 5px 5px 12px rgba(0,0,0,.07),inset -4px -4px 10px rgba(255,255,255,.87)",
}

/* ─── Classes utilitárias Clay ─── */
// Card principal
const C_CARD = "bg-white rounded-[24px] border border-black/[0.07] overflow-hidden transition-all duration-300"
// Área inset/côncava
const C_INSET = "bg-[#f2f3f7] rounded-[18px] border border-black/[0.06]"
// Botão primário (azul petróleo)
const C_BTN_AC =
  "inline-flex items-center gap-2 h-10 px-5 rounded-[15px] bg-[#0e4d6a] text-white text-[12.5px] font-bold cursor-pointer select-none transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0.5 active:scale-95 relative overflow-hidden whitespace-nowrap"
// Botão ghost (neutro)
const C_BTN_GHOST =
  "inline-flex items-center gap-2 h-10 px-4 rounded-[15px] bg-gradient-to-b from-white to-[#f2f3f7] border border-black/[0.08] text-[#374151] text-[12.5px] font-bold cursor-pointer select-none transition-all duration-200 hover:-translate-y-0.5 hover:text-[#0b0c10] active:translate-y-0.5 active:scale-95 whitespace-nowrap"
// Botão ghost sm
const C_BTN_SM =
  "inline-flex items-center gap-1.5 h-8 px-3 rounded-[11px] bg-gradient-to-b from-white to-[#f2f3f7] border border-black/[0.07] text-[#374151] text-[11.5px] font-bold cursor-pointer select-none transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0.5 whitespace-nowrap"
// Badge
const C_BADGE = "inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10.5px] font-bold border whitespace-nowrap"

/* ─── SVG Ícones (Heroicons v2 outline) ─── */
const IC = {
  calendar: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  ),
  plus: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  refresh: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
  search: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  ),
  filter: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
    </svg>
  ),
  chevronLeft: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  ),
  chevronRight: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  ),
  edit: (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
    </svg>
  ),
  trash: (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  ),
  check: (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  xCircle: (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  bell: (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  ),
  mail: (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  ),
  doc: (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  ),
  clock: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  calSm: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  ),
  list: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  ),
  week: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M9 5.625v1.5m0 0V8.25m0 0H4.875m4.125 0h7.5m0-2.625V5.625m3.75 2.625v-1.5m0 1.5v1.5m0-1.5H16.5" />
    </svg>
  ),
  location: (
    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  ),
}

/* ─── Tipos ─── */
type EventForm = {
  titulo: string; descricao: string; tipo: AgendaTipo; status: AgendaStatus; prioridade: AgendaPrioridade
  inicioEm: string; fimEm: string; diaInteiro: boolean; local: string; precatorioId: string
  destino: AgendaDestino; destinatarioUsuarioId: string; enviarAlerta: boolean; alertaAntecedenciaMin: number
  dispararComoComunicado: boolean; comunicadoTitulo: string; comunicadoMensagem: string
}
type JanelaExecucaoTipo = "fixa" | "faixa"
type PrecatorioOption = { id: string; label: string; titulo: string; numeroPrecatorio: string; numeroProcesso: string; credorNome: string; searchText: string }
type ViewMode = "month" | "week" | "list"

/* ─── Cores semânticas de tipo ─── */
type TipoPalette = { stripe: string; bg: string; text: string; border: string; dot: string }
const TIPO_PALETTE: Record<AgendaTipo, TipoPalette> = {
  lembrete:   { stripe: "bg-amber-400",   bg: "bg-amber-50",   text: "text-amber-800",   border: "border-amber-200", dot: "bg-amber-400" },
  reuniao:    { stripe: "bg-blue-500",    bg: "bg-blue-50",    text: "text-blue-800",    border: "border-blue-200",  dot: "bg-blue-500" },
  tarefa:     { stripe: "bg-violet-500",  bg: "bg-violet-50",  text: "text-violet-800",  border: "border-violet-200",dot: "bg-violet-500" },
  comunicado: { stripe: "bg-[#0e4d6a]",  bg: "bg-[#e8f4f8]",  text: "text-[#0e4d6a]",  border: "border-[#a8d4e8]", dot: "bg-[#0e4d6a]" },
}

/* ─── Badges de status/prioridade (só funcionais) ─── */
const STATUS_CLS: Record<AgendaStatus, string> = {
  agendado:  "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]",
  concluido: "bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]",
  cancelado: "bg-[#f9fafb] text-[#6b7280] border-[#e5e7eb]",
}
const PRIO_CLS: Record<AgendaPrioridade, string> = {
  baixa: "bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]",
  media: "bg-[#fffbeb] text-[#92400e] border-[#fde68a]",
  alta:  "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]",
}

/* ─── Utilitários de data ─── */
const normalizeSearch = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
const sanitizeTA = (v: string) => v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/[\uFFFD\u25A0]/g, "")
const p2 = (n: number) => `${n}`.padStart(2, "0")
const p4 = (n: number) => `${n}`.padStart(4, "0")

function toLocalValue(d: Date) {
  return `${p4(d.getFullYear())}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:00`
}
function fromIso(v?: string | null) {
  if (!v) return ""; const d = new Date(v); return Number.isNaN(d.getTime()) ? "" : toLocalValue(d)
}
function toIso(v: string, dayOnly: boolean, end = false) {
  if (!v) return null; const d = new Date(v); if (Number.isNaN(d.getTime())) return null
  if (dayOnly) { if (end) d.setHours(23, 59, 59, 999); else d.setHours(0, 0, 0, 0) }
  return d.toISOString()
}
function defaultForm(base = new Date()): EventForm {
  const start = addHours(base, 1); start.setMinutes(0, 0, 0); const end = addHours(start, 1)
  return { titulo: "", descricao: "", tipo: "lembrete", status: "agendado", prioridade: "media",
    inicioEm: toLocalValue(start), fimEm: toLocalValue(end), diaInteiro: false, local: "",
    precatorioId: "", destino: "pessoal", destinatarioUsuarioId: "", enviarAlerta: true,
    alertaAntecedenciaMin: 30, dispararComoComunicado: false, comunicadoTitulo: "", comunicadoMensagem: "" }
}
function normalizeEvent(input: unknown): AgendaEvento | null {
  if (!input || typeof input !== "object") return null
  const o = input as Record<string, unknown>
  const s = (k: string) => { const v = o[k]; return typeof v === "string" ? v : null }
  const n = (k: string, fb = 0) => { const v = o[k]; if (typeof v === "number" && isFinite(v)) return v; if (typeof v === "string") { const p = Number(v); if (isFinite(p)) return p } return fb }
  const b = (k: string, fb = false) => { const v = o[k]; return typeof v === "boolean" ? v : fb }
  const id = s("id"); const titulo = s("titulo"); const inicio = s("inicio_em"); const criado = s("criado_por"); const ca = s("created_at"); const ua = s("updated_at")
  if (!id || !titulo || !inicio || !criado || !ca || !ua) return null
  return { id, titulo, descricao: s("descricao"), tipo: (s("tipo") || "lembrete") as AgendaTipo,
    status: (s("status") || "agendado") as AgendaStatus, prioridade: (s("prioridade") || "media") as AgendaPrioridade,
    inicio_em: inicio, fim_em: s("fim_em"), dia_inteiro: b("dia_inteiro"), local: s("local"),
    precatorio_id: s("precatorio_id"), criado_por: criado, destino: (s("destino") || "pessoal") as AgendaDestino,
    destinatario_usuario_id: s("destinatario_usuario_id"), enviar_alerta: b("enviar_alerta", true),
    alerta_antecedencia_min: n("alerta_antecedencia_min", 30), alerta_disparado_em: s("alerta_disparado_em"),
    disparar_como_comunicado: b("disparar_como_comunicado"), comunicado_titulo: s("comunicado_titulo"),
    comunicado_mensagem: s("comunicado_mensagem"), comunicado_publicado_id: s("comunicado_publicado_id"),
    created_at: ca, updated_at: ua }
}
function eventInDay(e: AgendaEvento, day: Date) {
  const start = new Date(e.inicio_em); if (Number.isNaN(start.getTime())) return false
  const ds = startOfDay(day); const de = addDays(ds, 1); const end = e.fim_em ? new Date(e.fim_em) : start
  return start < de && end >= ds
}
function periodLabel(e: AgendaEvento) {
  const d = new Date(e.inicio_em); if (Number.isNaN(d.getTime())) return "-"
  if (e.dia_inteiro) return format(d, "dd/MM/yyyy", { locale: ptBR })
  return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR })
}
function timeLabel(e: AgendaEvento) {
  if (e.dia_inteiro) return "Dia inteiro"
  const d = new Date(e.inicio_em); if (Number.isNaN(d.getTime())) return "-"
  const s = format(d, "HH:mm")
  if (!e.fim_em) return s
  const f = new Date(e.fim_em); if (Number.isNaN(f.getTime())) return s
  return `${s} – ${format(f, "HH:mm")}`
}
function calendarValueToDate(v: any): Date | null {
  if (!v) return null
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
  if (typeof v?.toDate === "function") { try { const d = v.toDate(getLocalTimeZone()); return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null } catch { return null } }
  if (typeof v === "string") { const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00`) : new Date(v); return Number.isNaN(d.getTime()) ? null : d }
  if (typeof v === "object") { const y = Number(v.year), m = Number(v.month), d = Number(v.day); if ([y, m, d].every(isFinite)) { const dt = new Date(y, m - 1, d); return Number.isNaN(dt.getTime()) ? null : dt } }
  return null
}
function dateValueToLocal(v: DateValue): string | null {
  const raw = v.toString().replace(/\[.*?\]$/, "")
  const m = raw.match(/^(\d{1,4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!m) return null
  return `${m[1].padStart(4, "0")}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] ?? "00"}`
}
function parseDateFieldValue(value: string, dayOnly: boolean): DateValue | null {
  if (!value) return null
  if (dayOnly) { const d = value.split("T")[0]; if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null; try { return parseDate(d) } catch { return null } }
  const m = value.replace(/\[.*?\]$/, "").match(/^(\d{1,4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:[+-]\d{2}:\d{2})?$/)
  if (!m) return null
  try { return parseZonedDateTime(`${m[1].padStart(4,"0")}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]??"00"}[America/Sao_Paulo]`) } catch { return null }
}
function shiftLocalDateTime(value: string, delta: number): string | null {
  const m = value.replace(/\[.*?\]$/, "").match(/^(\d{1,4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:[+-]\d{2}:\d{2})?$/)
  if (!m) return null
  const d = new Date(Date.UTC(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +(m[6]??"0")))
  if (Number.isNaN(d.getTime())) return null
  d.setUTCMinutes(d.getUTCMinutes() + delta)
  return `${p4(d.getUTCFullYear())}-${p2(d.getUTCMonth()+1)}-${p2(d.getUTCDate())}T${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`
}
function shiftLocalByUnits(value: string, u: { minutes?: number; days?: number; weeks?: number; months?: number }): string | null {
  const m = value.replace(/\[.*?\]$/, "").match(/^(\d{1,4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:[+-]\d{2}:\d{2})?$/)
  if (!m) return null
  const d = new Date(Date.UTC(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +(m[6]??"0")))
  if (Number.isNaN(d.getTime())) return null
  if (u.months) d.setUTCMonth(d.getUTCMonth() + u.months)
  if (u.weeks || u.days) d.setUTCDate(d.getUTCDate() + (u.days ?? 0) + (u.weeks ?? 0) * 7)
  if (u.minutes) d.setUTCMinutes(d.getUTCMinutes() + u.minutes)
  return `${p4(d.getUTCFullYear())}-${p2(d.getUTCMonth()+1)}-${p2(d.getUTCDate())}T${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`
}
function localTimeLabel(v: string) { const m = v.replace(/\[.*?\]$/, "").match(/T(\d{2}):(\d{2})/); return m ? `${m[1]}:${m[2]}` : "--:--" }

/* ─── KPI Card Clay ─── */
function KpiCard({ label, value, icon, accent = false }: { label: string; value: number | string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div
      className={`flex items-center gap-4 rounded-[18px] border p-4 transition-all duration-300 hover:-translate-y-0.5 ${accent ? "bg-[#0e4d6a] border-transparent" : "bg-white border-black/[0.07]"}`}
      style={accent ? { boxShadow: "12px 12px 28px rgba(14,77,106,.36),-5px -5px 14px rgba(255,255,255,.5),inset 1px 1px 4px rgba(255,255,255,.12)" } : SH_SM}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] ${accent ? "bg-white/15 text-white" : "bg-[#f2f3f7] text-[#374151]"}`} style={SH_SM}>
        {icon}
      </div>
      <div>
        <p className={`text-[9.5px] font-bold uppercase tracking-[1.4px] ${accent ? "text-white/55" : "text-[#9ca3af]"}`}>{label}</p>
        <p className={`text-[22px] font-black tabular-nums leading-tight ${accent ? "text-white" : "text-[#0b0c10]"}`}>{value}</p>
      </div>
    </div>
  )
}

/* ─── Card de Evento ─── */
function EventCard({ evento, onEdit, onDelete, onStatus, onCredit }: {
  evento: AgendaEvento
  onEdit: (e: AgendaEvento) => void
  onDelete: (e: AgendaEvento) => Promise<void>
  onStatus: (e: AgendaEvento, s: AgendaStatus) => Promise<void>
  onCredit: (id: string) => void
}) {
  const pal = TIPO_PALETTE[evento.tipo]
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className={`group relative overflow-hidden rounded-[18px] border ${pal.border} ${pal.bg} transition-all duration-200 hover:-translate-y-0.5`}
      style={SH_SM}
    >
      {/* Listra lateral de tipo */}
      <span className={`absolute left-0 top-0 h-full w-1 rounded-l-[18px] ${pal.stripe}`} />

      <div className="pl-3 pr-4 py-3.5">
        {/* Linha 1: título + badges */}
        <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
          <p className={`font-bold text-[13.5px] leading-snug ${pal.text}`}>{evento.titulo}</p>
          <div className="flex flex-wrap gap-1.5">
            <span className={`${C_BADGE} ${STATUS_CLS[evento.status]}`}>{AGENDA_STATUS_LABELS[evento.status]}</span>
            <span className={`${C_BADGE} ${PRIO_CLS[evento.prioridade]}`}>{AGENDA_PRIORIDADE_LABELS[evento.prioridade]}</span>
          </div>
        </div>

        {/* Linha 2: hora + local */}
        <div className="flex flex-wrap items-center gap-3 mb-2.5 text-[11.5px] text-[#6b7280] font-medium">
          <span className="flex items-center gap-1">{IC.clock}{timeLabel(evento)}</span>
          {evento.local ? <span className="flex items-center gap-1">{IC.location}{evento.local}</span> : null}
        </div>

        {/* Linha 3: chips adicionais */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`${C_BADGE} bg-white/70 text-[#374151] border-black/[0.07]`}>{AGENDA_DESTINO_LABELS[evento.destino]}</span>
          {evento.enviar_alerta ? <span className={`${C_BADGE} bg-[#fffbeb] text-[#92400e] border-[#fde68a]`}>{IC.bell} Alerta {evento.alerta_antecedencia_min}min</span> : null}
          {evento.disparar_como_comunicado ? <span className={`${C_BADGE} bg-[#e8f4f8] text-[#0e4d6a] border-[#a8d4e8]`}>{IC.mail} Comunicado</span> : null}
          {evento.precatorio_id ? (
            <button type="button" className={`${C_BADGE} bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe] cursor-pointer hover:bg-[#dbeafe]`} onClick={() => onCredit(evento.precatorio_id!)}>
              {IC.doc} Crédito
            </button>
          ) : null}
        </div>

        {/* Ações — visíveis no hover */}
        <div className="flex flex-wrap gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button type="button" className={C_BTN_SM} style={SH_BTN_GHOST} onClick={() => onEdit(evento)}>
            {IC.edit} Editar
          </button>
          {evento.status !== "concluido" ? (
            <button type="button" className={`${C_BTN_SM} text-[#15803d] bg-[#f0fdf4] border-[#bbf7d0]`} onClick={() => void onStatus(evento, "concluido")}>
              {IC.check} Concluir
            </button>
          ) : null}
          {evento.status !== "cancelado" ? (
            <button type="button" className={`${C_BTN_SM} text-[#6b7280] bg-[#f9fafb] border-[#e5e7eb]`} onClick={() => void onStatus(evento, "cancelado")}>
              {IC.xCircle} Cancelar
            </button>
          ) : null}
          <button type="button" className={`${C_BTN_SM} text-[#dc2626] bg-[#fef2f2] border-[#fecaca]`} onClick={() => void onDelete(evento)}>
            {IC.trash}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Vista Semana ─── */
function WeekView({ weekDays, filtered, day, onSelectDay, onEventClick }: {
  weekDays: Date[]; filtered: AgendaEvento[]; day: Date
  onSelectDay: (d: Date) => void; onEventClick: (e: AgendaEvento) => void
}) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {weekDays.map((d) => {
        const dayEvents = filtered.filter((ev) => eventInDay(ev, d))
        const selected = isSameDay(d, day); const today = isToday(d)
        return (
          <div key={d.toISOString()} className="min-w-0">
            <button type="button" onClick={() => onSelectDay(d)}
              className={`mb-1.5 w-full rounded-[12px] px-1 py-2 text-center transition-all duration-200 hover:-translate-y-0.5 ${selected ? "bg-[#0e4d6a] text-white" : today ? "bg-[#e8f4f8] text-[#0e4d6a]" : "bg-[#f2f3f7] text-[#374151]"}`}
              style={selected ? SH_BTN_AC : SH_SM}
            >
              <span className="block text-[10px] font-bold uppercase opacity-70">{format(d, "EEE", { locale: ptBR })}</span>
              <span className="block text-sm font-black">{format(d, "d")}</span>
              {dayEvents.length > 0 ? <span className="mt-0.5 block text-[10px] font-semibold opacity-60">{dayEvents.length}</span> : null}
            </button>
            <div className="flex flex-col gap-1">
              {dayEvents.slice(0, 3).map((ev) => {
                const pal = TIPO_PALETTE[ev.tipo]
                return (
                  <button key={ev.id} type="button" onClick={() => onEventClick(ev)}
                    className={`w-full rounded-[8px] border ${pal.border} ${pal.bg} p-1.5 text-left transition-all hover:opacity-80`}
                  >
                    <span className={`block truncate text-[10px] font-bold ${pal.text}`}>{ev.titulo}</span>
                    <span className="block text-[9px] text-[#9ca3af] font-medium">{timeLabel(ev)}</span>
                  </button>
                )
              })}
              {dayEvents.length > 3 ? (
                <span className="block rounded-[8px] bg-[#f2f3f7] p-1 text-center text-[9px] text-[#6b7280] font-semibold">+{dayEvents.length - 3} mais</span>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── DatePicker Popover Clay ─── */
function DatePopover({ label, value, dayOnly, onChange, onMinus, onPlus }: {
  label: string; value: string; dayOnly: boolean
  onChange: (v: DateValue | null) => void; onMinus: () => void; onPlus: () => void
}) {
  return (
    <DatePicker className="w-full" granularity={dayOnly ? "day" : "minute"} hideTimeZone hourCycle={24} shouldForceLeadingZeros
      value={parseDateFieldValue(value, dayOnly)} onChange={onChange}>
      <Label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af] mb-1 block">{label}</Label>
      <DateField.Group fullWidth variant="secondary">
        <DateField.Input>{(seg) => <DateField.Segment segment={seg} />}</DateField.Input>
        <DateField.Suffix><DatePicker.Trigger><DatePicker.TriggerIndicator /></DatePicker.Trigger></DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover className="w-[272px] rounded-[20px] border border-black/[0.07] bg-white p-2 z-[200]" style={SH_CARD}>
        <HeroCalendar aria-label={label} className="w-full rounded-[14px]">
          <HeroCalendar.Header>
            <HeroCalendar.YearPickerTrigger><HeroCalendar.YearPickerTriggerHeading /><HeroCalendar.YearPickerTriggerIndicator /></HeroCalendar.YearPickerTrigger>
            <HeroCalendar.NavButton slot="previous" /><HeroCalendar.NavButton slot="next" />
          </HeroCalendar.Header>
          <HeroCalendar.Grid>
            <HeroCalendar.GridHeader>{(d) => <HeroCalendar.HeaderCell>{d}</HeroCalendar.HeaderCell>}</HeroCalendar.GridHeader>
            <HeroCalendar.GridBody>{(date) => <HeroCalendar.Cell date={date} />}</HeroCalendar.GridBody>
          </HeroCalendar.Grid>
          <HeroCalendar.YearPickerGrid><HeroCalendar.YearPickerGridBody>{({ year }) => <HeroCalendar.YearPickerCell year={year} />}</HeroCalendar.YearPickerGridBody></HeroCalendar.YearPickerGrid>
        </HeroCalendar>
        {!dayOnly ? (
          <div className="mt-2 flex items-center justify-between rounded-[12px] border border-black/[0.06] bg-[#f2f3f7] px-2 py-1.5" style={SH_INSET}>
            <button type="button" className={`${C_BTN_SM} h-7 px-2`} style={SH_BTN_GHOST} onClick={onMinus}>{IC.chevronLeft}</button>
            <span className="text-xs font-bold tabular-nums text-[#374151]">{localTimeLabel(value)}</span>
            <button type="button" className={`${C_BTN_SM} h-7 px-2`} style={SH_BTN_GHOST} onClick={onPlus}>{IC.chevronRight}</button>
          </div>
        ) : null}
      </DatePicker.Popover>
    </DatePicker>
  )
}

/* ══════════════════════════════════════════
   PAGE COMPONENT
══════════════════════════════════════════ */
export default function AgendaPage() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createBrowserClient()
  const { profile } = useAuth()
  const userId = profile?.id ?? null
  const roles = Array.isArray(profile?.role) ? profile.role.map(String) : profile?.role ? [String(profile.role)] : []
  const isAdmin = roles.includes("admin")
  const isOperador = roles.some((r) => ["operador", "operador_comercial", "operador_calculo"].includes(r))
  const canManageTargets = isAdmin || roles.includes("gestor")
  const linkedPrecatorioParam = params.get("precatorioId") || ""
  const shouldOpenCreateFromParam = params.get("novo") === "1"

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [events, setEvents] = useState<AgendaEvento[]>([])
  const [users, setUsers] = useState<Array<{ id: string; nome: string; role: string[] }>>([])
  const [precatorios, setPrecatorios] = useState<PrecatorioOption[]>([])
  const [month, setMonth] = useState(startOfMonth(new Date()))
  const [day, setDay] = useState(startOfDay(new Date()))
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [search, setSearch] = useState("")
  const [creditSearch, setCreditSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [tipoFilter, setTipoFilter] = useState("todos")
  const [mineOnly, setMineOnly] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EventForm>(defaultForm())
  const [janelaExecucaoTipo, setJanelaExecucaoTipo] = useState<JanelaExecucaoTipo>("faixa")
  const createFromParamHandledRef = useRef<string | null>(null)

  /* ─── Load ─── */
  const runScheduler = useCallback(async () => {
    if (!supabase) return
    await supabase.rpc("processar_agenda_eventos_pendentes", { p_reference: new Date().toISOString() })
  }, [supabase])

  const loadOptions = useCallback(async () => {
    if (!supabase) return
    const toPO = (item: any): PrecatorioOption => {
      const id = String(item.id), titulo = String(item.titulo || ""), numeroPrecatorio = String(item.numero_precatorio || "")
      const numeroProcesso = String(item.numero_processo || ""), credorNome = String(item.credor_nome || "")
      const principalLabel = titulo || numeroPrecatorio || credorNome || id
      const detailParts = [
        credorNome && credorNome !== principalLabel ? `Credor: ${credorNome}` : "",
        numeroPrecatorio && numeroPrecatorio !== principalLabel ? `Prec.: ${numeroPrecatorio}` : "",
        numeroProcesso ? `Proc.: ${numeroProcesso}` : "",
      ].filter(Boolean)
      const label = detailParts.length > 0 ? `${principalLabel} - ${detailParts.join(" | ")}` : principalLabel
      return { id, label, titulo, numeroPrecatorio, numeroProcesso, credorNome, searchText: normalizeSearch(`${principalLabel} ${credorNome} ${numeroPrecatorio} ${numeroProcesso}`) }
    }
    const [ur, pr] = await Promise.all([
      supabase.from("usuarios").select("id, nome, role, ativo").eq("ativo", true).order("nome", { ascending: true }),
      supabase.from("precatorios").select("id, titulo, numero_precatorio, numero_processo, credor_nome, updated_at").order("updated_at", { ascending: false }).limit(2000),
    ])
    if (ur.error) throw ur.error; if (pr.error) throw pr.error
    setUsers((ur.data || []).map((item: any) => ({ id: String(item.id), nome: String(item.nome || "Sem nome"), role: Array.isArray(item.role) ? item.role.map(String) : [String(item.role || "")].filter(Boolean) })))
    const options = (pr.data || []).map(toPO)
    if (linkedPrecatorioParam && !options.some((x) => x.id === linkedPrecatorioParam)) {
      const { data: lp, error } = await supabase.from("precatorios").select("id, titulo, numero_precatorio, numero_processo, credor_nome").eq("id", linkedPrecatorioParam).maybeSingle()
      if (!error && lp) options.unshift(toPO(lp))
    }
    setPrecatorios(options)
  }, [linkedPrecatorioParam, supabase])

  const loadEvents = useCallback(async () => {
    if (!supabase || !userId) { setLoading(false); return }
    setLoading(true)
    try {
      await runScheduler()
      let q = supabase.from("agenda_eventos").select("*")
        .gte("inicio_em", subMonths(startOfMonth(month), 2).toISOString())
        .lte("inicio_em", addMonths(endOfMonth(month), 12).toISOString())
      if (isOperador && !isAdmin) q = q.or(`criado_por.eq.${userId},destinatario_usuario_id.eq.${userId}`)
      const { data, error } = await q.order("inicio_em", { ascending: true })
      if (error) throw error
      setEvents((data || []).map(normalizeEvent).filter((r): r is AgendaEvento => Boolean(r)))
    } finally { setLoading(false) }
  }, [isAdmin, isOperador, month, runScheduler, supabase, userId])

  useEffect(() => {
    if (!userId) return
    Promise.all([loadOptions(), loadEvents()]).catch((err) => { console.error(err); toast.error("Não foi possível carregar agenda.") })
  }, [loadEvents, loadOptions, userId])

  useEffect(() => {
    const id = params.get("eventoId"); if (!id) return
    const found = events.find((x) => x.id === id); if (!found) return
    const target = startOfDay(new Date(found.inicio_em))
    setDay(target); setMonth(startOfMonth(target))
  }, [events, params])

  /* ─── Filtros ─── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return events.filter((item) => {
      if (mineOnly && item.criado_por !== userId) return false
      if (statusFilter !== "todos" && item.status !== statusFilter) return false
      if (tipoFilter !== "todos" && item.tipo !== tipoFilter) return false
      if (!q) return true
      return `${item.titulo} ${item.descricao || ""} ${item.local || ""}`.toLowerCase().includes(q)
    })
  }, [events, mineOnly, search, statusFilter, tipoFilter, userId])

  const filteredPrecatorios = useMemo(() => {
    const q = normalizeSearch(creditSearch)
    const selected = form.precatorioId ? precatorios.find((x) => x.id === form.precatorioId) : null
    const ranked = q ? precatorios.map((item) => {
      const starts = item.searchText.startsWith(q), includes = item.searchText.includes(q)
      if (!starts && !includes) return null
      return { item, score: starts ? 2 : 1 }
    }).filter((e): e is { item: PrecatorioOption; score: number } => e !== null)
      .sort((a, b) => b.score !== a.score ? b.score - a.score : a.item.label.localeCompare(b.item.label))
      .map((e) => e.item) : precatorios
    const limited = ranked.slice(0, 120)
    if (selected && !limited.some((x) => x.id === selected.id)) return [selected, ...limited]
    return limited
  }, [creditSearch, form.precatorioId, precatorios])

  /* ─── Dados de calendário ─── */
  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }) })
  }, [month])

  const weekDays = useMemo(() => {
    const start = startOfWeek(day, { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end: addDays(start, 6) })
  }, [day])

  const selectedDayEvents = useMemo(() => filtered.filter((x) => eventInDay(x, day)), [day, filtered])
  const monthEvents = useMemo(() => filtered.filter((x) => isSameMonth(new Date(x.inicio_em), month)), [filtered, month])
  const nextWeekEvents = useMemo(() => {
    const now = new Date(); const end = addDays(now, 7)
    return filtered.filter((x) => { const d = new Date(x.inicio_em); return !isNaN(d.getTime()) && !isBefore(d, now) && isBefore(d, end) })
  }, [filtered])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaEvento[]>()
    filtered.forEach((ev) => {
      const key = format(new Date(ev.inicio_em), "yyyy-MM-dd")
      if (!map.has(key)) map.set(key, []); map.get(key)!.push(ev)
    }); return map
  }, [filtered])

  /* ─── Modal helpers ─── */
  const openCreate = useCallback((baseDay?: Date, prelinked = "", requireManualDate = false) => {
    const ref = baseDay ? addHours(startOfDay(baseDay), 9) : new Date()
    const f = defaultForm(ref)
    if (requireManualDate) { f.inicioEm = ""; f.fimEm = "" }
    if (prelinked) f.precatorioId = prelinked
    setEditingId(null); setJanelaExecucaoTipo("faixa"); setForm(f); setCreditSearch(""); setModalOpen(true)
  }, [])

  const handleCalendarDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const cell = (e.target as HTMLElement).closest('[data-date]') as HTMLElement | null
    const td = (e.target as HTMLElement).closest('td') as HTMLTableCellElement | null
    const raw = cell?.dataset?.date ?? td?.getAttribute('data-date') ?? null
    if (raw) {
      const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00`) : new Date(raw)
      if (!isNaN(parsed.getTime())) { const t = startOfDay(parsed); setDay(t); setMonth(startOfMonth(t)); openCreate(t); return }
    }
    const btn = (e.target as HTMLElement).closest('button[aria-label]') as HTMLButtonElement | null
    if (btn) { const parsed = new Date(btn.getAttribute('aria-label') ?? ""); if (!isNaN(parsed.getTime())) { const t = startOfDay(parsed); setDay(t); setMonth(startOfMonth(t)); openCreate(t) } }
  }, [openCreate])

  const openEdit = (ev: AgendaEvento) => {
    const il = fromIso(ev.inicio_em); const fb = defaultForm()
    const is = il || fb.inicioEm; const fl = fromIso(ev.fim_em || ev.inicio_em); const fs = fl || is
    const hasRange = Boolean(ev.fim_em && ev.fim_em !== ev.inicio_em)
    setEditingId(ev.id); setJanelaExecucaoTipo(hasRange ? "faixa" : "fixa")
    setForm({ titulo: ev.titulo, descricao: sanitizeTA(ev.descricao || ""), tipo: ev.tipo, status: ev.status,
      prioridade: ev.prioridade, inicioEm: is, fimEm: fs, diaInteiro: ev.dia_inteiro, local: ev.local || "",
      precatorioId: ev.precatorio_id || "", destino: ev.destino, destinatarioUsuarioId: ev.destinatario_usuario_id || "",
      enviarAlerta: ev.enviar_alerta, alertaAntecedenciaMin: Math.max(0, ev.alerta_antecedencia_min || 0),
      dispararComoComunicado: ev.disparar_como_comunicado, comunicadoTitulo: ev.comunicado_titulo || "",
      comunicadoMensagem: sanitizeTA(ev.comunicado_mensagem || ""),
    }); setCreditSearch(""); setModalOpen(true)
  }

  useEffect(() => {
    if (!shouldOpenCreateFromParam) return
    const key = `1:${linkedPrecatorioParam || ""}`
    if (createFromParamHandledRef.current === key) return
    createFromParamHandledRef.current = key
    const f = defaultForm(); if (linkedPrecatorioParam) f.precatorioId = linkedPrecatorioParam
    setEditingId(null); setJanelaExecucaoTipo("faixa"); setForm(f); setCreditSearch(""); setModalOpen(true)
  }, [linkedPrecatorioParam, shouldOpenCreateFromParam])

  /* ─── CRUD ─── */
  const saveEvent = async () => {
    if (!supabase || !userId) return
    if (!form.titulo.trim()) return toast.error("Informe o título.")
    const inicio = toIso(form.inicioEm, form.diaInteiro)
    if (!inicio) return toast.error("Informe a data de início.")
    const fim = janelaExecucaoTipo === "faixa" ? (form.fimEm ? toIso(form.fimEm, form.diaInteiro, true) : null) : null
    if (janelaExecucaoTipo === "faixa" && !fim) return toast.error("Informe a data de fim.")
    if (fim && new Date(fim) < new Date(inicio)) return toast.error("Data final deve ser maior ou igual ao início.")
    if (form.destino === "individual" && !form.destinatarioUsuarioId) return toast.error("Selecione o destinatário individual.")
    if (!canManageTargets && form.destino !== "pessoal") return toast.error("Seu perfil só pode usar destino pessoal.")
    if (form.dispararComoComunicado && !isAdmin) return toast.error("Somente admin pode agendar comunicados.")
    const payload = { titulo: form.titulo.trim(), descricao: form.descricao.trim() || null, tipo: form.tipo,
      status: form.status, prioridade: form.prioridade, inicio_em: inicio, fim_em: fim, dia_inteiro: form.diaInteiro,
      local: form.local.trim() || null, precatorio_id: form.precatorioId || null, destino: form.destino,
      destinatario_usuario_id: form.destino === "individual" ? form.destinatarioUsuarioId : null,
      enviar_alerta: form.enviarAlerta, alerta_antecedencia_min: Math.max(0, Number(form.alertaAntecedenciaMin) || 0),
      disparar_como_comunicado: isAdmin ? form.dispararComoComunicado : false,
      comunicado_titulo: isAdmin && form.dispararComoComunicado ? form.comunicadoTitulo.trim() || null : null,
      comunicado_mensagem: isAdmin && form.dispararComoComunicado ? form.comunicadoMensagem.trim() || null : null,
    }
    setSaving(true)
    try {
      if (editingId) { const { error } = await supabase.from("agenda_eventos").update(payload).eq("id", editingId); if (error) throw error }
      else { const { error } = await supabase.from("agenda_eventos").insert([{ ...payload, criado_por: userId }]); if (error) throw error }
      toast.success("Agendamento salvo."); setModalOpen(false); setEditingId(null); setJanelaExecucaoTipo("faixa"); setForm(defaultForm()); setCreditSearch("")
      await loadEvents()
    } catch (err) { console.error(err); toast.error("Não foi possível salvar agendamento.") }
    finally { setSaving(false) }
  }

  const removeEvent = async (ev: AgendaEvento) => {
    if (!supabase || !window.confirm(`Excluir "${ev.titulo}"?`)) return
    const { error } = await supabase.from("agenda_eventos").delete().eq("id", ev.id)
    if (error) return toast.error("Não foi possível excluir."); toast.success("Agendamento excluído."); await loadEvents()
  }

  const setEventStatus = async (ev: AgendaEvento, status: AgendaStatus) => {
    if (!supabase) return
    const { error } = await supabase.from("agenda_eventos").update({ status }).eq("id", ev.id)
    if (error) return toast.error("Não foi possível atualizar."); await loadEvents()
  }

  /* ─── Toggle de vista ─── */
  const VIEW_TABS: [ViewMode, React.ReactNode, string][] = [
    ["month", IC.calSm, "Mês"],
    ["week",  IC.week,  "Semana"],
    ["list",  IC.list,  "Lista"],
  ]

  /* ─── Botão de ação rápida no modal ─── */
  const qaClass = (active: boolean) =>
    `${C_BTN_SM} ${active ? "bg-[#0e4d6a] border-transparent text-white" : ""}`
  const qaStyle = (active: boolean): React.CSSProperties => active ? SH_BTN_AC : SH_BTN_GHOST

  /* ═══════════════ RENDER ═══════════════ */
  return (
    <div className="w-full min-h-screen bg-[#f0f1f5] px-3 py-4 sm:px-5 lg:px-7 lg:py-6 font-[\'Plus_Jakarta_Sans\',sans-serif]">

      {/* ══ HERO TITLE (padrão Apax Clay) ══ */}
      <div className={`${C_CARD} mb-6`} style={SH_CARD}>
        <div className="p-5 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,.85fr)]">
            {/* Coluna esquerda */}
            <div>
              <span className="inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full bg-primary/10 px-3 py-1.5 text-[13px] font-bold tracking-wide text-primary">
                <span className="shrink-0">●</span>
                <span className="truncate">CRM Precatórios · calendário</span>
              </span>
              <p className="mt-3 text-[clamp(1.55rem,6vw,4rem)] font-black leading-none tracking-[-0.05em] text-primary">
                Agenda
              </p>
              <h1 className="mt-3 text-[clamp(1rem,3vw,1.9rem)] font-bold leading-[1.1] tracking-[-0.03em] text-foreground">
                Compromissos, prazos e audiências.
              </h1>
              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground sm:text-[15px]">
                {format(month, "MMMM 'de' yyyy", { locale: ptBR })} — {monthEvents.length} evento(s) no período. Atualizado em {new Date().toLocaleString("pt-BR")}.
              </p>
              {/* Tabs de vista + ações */}
              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                {/* Segmented tabs */}
                <div className="flex w-full gap-1 rounded-[18px] border border-black/[0.07] bg-[#f2f3f7] p-1.5 sm:w-auto sm:inline-flex" style={SH_INSET}>
                  {VIEW_TABS.map(([key, icon, label]) => (
                    <button key={key} type="button" onClick={() => setViewMode(key)}
                      className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[13px] px-3 py-2 text-[11.5px] font-bold transition-all duration-200 sm:flex-none sm:px-4 ${viewMode === key ? "bg-[#0e4d6a] text-white" : "text-[#6b7280] hover:bg-white/60"}`}
                      style={viewMode === key ? SH_BTN_AC : undefined}
                    >
                      {icon}{label}
                    </button>
                  ))}
                </div>
                {/* Ações */}
                <div className="flex gap-2">
                  <button type="button" className={C_BTN_GHOST} style={SH_BTN_GHOST} onClick={() => void Promise.all([loadEvents(), loadOptions()])}>
                    {IC.refresh} Atualizar
                  </button>
                  <button type="button" className={C_BTN_AC} style={SH_BTN_AC} onClick={() => openCreate(undefined, "", true)}>
                    {IC.plus} Novo agendamento
                  </button>
                </div>
              </div>
            </div>

            {/* Coluna direita — KPIs */}
            <div className="grid grid-cols-2 gap-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[76px] rounded-[18px]" />)
              ) : (
                <>
                  <KpiCard label="Eventos no mês" value={monthEvents.length} icon={IC.calSm} />
                  <KpiCard label="Próx. 7 dias" value={nextWeekEvents.length} icon={IC.clock} accent />
                  <KpiCard label="Concluídos" value={monthEvents.filter((e) => e.status === "concluido").length} icon={IC.check} />
                  <KpiCard label="Comunicados" value={monthEvents.filter((e) => e.disparar_como_comunicado).length} icon={IC.mail} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ FILTROS ══ */}
      <div className={`${C_CARD} mb-5`} style={SH_CARD}>
        <div className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Busca */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]">{IC.search}</span>
              <input
                className="h-11 w-full rounded-[14px] border border-black/[0.07] bg-[#f2f3f7] pl-9 pr-3 text-[13.5px] font-medium text-[#0b0c10] placeholder:text-[#9ca3af] outline-none focus:border-[#0e4d6a] focus:ring-2 focus:ring-[#0e4d6a]/15 transition-all"
                style={SH_INSET}
                placeholder="Buscar título, local..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* Status */}
            <Select className="w-full" placeholder="Todos os status" value={statusFilter} onChange={(k) => setStatusFilter(String(k) || "todos")}>
              <Label className="sr-only">Status</Label>
              <Select.Trigger className="h-11 rounded-[14px] border border-black/[0.07] bg-[#f2f3f7]"><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover><ListBox>
                <ListBox.Item id="todos" textValue="Todos os status">Todos os status</ListBox.Item>
                {AGENDA_STATUS_OPTIONS.map((x) => <ListBox.Item key={x.key} id={x.key} textValue={x.label}>{x.label}</ListBox.Item>)}
              </ListBox></Select.Popover>
            </Select>
            {/* Tipo */}
            <Select className="w-full" placeholder="Todos os tipos" value={tipoFilter} onChange={(k) => setTipoFilter(String(k) || "todos")}>
              <Label className="sr-only">Tipo</Label>
              <Select.Trigger className="h-11 rounded-[14px] border border-black/[0.07] bg-[#f2f3f7]"><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover><ListBox>
                <ListBox.Item id="todos" textValue="Todos os tipos">Todos os tipos</ListBox.Item>
                {AGENDA_TIPO_OPTIONS.map((x) => <ListBox.Item key={x.key} id={x.key} textValue={x.label}>{x.label}</ListBox.Item>)}
              </ListBox></Select.Popover>
            </Select>
            {/* Meus */}
            <button type="button"
              className={`${mineOnly ? C_BTN_AC : C_BTN_GHOST} w-full justify-center h-11`}
              style={mineOnly ? SH_BTN_AC : SH_BTN_GHOST}
              onClick={() => setMineOnly((p) => !p)}
            >
              {IC.filter} {mineOnly ? "Somente meus ✓" : "Somente meus"}
            </button>
          </div>
        </div>
      </div>

      {/* ══ NAV DE MÊS/SEMANA ══ */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] font-bold text-[#374151]">
          {viewMode === "week"
            ? `${format(weekDays[0], "d")} – ${format(weekDays[6], "d 'de' MMMM yyyy", { locale: ptBR })}`
            : format(month, "MMMM yyyy", { locale: ptBR })}
        </p>
        <div className="flex items-center gap-1.5">
          <button type="button" className={C_BTN_SM} style={SH_BTN_GHOST}
            onClick={() => { const prev = viewMode === "week" ? addDays(day, -7) : subMonths(month, 1); if (viewMode === "week") { setDay(prev); setMonth(startOfMonth(prev)) } else setMonth(prev) }}>
            {IC.chevronLeft}
          </button>
          <button type="button" className={C_BTN_SM} style={SH_BTN_GHOST}
            onClick={() => { const t = new Date(); setDay(startOfDay(t)); setMonth(startOfMonth(t)) }}>
            Hoje
          </button>
          <button type="button" className={C_BTN_SM} style={SH_BTN_GHOST}
            onClick={() => { const next = viewMode === "week" ? addDays(day, 7) : addMonths(month, 1); if (viewMode === "week") { setDay(next); setMonth(startOfMonth(next)) } else setMonth(next) }}>
            {IC.chevronRight}
          </button>
        </div>
      </div>

      {/* ══ VISTAS ══ */}
      <AnimatePresence mode="wait">

        {/* VISTA MÊS */}
        {viewMode === "month" && (
          <motion.div key="month" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            className="grid gap-5 xl:grid-cols-[1fr_360px]">

            {/* Calendário */}
            <div className={C_CARD} style={SH_CARD}>
              <div className="border-b border-[#e8eaef] px-5 py-4">
                <p className="text-[15px] font-bold text-[#0b0c10]">{format(month, "MMMM yyyy", { locale: ptBR })}</p>
                <p className="text-[11px] text-[#9ca3af] font-medium mt-0.5">Clique para selecionar · Duplo clique para criar</p>
              </div>
              {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
              <div className="p-4" onDoubleClick={handleCalendarDoubleClick}>
                {loading ? (
                  <div className="grid grid-cols-7 gap-1">{Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-[10px]" />)}</div>
                ) : (
                  <>
                    {/* Header dias */}
                    <div className="mb-1 grid grid-cols-7 gap-1">
                      {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d, i) => (
                        <div key={d} className={`py-1 text-center text-[10px] font-bold uppercase tracking-wider ${i === 0 ? "text-[#dc2626]" : "text-[#9ca3af]"}`}>{d}</div>
                      ))}
                    </div>
                    {/* Grid dias */}
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((d) => {
                        const key = format(d, "yyyy-MM-dd")
                        const dayEvs = eventsByDay.get(key) || []
                        const selected = isSameDay(d, day); const today = isToday(d)
                        const inMonth = isSameMonth(d, month); const isSun = d.getDay() === 0
                        return (
                          <button key={key} type="button" data-date={key}
                            onClick={() => { setDay(startOfDay(d)); setMonth(startOfMonth(d)) }}
                            className={`group relative flex min-h-[70px] flex-col rounded-[12px] border p-1.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${selected ? "border-[#a8d4e8] bg-[#e8f4f8]" : today ? "border-[#a8d4e8]/50 bg-[#f0f8fc]" : "border-transparent hover:border-[#e8eaef] hover:bg-white"} ${!inMonth ? "opacity-35" : ""}`}
                          >
                            <span className={`inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-[12px] font-black leading-none ${selected ? "bg-[#0e4d6a] text-white" : today ? "bg-[#e8f4f8] text-[#0e4d6a]" : isSun ? "text-[#dc2626]" : "text-[#374151]"}`} style={selected ? SH_BTN_AC : undefined}>
                              {format(d, "d")}
                            </span>
                            <div className="mt-1 flex flex-col gap-0.5">
                              {dayEvs.slice(0, 2).map((ev) => {
                                const pal = TIPO_PALETTE[ev.tipo]
                                return <span key={ev.id} className={`block truncate rounded-[4px] px-1 py-px text-[9px] font-bold ${pal.bg} ${pal.text}`}>{ev.titulo}</span>
                              })}
                              {dayEvs.length > 2 ? <span className="block px-1 text-[9px] text-[#9ca3af] font-semibold">+{dayEvs.length - 2}</span> : null}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Painel dia */}
            <div className={`${C_CARD} flex flex-col`} style={SH_CARD}>
              <div className="flex items-center justify-between border-b border-[#e8eaef] px-5 py-4">
                <div>
                  <p className="text-[15px] font-bold text-[#0b0c10] capitalize">{format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
                  <p className="text-[11px] text-[#9ca3af] font-medium mt-0.5">{selectedDayEvents.length} evento(s)</p>
                </div>
                <button type="button" className={C_BTN_SM} style={SH_BTN_GHOST} onClick={() => openCreate(day)}>
                  {IC.plus} Agendar
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 min-h-0">
                {loading ? (
                  <div className="flex flex-col gap-3">{[1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-[18px]" />)}</div>
                ) : selectedDayEvents.length === 0 ? (
                  <div className={`${C_INSET} flex flex-col items-center justify-center p-8 text-center`} style={SH_INSET}>
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-white text-[#9ca3af]" style={SH_SM}>{IC.calendar}</div>
                    <p className="text-[13px] font-bold text-[#374151]">Nenhum evento</p>
                    <p className="mt-1 text-[11px] text-[#9ca3af]">Clique em "Agendar" para criar</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    <div className="flex flex-col gap-3">
                      {selectedDayEvents.map((ev) => (
                        <EventCard key={ev.id} evento={ev} onEdit={openEdit}
                          onDelete={removeEvent} onStatus={setEventStatus}
                          onCredit={(id) => router.push(`/precatorios/detalhes?id=${id}`)} />
                      ))}
                    </div>
                  </AnimatePresence>
                )}
              </div>

              {/* Próximos 7 dias */}
              {nextWeekEvents.length > 0 && (
                <div className="border-t border-[#e8eaef] p-4">
                  <p className="mb-2 text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Próximos 7 dias ({nextWeekEvents.length})</p>
                  <div className="flex flex-col gap-1">
                    {nextWeekEvents.slice(0, 5).map((ev) => {
                      const pal = TIPO_PALETTE[ev.tipo]
                      return (
                        <button key={ev.id} type="button"
                          className={`flex items-center gap-2 rounded-[10px] border ${pal.border} ${pal.bg} px-3 py-2 text-left transition-all hover:opacity-80 hover:-translate-y-px`}
                          onClick={() => { const t = new Date(ev.inicio_em); setDay(startOfDay(t)); setMonth(startOfMonth(t)) }}
                        >
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${pal.dot}`} />
                          <span className={`flex-1 truncate text-[12px] font-bold ${pal.text}`}>{ev.titulo}</span>
                          <span className="shrink-0 text-[10px] text-[#9ca3af] font-medium">{periodLabel(ev)}</span>
                        </button>
                      )
                    })}
                    {nextWeekEvents.length > 5 ? <p className="text-center text-[11px] text-[#9ca3af] font-medium">+{nextWeekEvents.length - 5} mais</p> : null}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* VISTA SEMANA */}
        {viewMode === "week" && (
          <motion.div key="week" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            className={C_CARD} style={SH_CARD}>
            <div className="border-b border-[#e8eaef] px-5 py-4">
              <p className="text-[15px] font-bold text-[#0b0c10]">Vista Semanal</p>
              <p className="text-[11px] text-[#9ca3af] font-medium">{format(weekDays[0], "d", { locale: ptBR })} – {format(weekDays[6], "d 'de' MMMM", { locale: ptBR })}</p>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="grid grid-cols-7 gap-2">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-[14px]" />)}</div>
              ) : (
                <WeekView weekDays={weekDays} filtered={filtered} day={day}
                  onSelectDay={(d) => { setDay(d); setMonth(startOfMonth(d)) }}
                  onEventClick={openEdit} />
              )}
            </div>
          </motion.div>
        )}

        {/* VISTA LISTA */}
        {viewMode === "list" && (
          <motion.div key="list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            className={C_CARD} style={SH_CARD}>
            <div className="flex items-center justify-between border-b border-[#e8eaef] px-5 py-4">
              <div>
                <p className="text-[15px] font-bold text-[#0b0c10]">Todos os eventos</p>
                <p className="text-[11px] text-[#9ca3af] font-medium">{filtered.length} resultado(s)</p>
              </div>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-[18px]" />)}</div>
              ) : filtered.length === 0 ? (
                <div className={`${C_INSET} flex flex-col items-center justify-center p-14 text-center`} style={SH_INSET}>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-white text-[#9ca3af]" style={SH_SM}>{IC.list}</div>
                  <p className="text-[13px] font-bold text-[#374151]">Nenhum evento encontrado</p>
                  <p className="mt-1 text-[11px] text-[#9ca3af]">Tente ajustar os filtros acima</p>
                </div>
              ) : (
                <AnimatePresence>
                  <div className="flex flex-col gap-3">
                    {filtered.map((ev) => (
                      <EventCard key={ev.id} evento={ev} onEdit={openEdit}
                        onDelete={removeEvent} onStatus={setEventStatus}
                        onCredit={(id) => router.push(`/precatorios/detalhes?id=${id}`)} />
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ MODAL NOVO/EDITAR ══ */}
      <Modal isOpen={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setCreditSearch("") }}>
        <Modal.Backdrop className="bg-[#0b0c10]/55 backdrop-blur-[6px]">
          <Modal.Container placement="center" size="3xl" className="px-3 sm:px-6">
            <Modal.Dialog className="sm:max-w-4xl overflow-hidden rounded-[28px] border border-black/[0.07] bg-white outline-none"
              style={{ boxShadow: "24px 24px 60px rgba(0,0,0,.18),-10px -10px 28px rgba(255,255,255,.5),inset 1px 1px 4px rgba(255,255,255,.9)" }}>
              {({ close }) => (
                <>
                  <Modal.CloseTrigger className="absolute right-5 top-5 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.07] bg-[#f2f3f7] text-[#6b7280] hover:bg-[#e8eaef] transition-colors" style={SH_SM} />

                  {/* Header modal */}
                  <Modal.Header className="relative border-b border-[#e8eaef] bg-white px-6 pb-5 pt-7 sm:px-8">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#e8f4f8] text-[#0e4d6a]" style={SH_SM}>
                      {IC.calSm}
                    </div>
                    <Modal.Heading className="text-[22px] font-black tracking-tight text-[#0b0c10]">
                      {editingId ? "Editar agendamento" : "Novo agendamento"}
                    </Modal.Heading>
                    <p className="mt-1 text-[13px] text-[#6b7280] font-medium">Preencha os detalhes para organizar o compromisso.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`${C_BADGE} bg-[#fffbeb] text-[#92400e] border-[#fde68a]`}>Agenda inteligente</span>
                      <span className={`${C_BADGE} bg-[#f2f3f7] text-[#374151] border-black/[0.07]`}>Fluxo operacional</span>
                      {isAdmin ? <span className={`${C_BADGE} bg-[#e8f4f8] text-[#0e4d6a] border-[#a8d4e8]`}>Administrador</span> : null}
                    </div>
                  </Modal.Header>

                  {/* Body modal */}
                  <Modal.Body className="max-h-[68vh] overflow-y-auto bg-[#f0f1f5] px-4 pb-6 pt-4 sm:px-8 space-y-4">

                    {/* Seção: Dados principais */}
                    <div className={`${C_CARD} p-5`} style={SH_CARD}>
                      <p className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af] mb-4">Dados principais</p>
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* @ts-expect-error sem tipos */}
                        <TextField className="w-full" placeholder="Ex.: Reunião com cliente" value={form.titulo} onChange={(v: string) => setForm((p) => ({ ...p, titulo: v }))}>
                          <Label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af] mb-1 block">Título *</Label>
                          <Input className="!bg-[#f2f3f7] !rounded-[14px] !border-black/[0.07]" />
                        </TextField>
                        {/* @ts-expect-error sem tipos */}
                        <TextField className="w-full" placeholder="Ex.: Sala 2 / Meet" value={form.local} onChange={(v: string) => setForm((p) => ({ ...p, local: v }))}>
                          <Label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af] mb-1 block">Local</Label>
                          <Input className="!bg-[#f2f3f7] !rounded-[14px] !border-black/[0.07]" />
                        </TextField>
                      </div>
                      <div className="mt-4">
                        <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af] mb-1.5 block">Descrição</label>
                        <UiTextarea className="min-h-[72px] w-full rounded-[14px] border border-black/[0.07] bg-[#f2f3f7] px-3 py-2.5 text-[13.5px] font-medium text-[#0b0c10] placeholder:text-[#9ca3af] outline-none focus:border-[#0e4d6a] focus:ring-2 focus:ring-[#0e4d6a]/12 transition-all"
                          style={SH_INSET} placeholder="Detalhes adicionais..."
                          value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: sanitizeTA(e.target.value) }))} />
                      </div>
                    </div>

                    {/* Seção: Classificação */}
                    <div className={`${C_CARD} p-5`} style={SH_CARD}>
                      <p className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af] mb-4">Classificação</p>
                      <div className="grid gap-4 md:grid-cols-2">
                        {[
                          { lbl: "Tipo", val: form.tipo, opts: AGENDA_TIPO_OPTIONS, set: (k: string) => setForm((p) => ({ ...p, tipo: (k as AgendaTipo) || "lembrete" })) },
                          { lbl: "Status", val: form.status, opts: AGENDA_STATUS_OPTIONS, set: (k: string) => setForm((p) => ({ ...p, status: (k as AgendaStatus) || "agendado" })) },
                          { lbl: "Prioridade", val: form.prioridade, opts: AGENDA_PRIORIDADE_OPTIONS, set: (k: string) => setForm((p) => ({ ...p, prioridade: (k as AgendaPrioridade) || "media" })) },
                        ].map(({ lbl, val, opts, set }) => (
                          <Select key={lbl} className="w-full" placeholder={lbl} value={val} onChange={(k) => set(String(k) || "")}>
                            <Label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af] mb-1 block">{lbl}</Label>
                            <Select.Trigger className="!bg-[#f2f3f7] !rounded-[14px] !border-black/[0.07]"><Select.Value /><Select.Indicator /></Select.Trigger>
                            <Select.Popover><ListBox>{opts.map((x) => <ListBox.Item key={x.key} id={x.key} textValue={x.label}>{x.label}</ListBox.Item>)}</ListBox></Select.Popover>
                          </Select>
                        ))}
                        <Select className="w-full" placeholder="Destino" isDisabled={!canManageTargets} value={form.destino}
                          onChange={(k) => { const next = (String(k) as AgendaDestino) || "pessoal"; setForm((p) => ({ ...p, destino: canManageTargets ? next : "pessoal", destinatarioUsuarioId: next === "individual" ? p.destinatarioUsuarioId : "" })) }}>
                          <Label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af] mb-1 block">Destino</Label>
                          <Select.Trigger className="!bg-[#f2f3f7] !rounded-[14px] !border-black/[0.07]"><Select.Value /><Select.Indicator /></Select.Trigger>
                          <Select.Popover><ListBox>{AGENDA_DESTINO_OPTIONS.filter((x) => canManageTargets || x.key === "pessoal").map((x) => <ListBox.Item key={x.key} id={x.key} textValue={x.label}>{x.label}</ListBox.Item>)}</ListBox></Select.Popover>
                        </Select>
                      </div>
                    </div>

                    {/* Seção: Janela de execução */}
                    <div className={`${C_CARD} p-5`} style={SH_CARD}>
                      <p className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af] mb-3">Janela de execução</p>
                      {/* Tipo de janela */}
                      <div className="mb-4 flex gap-2">
                        {(["fixa", "faixa"] as JanelaExecucaoTipo[]).map((tipo) => (
                          <button key={tipo} type="button"
                            className={tipo === janelaExecucaoTipo ? C_BTN_AC : C_BTN_GHOST}
                            style={tipo === janelaExecucaoTipo ? SH_BTN_AC : SH_BTN_GHOST}
                            onClick={() => {
                              setJanelaExecucaoTipo(tipo)
                              if (tipo === "faixa") setForm((p) => {
                                if (p.fimEm) return p
                                const base = p.inicioEm || defaultForm().inicioEm
                                const next = shiftLocalByUnits(base, { minutes: 60 })
                                if (!next) return p
                                return { ...p, fimEm: p.diaInteiro ? `${next.split("T")[0]}T23:59:59` : next }
                              })
                            }}>
                            {tipo === "fixa" ? "Data fixa" : "Faixa de data"}
                          </button>
                        ))}
                      </div>
                      <div className={`grid gap-4 ${janelaExecucaoTipo === "faixa" ? "md:grid-cols-2" : ""}`}>
                        <DatePopover
                          label={janelaExecucaoTipo === "faixa" ? "Início" : "Data"}
                          value={form.inicioEm} dayOnly={form.diaInteiro}
                          onChange={(val) => {
                            if (!val) { setForm((p) => ({ ...p, inicioEm: "" })); return }
                            if (form.diaInteiro) { setForm((p) => ({ ...p, inicioEm: `${val.toString()}T00:00:00` })); return }
                            const n = dateValueToLocal(val); setForm((p) => ({ ...p, inicioEm: n || p.inicioEm }))
                          }}
                          onMinus={() => setForm((p) => { const n = shiftLocalDateTime(p.inicioEm, -30); return { ...p, inicioEm: n || p.inicioEm } })}
                          onPlus={() => setForm((p) => { const n = shiftLocalDateTime(p.inicioEm, 30); return { ...p, inicioEm: n || p.inicioEm } })}
                        />
                        {janelaExecucaoTipo === "faixa" ? (
                          <DatePopover label="Fim" value={form.fimEm} dayOnly={form.diaInteiro}
                            onChange={(val) => {
                              if (!val) { setForm((p) => ({ ...p, fimEm: "" })); return }
                              if (form.diaInteiro) { setForm((p) => ({ ...p, fimEm: `${val.toString()}T23:59:59` })); return }
                              const n = dateValueToLocal(val); setForm((p) => ({ ...p, fimEm: n || p.fimEm }))
                            }}
                            onMinus={() => setForm((p) => { const n = shiftLocalDateTime(p.fimEm, -30); return { ...p, fimEm: n || p.fimEm } })}
                            onPlus={() => setForm((p) => { const n = shiftLocalDateTime(p.fimEm, 30); return { ...p, fimEm: n || p.fimEm } })}
                          />
                        ) : null}
                      </div>
                      {/* Atalhos de duração */}
                      {janelaExecucaoTipo === "faixa" ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {[{ label: "Fim +30min", units: { minutes: 30 } }, { label: "Fim +1h", units: { minutes: 60 } }, { label: "Fim +1 dia", units: { days: 1 } }, { label: "Fim +1 sem", units: { weeks: 1 } }, { label: "Fim +1 mês", units: { months: 1 } }].map(({ label, units }) => (
                            <button key={label} type="button" className={C_BTN_SM} style={SH_BTN_GHOST}
                              onClick={() => setForm((p) => { const base = p.inicioEm || defaultForm().inicioEm; const n = shiftLocalByUnits(base, units); if (!n) return p; return { ...p, fimEm: p.diaInteiro ? `${n.split("T")[0]}T23:59:59` : n } })}>
                              {label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {/* Seção: Ações rápidas */}
                    <div className={`${C_CARD} p-5`} style={SH_CARD}>
                      <p className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af] mb-3">Ações rápidas</p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className={qaClass(form.diaInteiro)} style={qaStyle(form.diaInteiro)} onClick={() => setForm((p) => ({ ...p, diaInteiro: !p.diaInteiro }))}>
                          {IC.calSm} Dia inteiro
                        </button>
                        <button type="button" className={qaClass(form.enviarAlerta)} style={qaStyle(form.enviarAlerta)} onClick={() => setForm((p) => ({ ...p, enviarAlerta: !p.enviarAlerta }))}>
                          {IC.bell} Enviar alerta
                        </button>
                        {isAdmin ? (
                          <button type="button" className={qaClass(form.dispararComoComunicado)} style={qaStyle(form.dispararComoComunicado)} onClick={() => setForm((p) => ({ ...p, dispararComoComunicado: !p.dispararComoComunicado }))}>
                            {IC.mail} Comunicado
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* Seção: Crédito vinculado */}
                    <div className={`${C_CARD} p-5`} style={SH_CARD}>
                      <p className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af] mb-3">Crédito vinculado</p>
                      <Select className="w-full" placeholder="Selecionar crédito" value={form.precatorioId} onChange={(k) => setForm((p) => ({ ...p, precatorioId: String(k) || "" }))}>
                        <Label className="sr-only">Crédito</Label>
                        <Select.Trigger className="!bg-[#f2f3f7] !rounded-[14px] !border-black/[0.07]"><Select.Value /><Select.Indicator /></Select.Trigger>
                        <Select.Popover>
                          <div className="border-b border-[#e8eaef] p-2">
                            <Input placeholder="Buscar..." size="sm" value={creditSearch} onChange={(e: any) => setCreditSearch(e.target.value)} />
                          </div>
                          <ListBox className="max-h-[200px] overflow-y-auto">
                            {filteredPrecatorios.map((x) => <ListBox.Item key={x.id} id={x.id} textValue={x.label}>{x.label}</ListBox.Item>)}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>

                    {/* Seção: Destinatário individual */}
                    {form.destino === "individual" ? (
                      <div className={`${C_CARD} p-5`} style={SH_CARD}>
                        <Select className="w-full" placeholder="Selecione destinatário" value={form.destinatarioUsuarioId} onChange={(k) => setForm((p) => ({ ...p, destinatarioUsuarioId: String(k) || "" }))}>
                          <Label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af] mb-1 block">Destinatário individual</Label>
                          <Select.Trigger className="!bg-[#f2f3f7] !rounded-[14px] !border-black/[0.07]"><Select.Value /><Select.Indicator /></Select.Trigger>
                          <Select.Popover><ListBox>{users.map((x) => <ListBox.Item key={x.id} id={x.id} textValue={x.nome}>{x.nome}</ListBox.Item>)}</ListBox></Select.Popover>
                        </Select>
                      </div>
                    ) : null}

                    {/* Seção: Comunicado (somente admin) */}
                    {isAdmin && form.dispararComoComunicado ? (
                      <div className="rounded-[20px] border border-[#a8d4e8] bg-[#e8f4f8] p-5">
                        <div className="mb-3 flex items-center gap-2 text-[#0e4d6a]">
                          {IC.mail}
                          <p className="text-[9.5px] font-bold uppercase tracking-[1.4px]">Configurações do comunicado</p>
                        </div>
                        {/* @ts-expect-error sem tipos */}
                        <TextField className="mb-4 w-full" value={form.comunicadoTitulo} onChange={(v: string) => setForm((p) => ({ ...p, comunicadoTitulo: v }))}>
                          <Label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#6b7280] mb-1 block">Título do comunicado</Label>
                          <Input className="!bg-white !rounded-[14px] !border-[#a8d4e8]" placeholder="Assunto do alerta..." />
                        </TextField>
                        <div>
                          <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#6b7280] mb-1.5 block">Mensagem</label>
                          <UiTextarea className="min-h-[72px] w-full rounded-[14px] border border-[#a8d4e8] bg-white px-3 py-2.5 text-[13.5px] font-medium text-[#0b0c10] placeholder:text-[#9ca3af] outline-none focus:border-[#0e4d6a] focus:ring-2 focus:ring-[#0e4d6a]/12 transition-all"
                            placeholder="Conteúdo enviado aos usuários..."
                            value={form.comunicadoMensagem} onChange={(e) => setForm((p) => ({ ...p, comunicadoMensagem: sanitizeTA(e.target.value) }))} />
                        </div>
                      </div>
                    ) : null}
                  </Modal.Body>

                  {/* Footer modal */}
                  <Modal.Footer className="flex items-center justify-end gap-3 border-t border-[#e8eaef] bg-white px-6 pb-6 pt-4 sm:px-8">
                    <button type="button" className={C_BTN_GHOST} style={SH_BTN_GHOST} onClick={close}>Cancelar</button>
                    <button type="button" className={`${C_BTN_AC} h-11 px-8 text-[13.5px]`} style={SH_BTN_AC} disabled={saving} onClick={() => void saveEvent()}>
                      {saving ? "Salvando..." : "Salvar agendamento"}
                    </button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  )
}
