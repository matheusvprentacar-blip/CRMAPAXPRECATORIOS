"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { downloadFileAsArrayBuffer, getFileDownloadUrl, uploadFile } from "@/lib/utils/file-upload"
import { useAuth } from "@/lib/auth/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { usePDFViewer } from "@/components/providers/pdf-viewer-provider"
import { saveFileWithPicker } from "@/lib/utils/file-saver-custom"
import { toast } from "sonner"
import {
  ArrowDown,
  ArrowLeft,
  Download,
  Eye,
  FileText,
  MoreVertical,
  Paperclip,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react"

interface Usuario {
  id: string
  nome: string
  email?: string | null
  foto_url?: string | null
  role?: string | string[] | null
}

interface ChatMensagem {
  id: string
  remetente_id: string
  destinatario_id: string
  texto: string
  lida: boolean
  arquivo_url?: string | null
  arquivo_nome?: string | null
  arquivo_tipo?: string | null
  arquivo_tamanho?: number | null
  created_at: string
}

const CHAT_BUCKET = process.env.NEXT_PUBLIC_CHAT_BUCKET || "precatorios-pdf"
const DELETED_MARKER = "__MENSAGEM_APAGADA__"
const DEFAULT_SENT_ATTACHMENT_TEXT = "Arquivo enviado"

function getFileNameFromUrl(url?: string | null): string {
  if (!url) return "arquivo"
  if (url.startsWith("storage:")) {
    const match = url.match(/^storage:[^/]+\/(.+)$/)
    if (match) {
      const path = match[1]
      return decodeURIComponent(path.split("/").pop() || "arquivo")
    }
  }

  try {
    const parsed = new URL(url)
    return decodeURIComponent(parsed.pathname.split("/").pop() || "arquivo")
  } catch {
    return decodeURIComponent(url.split("/").pop() || "arquivo")
  }
}

function getFileExt(name: string): string {
  const base = name.split("?")[0]
  const parts = base.split(".")
  return parts.length > 1 ? (parts.pop() || "").toLowerCase() : ""
}

function isDeletedMessage(msg: Pick<ChatMensagem, "texto">): boolean {
  return (msg.texto || "").trim() === DELETED_MARKER
}

function getMetaMessageText(msg: Pick<ChatMensagem, "texto" | "arquivo_nome">): string {
  if (isDeletedMessage(msg)) return "Mensagem apagada"
  if (msg.arquivo_nome) return `📎 ${msg.arquivo_nome}`
  return msg.texto || ""
}

function isPdfAttachment(msg: Pick<ChatMensagem, "arquivo_nome" | "arquivo_url" | "arquivo_tipo">): boolean {
  if (!msg.arquivo_url && !msg.arquivo_nome) return false
  if ((msg.arquivo_tipo || "").toLowerCase().includes("pdf")) return true
  const name = msg.arquivo_nome || getFileNameFromUrl(msg.arquivo_url)
  return getFileExt(name) === "pdf"
}

function isImageAttachment(msg: Pick<ChatMensagem, "arquivo_nome" | "arquivo_url" | "arquivo_tipo">): boolean {
  if (!msg.arquivo_url && !msg.arquivo_nome) return false
  const mime = (msg.arquivo_tipo || "").toLowerCase()
  if (mime.startsWith("image/")) return true
  const name = msg.arquivo_nome || getFileNameFromUrl(msg.arquivo_url)
  const ext = getFileExt(name)
  return ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || "Erro desconhecido."
  if (typeof error === "string") return error
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message
    if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage
    try {
      return JSON.stringify(error)
    } catch {
      return "Erro desconhecido."
    }
  }
  return "Erro desconhecido."
}

