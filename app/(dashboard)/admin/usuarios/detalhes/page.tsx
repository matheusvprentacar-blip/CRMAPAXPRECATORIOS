"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Usuario } from "@/lib/types/database"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Loader2, Mail, Phone, User, FileText, Banknote, Calendar } from "@/components/icons"
import { ProfileTab } from "@/components/hr/profile-tab"
import { DocumentsTab } from "@/components/hr/documents-tab"
import { FinancialTab } from "@/components/hr/financial-tab"
import { LeavesTab } from "@/components/hr/leaves-tab"
import { OPERATOR_TAG_LABELS, normalizeOperatorTag } from "@/lib/users/operator-tag"

// ─── constants ────────────────────────────────────────────────────────────────

const AVATAR_PALETTE: [string, string][] = [
  ["#8b5cf6", "#6d28d9"],
  ["#3b82f6", "#1d4ed8"],
  ["#10b981", "#059669"],
  ["#f43f5e", "#be123c"],
  ["#f59e0b", "#b45309"],
  ["#6366f1", "#4338ca"],
  ["#ec4899", "#be185d"],
  ["#06b6d4", "#0e7490"],
  ["#84cc16", "#4d7c0f"],
  ["#fb923c", "#c2410c"],
]

function getAvatarColors(name: string): [string, string] {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

const ROLE_COLORS: Record<string, string> = {
  admin:             "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/25",
  gestor:            "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
  gestor_certidoes:  "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
  gestor_oficio:     "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
  gestor_escrituras: "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
  juridico:          "bg-violet-500/12 text-violet-700 dark:text-violet-300 border-violet-500/25",
  analista:          "bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/25",
  operador_comercial:"bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  operador_calculo:  "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300 border-cyan-500/25",
  tecnico_ti:        "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border-indigo-500/25",
  operador:           "bg-foreground/8 text-foreground/55 border-border/40",
  agente_atendimento: "bg-orange-500/12 text-orange-700 dark:text-orange-300 border-orange-500/25",
}

const ROLE_LABELS: Record<string, string> = {
  admin:              "Administrador",
  tecnico_ti:         "Técnico de T.I",
  operador_comercial: "Operador Comercial",
  operador_calculo:   "Operador de Cálculo",
  operador:           "Operador",
  analista:           "Analista",
  gestor:             "Gestor",
  gestor_certidoes:   "Gestor de Certidões",
  gestor_oficio:      "Gestor de Ofícios",
  gestor_escrituras:  "Gestor de Escrituras",
  juridico:           "Jurídico",
  agente_atendimento: "Agente de Atendimento",
}

// ─── component ────────────────────────────────────────────────────────────────

function UserDetailsContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const id           = searchParams.get("id")

  const [user, setUser]       = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) loadUser(id)
    else setLoading(false)
  }, [id])

  async function loadUser(userId: string) {
    const supabase = createBrowserClient()
    if (!supabase) return
    const { data } = await supabase.from("usuarios").select("*").eq("id", userId).single()
    if (data) setUser(data as unknown as Usuario)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || !id) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-foreground/60">Usuário não encontrado ou ID inválido.</p>
        <button
          onClick={() => router.back()}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/70 px-4 text-sm font-medium text-foreground/60 hover:bg-content2/60 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
      </div>
    )
  }

  const [c1, c2]    = getAvatarColors(user.nome)
  const initials    = user.nome.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  const admissionDate = user.admission_date
    ? new Date(user.admission_date).toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" })
    : null

  return (
    <div className="space-y-6">

      {/* ── BACK ───────────────────────────────────────────────────────────── */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-foreground/50 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Recursos Humanos
      </button>

      {/* ── PROFILE HERO ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/55 bg-card overflow-hidden">
        {/* Gradient band */}
        <div
          className="h-20 w-full"
          style={{ background: `linear-gradient(135deg, ${c1}22, ${c2}14)` }}
        />

        {/* Profile content */}
        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="flex items-end justify-between -mt-8 mb-4">
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg border-2 border-background"
              style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
            >
              {initials}
            </div>

            {/* Status badge */}
            <div className={[
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold",
              user.ativo
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300"
                : "bg-foreground/8 border-border/50 text-foreground/45",
            ].join(" ")}>
              <span className={[
                "h-1.5 w-1.5 rounded-full",
                user.ativo ? "bg-emerald-500" : "bg-foreground/30",
              ].join(" ")} />
              {user.ativo ? "Ativo" : "Inativo"}
            </div>
          </div>

          {/* Name + meta */}
          <h1 className="text-xl font-bold tracking-tight">{user.nome}</h1>
          {user.position && (
            <p className="text-sm text-foreground/55 mt-0.5">{user.position}</p>
          )}

          {/* Contact row */}
          <div className="flex flex-wrap items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-foreground/50">
              <Mail className="h-3.5 w-3.5" />
              <span>{user.email}</span>
            </div>
            {user.telefone && (
              <div className="flex items-center gap-1.5 text-xs text-foreground/50">
                <Phone className="h-3.5 w-3.5" />
                <span>{user.telefone}</span>
              </div>
            )}
            {admissionDate && (
              <div className="flex items-center gap-1.5 text-xs text-foreground/50">
                <Calendar className="h-3.5 w-3.5" />
                <span>Desde {admissionDate}</span>
              </div>
            )}
          </div>

          {/* Roles */}
          {user.role.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {user.role.map(r => (
                <span
                  key={r}
                  className={[
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                    ROLE_COLORS[r] ?? "bg-foreground/8 text-foreground/55 border-border/40",
                  ].join(" ")}
                >
                  {ROLE_LABELS[r] ?? r.replace(/_/g, " ")}
                </span>
              ))}
              {normalizeOperatorTag(user.operator_tag) && (
                <span className="inline-flex items-center rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                  {OPERATOR_TAG_LABELS[normalizeOperatorTag(user.operator_tag)!]}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── TABS ───────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-border/50 rounded-none gap-0">
          {[
            { value: "geral",       label: "Geral",               icon: User },
            { value: "documentos",  label: "Documentos",           icon: FileText },
            { value: "financeiro",  label: "Financeiro",           icon: Banknote },
            { value: "ocorrencias", label: "Ocorrências / Ponto",  icon: Calendar },
          ].map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={[
                "relative flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-foreground/50 transition-colors",
                "hover:text-foreground",
                "data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent",
                "data-[state=active]:shadow-none",
              ].join(" ")}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="geral">
            <ProfileTab user={user} onUpdate={() => loadUser(id)} />
          </TabsContent>
          <TabsContent value="documentos">
            <DocumentsTab user={user} />
          </TabsContent>
          <TabsContent value="financeiro">
            <FinancialTab user={user} />
          </TabsContent>
          <TabsContent value="ocorrencias">
            <LeavesTab user={user} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

export default function UserDetailsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <UserDetailsContent />
    </Suspense>
  )
}