export default function ChatPage() {
  const { profile } = useAuth()
  const { openPDF } = usePDFViewer()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(true)
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null)
  const [mensagens, setMensagens] = useState<ChatMensagem[]>([])
  const [loadingMensagens, setLoadingMensagens] = useState(false)
  const [messageText, setMessageText] = useState("")
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({})
  const [pdfThumbs, setPdfThumbs] = useState<Record<string, string>>({})
  const pdfThumbsRef = useRef<Record<string, string>>({})
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null)
  const [userMeta, setUserMeta] = useState<Record<string, { lastMessage?: string; lastAt?: string; unreadCount: number }>>({})
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [showNewMessages, setShowNewMessages] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    loadUsuarios()
  }, [profile?.id])

  useEffect(() => {
    if (!selectedUser) return
    loadMensagens(selectedUser.id)
  }, [selectedUser?.id])

  const getViewport = () =>
    (scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null)

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const viewport = getViewport()
    if (!viewport) return
    viewport.scrollTo({ top: viewport.scrollHeight, behavior })
  }

  useEffect(() => {
    const viewport = getViewport()
    if (!viewport) return

    const handleScroll = () => {
      const atBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 24
      setIsAtBottom(atBottom)
      if (atBottom) setShowNewMessages(false)
    }

    viewport.addEventListener("scroll", handleScroll)
    handleScroll()
    return () => viewport.removeEventListener("scroll", handleScroll)
  }, [selectedUser?.id])

  useEffect(() => {
    resolveAttachmentUrls()
  }, [mensagens])

  useEffect(() => {
    pdfThumbsRef.current = pdfThumbs
  }, [pdfThumbs])

  useEffect(() => {
    let alive = true

    const renderPdfThumbs = async () => {
      const targets = mensagens.filter((msg) => {
        if (!msg.arquivo_url) return false
        if (isDeletedMessage(msg)) return false
        if (!isPdfAttachment(msg)) return false
        return !pdfThumbsRef.current[msg.id]
      })

      if (targets.length === 0) return

      const pdfjs = await import(
        /* webpackIgnore: true */
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.530/build/pdf.min.mjs"
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { getDocument, GlobalWorkerOptions } = pdfjs as any
      GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs"

      const supabase = createBrowserClient()
      if (!supabase) return

      const next: Record<string, string> = {}

      for (const msg of targets) {
        try {
          const buffer = await downloadFileAsArrayBuffer(
            msg.arquivo_url!,
            supabase,
            msg.arquivo_nome || "arquivo"
          )
          if (!buffer) continue

          const pdfBytes = new Uint8Array(buffer)
          const loadingTask = getDocument({ data: pdfBytes, disableWorker: true })
          const pdf = await loadingTask.promise
          const page = await pdf.getPage(1)
          const viewport = page.getViewport({ scale: 0.5 })
          const canvas = document.createElement("canvas")
          const context = canvas.getContext("2d")
          if (!context) continue
          canvas.height = viewport.height
          canvas.width = viewport.width
          await page.render({ canvasContext: context, viewport }).promise
          next[msg.id] = canvas.toDataURL("image/png")
          page.cleanup()
          pdf.destroy()
        } catch (err) {
          console.warn("[Chat] Falha ao gerar thumbnail PDF:", err)
        }
      }

      if (!alive || Object.keys(next).length === 0) return
      setPdfThumbs((prev) => {
        const merged = { ...prev, ...next }
        pdfThumbsRef.current = merged
        return merged
      })
    }

    void renderPdfThumbs()

    return () => {
      alive = false
    }
  }, [mensagens])

  useEffect(() => {
    if (!mensagens.length) return
    if (isAtBottom) {
      scrollToBottom("smooth")
    } else {
      setShowNewMessages(true)
    }
  }, [mensagens.length])

  useEffect(() => {
    if (!selectedUser?.id) return
    setTimeout(() => scrollToBottom("auto"), 0)
  }, [selectedUser?.id])

  const filteredUsuarios = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return usuarios
    return usuarios.filter((u) => u.nome?.toLowerCase().includes(term))
  }, [usuarios, searchTerm])

  async function loadUsuarios() {
    if (!profile?.id) return
    const supabase = createBrowserClient()
    if (!supabase) return

    try {
      setLoadingUsuarios(true)
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome, email, foto_url, role")
        .order("nome", { ascending: true })

      if (error) {
        console.error("Erro ao carregar usuários:", error)
        return
      }

      const list = (data ?? []).filter((u: Usuario) => u.id !== profile.id)
      setUsuarios(list)
      await loadUserMeta(list)
    } finally {
      setLoadingUsuarios(false)
    }
  }

  async function loadMensagens(userId: string) {
    if (!profile?.id) return
    const supabase = createBrowserClient()
    if (!supabase) return

    try {
      setLoadingMensagens(true)
      const { data, error } = await supabase
        .from("chat_mensagens")
        .select("id, remetente_id, destinatario_id, texto, lida, arquivo_url, arquivo_nome, arquivo_tipo, arquivo_tamanho, created_at")
        .or(
          `and(remetente_id.eq.${profile.id},destinatario_id.eq.${userId}),and(remetente_id.eq.${userId},destinatario_id.eq.${profile.id})`
        )
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Erro ao carregar mensagens:", error)
        return
      }

      const list = (data ?? []) as ChatMensagem[]
      setMensagens(list)

      await supabase
        .from("chat_mensagens")
        .update({ lida: true })
        .eq("destinatario_id", profile.id)
        .eq("remetente_id", userId)
        .eq("lida", false)

      setUserMeta((prev) => {
        const last = list[list.length - 1]
        const lastMessage = last ? getMetaMessageText(last) : prev[userId]?.lastMessage
        return {
          ...prev,
          [userId]: {
            lastMessage,
            lastAt: last?.created_at || prev[userId]?.lastAt,
            unreadCount: 0,
          },
        }
      })
    } finally {
      setLoadingMensagens(false)
    }
  }

  async function handleSendMessage() {
    if (!selectedUser || !profile?.id) return
    const text = messageText.trim()
    if (!text && !attachedFile) return

    const supabase = createBrowserClient()
    if (!supabase) return

    const { data: authData } = await supabase.auth.getUser()
    const senderId = authData.user?.id || profile.id
    if (!senderId) return

    let arquivo_url: string | null = null
    let arquivo_nome: string | null = null
    let arquivo_tipo: string | null = null
    let arquivo_tamanho: number | null = null

    if (attachedFile) {
      try {
        setUploadingFile(true)
        const { storageRef } = await uploadFile({
          file: attachedFile,
          bucket: CHAT_BUCKET,
          pathPrefix: `chat/${senderId}`,
        })
        arquivo_url = storageRef
        arquivo_nome = attachedFile.name
        arquivo_tipo = attachedFile.type
        arquivo_tamanho = attachedFile.size
      } catch (error: unknown) {
        console.error("Erro ao enviar anexo:", error)
        toast.error(getErrorMessage(error) || "Erro ao enviar anexo")
        setUploadingFile(false)
        return
      } finally {
        setUploadingFile(false)
      }
    }

    const { data, error } = await supabase
      .from("chat_mensagens")
      .insert({
        remetente_id: senderId,
        destinatario_id: selectedUser.id,
        texto: text || DEFAULT_SENT_ATTACHMENT_TEXT,
        arquivo_url,
        arquivo_nome,
        arquivo_tipo,
        arquivo_tamanho,
      })
      .select("id, remetente_id, destinatario_id, texto, lida, arquivo_url, arquivo_nome, arquivo_tipo, arquivo_tamanho, created_at")
      .single()

    if (error) {
      const message = error?.message || "Erro ao enviar mensagem"
      console.error("Erro ao enviar mensagem:", message, error)
      toast.error(message)
      return
    }

    if (data) {
      setMensagens((prev) => [...prev, data as ChatMensagem])
    }
    if (data && selectedUser?.id && selectedUser.id !== senderId) {
      const senderName = profile?.nome || "Usuário"
      const bodyText = data.arquivo_nome
        ? `📎 ${data.arquivo_nome}`
        : data.texto || "Nova mensagem"
      const { error: notifyError } = await supabase.from("notifications").insert({
        user_id: selectedUser.id,
        title: `Nova mensagem - ${senderName}`,
        body: bodyText,
        kind: "info",
        link_url: "/chat",
        entity_type: "chat",
        entity_id: senderId,
        event_type: "mensagem",
      })
      if (notifyError) {
        console.warn("Erro ao criar notificação de mensagem:", notifyError)
      }
    }
    setMessageText("")
    setAttachedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (selectedUser?.id) {
      setUserMeta((prev) => ({
        ...prev,
        [selectedUser.id]: {
          lastMessage: data ? getMetaMessageText(data as ChatMensagem) : prev[selectedUser.id]?.lastMessage,
          lastAt: data?.created_at || new Date().toISOString(),
          unreadCount: prev[selectedUser.id]?.unreadCount ?? 0,
        },
      }))
    }
  }

  async function handleDeleteMessage(msg: ChatMensagem) {
    if (!profile?.id) return
    if (!selectedUser?.id) return

    // Only allow deleting your own sent messages.
    if (msg.remetente_id !== profile.id) return
    if (isDeletedMessage(msg)) return

    const ok = window.confirm(
      "Deseja apagar esta mensagem? Ela será substituída por “Mensagem apagada”."
    )
    if (!ok) return

    const supabase = createBrowserClient()
    if (!supabase) return

    try {
      setDeletingMessageId(msg.id)

      const { data: persistedRow, error } = await supabase
        .from("chat_mensagens")
        .update({
          texto: DELETED_MARKER,
          arquivo_url: null,
          arquivo_nome: null,
          arquivo_tipo: null,
          arquivo_tamanho: null,
        })
        .eq("id", msg.id)
        .eq("remetente_id", profile.id)
        .select("id")
        .maybeSingle()

      if (error) {
        throw error
      }
      if (!persistedRow) {
        throw new Error(
          "A exclusão não foi persistida no banco (provável bloqueio de RLS). Execute o script 192-chat-permitir-apagar-mensagem.sql."
        )
      }

      const updated = mensagens.map((m) =>
        m.id === msg.id
          ? {
              ...m,
              texto: DELETED_MARKER,
              arquivo_url: null,
              arquivo_nome: null,
              arquivo_tipo: null,
              arquivo_tamanho: null,
            }
          : m
      )

      setMensagens(updated)

      const last = updated[updated.length - 1]
      setUserMeta((prev) => ({
        ...prev,
        [selectedUser.id]: {
          ...(prev[selectedUser.id] || { unreadCount: 0 }),
          lastMessage: last ? getMetaMessageText(last) : prev[selectedUser.id]?.lastMessage,
          lastAt: last?.created_at || prev[selectedUser.id]?.lastAt,
          unreadCount: prev[selectedUser.id]?.unreadCount ?? 0,
        },
      }))

      toast.success("Mensagem apagada")
    } catch (error: unknown) {
      console.error("Erro ao apagar mensagem:", error)
      toast.error(getErrorMessage(error) || "Não foi possível apagar a mensagem")
    } finally {
      setDeletingMessageId(null)
    }
  }

  async function handleDownloadAttachment(msg: ChatMensagem) {
    if (!msg.arquivo_url) return

    const supabase = createBrowserClient()
    if (!supabase) return

    const name = msg.arquivo_nome || getFileNameFromUrl(msg.arquivo_url)

    try {
      const buffer = await downloadFileAsArrayBuffer(msg.arquivo_url, supabase, name)
      if (!buffer) throw new Error("Falha ao baixar arquivo")

      const blob = new Blob([buffer], {
        type: msg.arquivo_tipo || "application/octet-stream",
      })

      await saveFileWithPicker(blob, name)
    } catch (error: unknown) {
      console.error("Erro ao baixar anexo:", error)
      toast.error(getErrorMessage(error) || "Não foi possível baixar o anexo")
    }
  }

  async function loadUserMeta(list: Usuario[]) {
    if (!profile?.id || !list.length) return
    const supabase = createBrowserClient()
    if (!supabase) return

    const { data, error } = await supabase
      .from("chat_mensagens")
      .select("id, remetente_id, destinatario_id, texto, lida, arquivo_nome, created_at")
      .or(`remetente_id.eq.${profile.id},destinatario_id.eq.${profile.id}`)
      .order("created_at", { ascending: false })
      .limit(500)

    if (error) {
      console.error("Erro ao carregar mensagens recentes:", error)
      return
    }

    const meta: Record<string, { lastMessage?: string; lastAt?: string; unreadCount: number }> = {}
      ; (data ?? []).forEach((msg) => {
        const otherId = msg.remetente_id === profile.id ? msg.destinatario_id : msg.remetente_id
        if (!meta[otherId]) {
          meta[otherId] = {
            lastMessage: getMetaMessageText(msg),
            lastAt: msg.created_at,
            unreadCount: 0,
          }
        }
        if (msg.destinatario_id === profile.id && msg.lida === false) {
          meta[otherId] = {
            ...meta[otherId],
            unreadCount: (meta[otherId]?.unreadCount ?? 0) + 1,
          }
        }
      })

    list.forEach((user) => {
      if (!meta[user.id]) meta[user.id] = { unreadCount: 0 }
    })

    setUserMeta(meta)
  }

  async function resolveAttachmentUrls() {
    const entries = await Promise.all(
      mensagens
        .filter((msg) => msg.arquivo_url && !attachmentUrls[msg.id])
        .map(async (msg) => {
          const url = await getFileDownloadUrl(msg.arquivo_url ?? null)
          return url ? [msg.id, url] : null
        })
    )
    const updates = entries.filter(Boolean) as [string, string][]
    if (updates.length === 0) return
    setAttachmentUrls((prev) => {
      const next = { ...prev }
      updates.forEach(([id, url]) => {
        next[id] = url
      })
      return next
    })
  }

  const avatarGradients = [
    "from-amber-400 to-orange-500",
    "from-emerald-400 to-teal-500",
    "from-sky-400 to-indigo-500",
    "from-fuchsia-400 to-pink-500",
    "from-lime-400 to-green-500",
    "from-rose-400 to-red-500",
  ]

  const getAvatarGradient = (seed?: string | null) => {
    if (!seed) return avatarGradients[0]
    let hash = 0
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash << 5) - hash + seed.charCodeAt(i)
      hash |= 0
    }
    const index = Math.abs(hash) % avatarGradients.length
    return avatarGradients[index]
  }

  const formatRelative = (date?: string | null) => {
    if (!date) return "offline"
    const diffMs = Date.now() - new Date(date).getTime()
    const minutes = Math.floor(diffMs / 60000)
    if (minutes <= 2) return "online"
    if (minutes < 60) return `há ${minutes} min`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `há ${hours}h`
    const days = Math.floor(hours / 24)
    return `há ${days}d`
  }

  const isRecent = (date?: string | null) => {
    if (!date) return false
    return Date.now() - new Date(date).getTime() < 2 * 60 * 1000
  }

  const formatDayLabel = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    if (day.getTime() === today.getTime()) return "Hoje"
    if (day.getTime() === yesterday.getTime()) return "Ontem"
    return d.toLocaleDateString("pt-BR")
  }

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return ""
    if (bytes < 1024) return `${bytes} B`
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
  }

  return (
  <div className="relative w-full">
      <div
        className={cn(
          "h-[calc(100dvh-7rem)] w-full overflow-hidden rounded-2xl border border-border bg-background",
          "grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]"
        )}
      >
        {/* LEFT — Sidebar (Messenger-like) */}
        <section
          className={cn(
            "h-full flex flex-col min-h-0",
            "border-b lg:border-b-0 lg:border-r border-border",
            // mobile behavior: hide list when a chat is selected
            selectedUser ? "hidden lg:flex" : "flex"
          )}
        >
          {/* Sidebar header */}
          <div className="sticky top-0 z-10 bg-background">
            <div className="px-4 pt-4 pb-3 border-b border-border">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold tracking-tight">Chats</h2>
                  <p className="text-xs text-muted-foreground">
                    {filteredUsuarios.length} contatos
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full hover:bg-muted"
                  onClick={() => {
                    setSelectedUser(null)
                    searchInputRef.current?.focus()
                  }}
                  title="Nova conversa"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Pesquisar no Messenger…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(
                    "h-10 pl-9 pr-9 rounded-full",
                    "bg-muted/60 border-border focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  )}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                    aria-label="Limpar busca"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar list */}
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="py-2">
                {loadingUsuarios && (
                  <div className="px-4 py-3 text-xs text-muted-foreground">Carregando…</div>
                )}

                {!loadingUsuarios && filteredUsuarios.length === 0 && (
                  <div className="px-4 py-3 text-xs text-muted-foreground">
                    Nenhum usuário encontrado.
                  </div>
                )}

                {filteredUsuarios.map((user) => {
                  const isActive = selectedUser?.id === user.id
                  const meta = userMeta[user.id]
                  const lastMessage = meta?.lastMessage || "Nenhuma mensagem"
                  const unread = meta?.unreadCount || 0
                  const online = isRecent(meta?.lastAt ?? null)

                  return (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={cn(
                        "w-full text-left",
                        "px-3 py-2",
                        "transition",
                        isActive ? "bg-muted/70" : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <Avatar className="w-11 h-11">
                            <AvatarImage src={user.foto_url || "/placeholder.svg"} />
                            <AvatarFallback
                              className={cn(
                                "text-white font-semibold bg-gradient-to-br",
                                getAvatarGradient(user.id)
                              )}
                            >
                              {user.nome?.slice(0, 2)?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background",
                              online ? "bg-emerald-500" : "bg-muted-foreground/60"
                            )}
                            title={online ? "online" : "offline"}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn("truncate text-sm", unread > 0 ? "font-semibold" : "font-medium")}>
                              {user.nome}
                            </span>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] text-muted-foreground">
                                {meta?.lastAt
                                  ? new Date(meta.lastAt).toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                  : ""}
                              </span>

                              {unread > 0 && (
                                <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold bg-blue-600 text-white flex items-center justify-center">
                                  {unread}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-0.5 flex items-center gap-2">
                            <span className="text-[12px] text-muted-foreground truncate">
                              {lastMessage}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        </section>

        {/* RIGHT — Chat panel */}
        <section
          className={cn(
            "h-full min-h-0 flex flex-col",
            // mobile behavior: show chat when selected
            selectedUser ? "flex" : "hidden lg:flex"
          )}
        >
          {/* Chat header */}
          <div className="sticky top-0 z-10 bg-background border-b border-border">
            {selectedUser ? (
              <div className="px-3 lg:px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Back (mobile) */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full hover:bg-muted lg:hidden"
                    onClick={() => setSelectedUser(null)}
                    title="Voltar"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>

                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedUser.foto_url || "/placeholder.svg"} />
                    <AvatarFallback
                      className={cn(
                        "text-white font-semibold bg-gradient-to-br",
                        getAvatarGradient(selectedUser.id)
                      )}
                    >
                      {selectedUser.nome?.slice(0, 2)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold truncate">{selectedUser.nome}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedUser.email || "Usuário interno"} •{" "}
                      {formatRelative(userMeta[selectedUser.id]?.lastAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full hover:bg-muted"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    title="Anexar"
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full hover:bg-muted"
                    title="Mais"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-4">
                <h3 className="text-sm font-semibold">Selecione uma conversa</h3>
                <p className="text-xs text-muted-foreground">
                  Escolha um contato à esquerda para começar.
                </p>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="relative flex-1 min-h-0">
            {/* Floating "New messages" */}
            {showNewMessages && selectedUser && (
              <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center">
                <Button
                  size="sm"
                  className="pointer-events-auto rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
                  onClick={() => scrollToBottom("smooth")}
                >
                  <ArrowDown className="h-4 w-4 mr-2" />
                  Novas mensagens
                </Button>
              </div>
            )}

            <ScrollArea ref={scrollAreaRef} className="h-full">
              <div
                className={cn(
                  "min-h-full px-3 lg:px-5 py-4 space-y-2",
                  "bg-muted/30 dark:bg-muted/10"
                )}
              >
                {loadingMensagens && (
                  <div className="text-xs text-muted-foreground">Carregando mensagens…</div>
                )}

                {!loadingMensagens && !selectedUser && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-16 text-muted-foreground">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <Search className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-foreground">Selecione um usuário</p>
                    <p className="text-xs">Escolha um contato para iniciar a conversa.</p>
                  </div>
                )}

                {!loadingMensagens && selectedUser && mensagens.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-16 text-muted-foreground">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <Send className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-foreground">Nenhuma mensagem ainda</p>
                    <p className="text-xs">Envie a primeira mensagem para começar.</p>
                  </div>
                )}

                {mensagens.map((msg, index) => {
                  const isMine = msg.remetente_id === profile?.id
                  const prev = mensagens[index - 1]
                  const next = mensagens[index + 1]

                  const prevSame =
                    prev &&
                    prev.remetente_id === msg.remetente_id &&
                    Math.abs(new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) < 5 * 60 * 1000

                  const nextSame =
                    next &&
                    next.remetente_id === msg.remetente_id &&
                    Math.abs(new Date(next.created_at).getTime() - new Date(msg.created_at).getTime()) < 5 * 60 * 1000

                  const showDaySeparator =
                    !prev ||
                    new Date(prev.created_at).toDateString() !== new Date(msg.created_at).toDateString()

                  const showTimestamp = !nextSame

                  return (
                    <div key={msg.id}>
                      {showDaySeparator && (
                        <div className="flex items-center justify-center my-4">
                          <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-background/80 border border-border text-muted-foreground">
                            {formatDayLabel(msg.created_at)}
                          </span>
                        </div>
                      )}

                      <div
                        className={cn(
                          "group flex items-end gap-2",
                          isMine ? "justify-end" : "justify-start",
                          prevSame ? "mt-1" : "mt-2.5"
                        )}
                      >
                        {/* Avatar for other user (Messenger style shows it sometimes) */}
                        {!isMine && (
                          <div className={cn("w-8 shrink-0", nextSame ? "opacity-0" : "opacity-100")}>
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={selectedUser?.foto_url || "/placeholder.svg"} />
                              <AvatarFallback
                                className={cn(
                                  "text-white text-[10px] font-semibold bg-gradient-to-br",
                                  getAvatarGradient(selectedUser?.id || "")
                                )}
                              >
                                {selectedUser?.nome?.slice(0, 2)?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        )}

                        <div className={cn("max-w-[78%] lg:max-w-[70%]")}>
                          {(() => {
                            const deleted = isDeletedMessage(msg)
                            const hasAttachment = Boolean(msg.arquivo_url)
                            const attachmentName =
                              msg.arquivo_nome || (msg.arquivo_url ? getFileNameFromUrl(msg.arquivo_url) : "Anexo")
                            const attachmentExt = getFileExt(attachmentName) || "arq"
                            const resolvedUrl = msg.arquivo_url ? attachmentUrls[msg.id] : null
                            const isPdf = hasAttachment ? isPdfAttachment(msg) : false
                            const isImage = hasAttachment ? isImageAttachment(msg) : false
                            const pdfThumb = isPdf ? pdfThumbs[msg.id] : null

                            const text = (msg.texto || "").trim()
                            const showText =
                              !deleted && Boolean(text) && text !== DEFAULT_SENT_ATTACHMENT_TEXT
                            const showAttachmentTitle = !deleted && hasAttachment && !showText

                            const bubbleClasses = cn(
                              "px-3.5 py-2.5 text-sm leading-relaxed",
                              "rounded-2xl",
                              isMine
                                ? "bg-blue-600 text-white"
                                : "bg-background border border-border text-foreground",
                              // grouping corners (like Messenger)
                              isMine ? (prevSame ? "rounded-tr-md" : "") : prevSame ? "rounded-tl-md" : "",
                              isMine ? (nextSame ? "rounded-br-md" : "") : nextSame ? "rounded-bl-md" : ""
                            )

                            return (
                              <div className={cn("flex items-start gap-1", isMine ? "flex-row-reverse" : "flex-row")}>
                                {isMine && !deleted && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                          "h-8 w-8 rounded-full",
                                          "opacity-0 group-hover:opacity-100 transition-opacity",
                                          "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                                        )}
                                        onClick={(e) => e.stopPropagation()}
                                        title="Opções"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align={isMine ? "end" : "start"}>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          void handleDeleteMessage(msg)
                                        }}
                                        disabled={deletingMessageId === msg.id}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        {deletingMessageId === msg.id ? "Excluindo..." : "Excluir mensagem"}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}

                                <div className={bubbleClasses}>
                                  {deleted ? (
                                    <p className={cn("italic", isMine ? "text-white/80" : "text-muted-foreground")}>
                                      Mensagem apagada
                                    </p>
                                  ) : (
                                    <>
                                      {showAttachmentTitle && (
                                        <p className={cn("text-[13px] font-semibold", isMine ? "text-white" : "text-foreground")}>
                                          Arquivo enviado
                                        </p>
                                      )}
                                      {showText && <p className="whitespace-pre-wrap">{msg.texto}</p>}

                                      {hasAttachment && (
                                        <div className="mt-2">
                                          <div
                                            className={cn(
                                              "overflow-hidden rounded-xl border",
                                              isMine ? "border-white/15 bg-white/5" : "border-border bg-muted/20"
                                            )}
                                          >
                                            <button
                                              type="button"
                                              className={cn(
                                                "block w-full text-left",
                                                "h-44 sm:h-48",
                                                "bg-muted/40"
                                              )}
                                              onClick={() => {
                                                if (!msg.arquivo_url) return
                                                if (isPdf) {
                                                  openPDF(msg.arquivo_url, attachmentName)
                                                  return
                                                }
                                                if (isImage && resolvedUrl) {
                                                  window.open(resolvedUrl, "_blank", "noopener,noreferrer")
                                                  return
                                                }
                                              }}
                                              disabled={!isPdf && !(isImage && resolvedUrl)}
                                            >
                                              {isImage && resolvedUrl ? (
                                                <img
                                                  src={resolvedUrl}
                                                  alt={attachmentName}
                                                  className="h-full w-full object-cover"
                                                />
                                              ) : isPdf && pdfThumb ? (
                                                <img
                                                  src={pdfThumb}
                                                  alt={`PDF ${attachmentName}`}
                                                  className="h-full w-full object-cover"
                                                />
                                              ) : (
                                                <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 text-center">
                                                  <FileText className={cn("h-7 w-7", isMine ? "text-white/80" : "text-muted-foreground")} />
                                                  <div className={cn("text-xs font-medium truncate max-w-full", isMine ? "text-white" : "text-foreground")}>
                                                    {attachmentName}
                                                  </div>
                                                  <div
                                                    className={cn(
                                                      "rounded-full border px-2 py-0.5 text-[10px] uppercase",
                                                      isMine ? "border-white/20 text-white/80" : "border-border text-muted-foreground"
                                                    )}
                                                  >
                                                    {attachmentExt}
                                                  </div>
                                                </div>
                                              )}
                                            </button>

                                            <div
                                              className={cn(
                                                "flex items-center justify-between gap-3 px-3 py-2",
                                                isMine ? "bg-white/10" : "bg-muted/30"
                                              )}
                                            >
                                              <div
                                                className={cn(
                                                  "flex items-center gap-2 min-w-0",
                                                  isMine ? "text-white/80" : "text-muted-foreground"
                                                )}
                                              >
                                                <Paperclip className={cn("h-4 w-4", isMine ? "text-white/85" : "text-muted-foreground")} />
                                                <span className={cn("truncate text-[12px] font-semibold", isMine ? "text-white" : "text-foreground")}>
                                                  {attachmentName}
                                                </span>
                                                {msg.arquivo_tamanho && (
                                                  <span className={cn("text-[10px]", isMine ? "text-white/70" : "text-muted-foreground")}>
                                                    {formatFileSize(msg.arquivo_tamanho)}
                                                  </span>
                                                )}
                                              </div>

                                              <div className="flex items-center gap-3">
                                                {isPdf && msg.arquivo_url && (
                                                  <button
                                                    type="button"
                                                    className={cn(
                                                      "text-[11px] font-semibold hover:underline inline-flex items-center gap-1",
                                                      isMine ? "text-white" : "text-blue-600 dark:text-blue-400"
                                                    )}
                                                    onClick={() => openPDF(msg.arquivo_url!, attachmentName)}
                                                  >
                                                    <Eye className="h-4 w-4" />
                                                    Visualizar
                                                  </button>
                                                )}

                                                <button
                                                  type="button"
                                                  className={cn(
                                                    "text-[11px] font-semibold hover:underline inline-flex items-center gap-1",
                                                    isMine ? "text-white" : "text-blue-600 dark:text-blue-400"
                                                  )}
                                                  onClick={() => void handleDownloadAttachment(msg)}
                                                >
                                                  <Download className="h-4 w-4" />
                                                  Baixar
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })()}

                          {showTimestamp && (
                            <div className={cn("mt-1 text-[11px] text-muted-foreground", isMine ? "text-right" : "text-left")}>
                              {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              {isMine && <span className="ml-2">{msg.lida ? "✓✓" : "✓"}</span>}
                            </div>
                          )}
                        </div>

                        {/* spacer for mine to keep alignment */}
                        {isMine && <div className="w-8 shrink-0" />}
                      </div>
                    </div>
                  )
                })}

                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Composer (Messenger-like) */}
          <div className="border-t border-border bg-background px-3 lg:px-4 py-3">
            {attachedFile && (
              <div className="mb-2 flex items-center justify-between rounded-full border border-border px-3 py-1.5 text-xs bg-muted/40">
                <span className="truncate text-foreground/90">{attachedFile.name}</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition"
                  disabled={uploadingFile}
                  onClick={() => {
                    setAttachedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ""
                  }}
                  aria-label="Remover anexo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {uploadingFile && (
              <div className="mb-2 h-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-1/2 animate-pulse bg-blue-600" />
              </div>
            )}

            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setAttachedFile(file)
                }}
              />

              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedUser || uploadingFile}
                title="Anexar"
                className="rounded-full h-10 w-10 hover:bg-muted"
              >
                <Paperclip className="w-5 h-5" />
              </Button>

              <div className="flex-1">
                <Textarea
                  placeholder="Digite uma mensagem…"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  onInput={(e) => {
                    const el = e.currentTarget
                    el.style.height = "auto"
                    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
                  }}
                  disabled={!selectedUser}
                  className={cn(
                    "min-h-[44px] max-h-36",
                    "rounded-3xl px-4 py-2 text-sm",
                    "bg-muted/60 border-border",
                    "focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  )}
                />
              </div>

              <Button
                onClick={handleSendMessage}
                disabled={!selectedUser || (!messageText.trim() && !attachedFile) || uploadingFile}
                className="rounded-full h-10 w-10 p-0 bg-blue-600 hover:bg-blue-700"
                title="Enviar"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
