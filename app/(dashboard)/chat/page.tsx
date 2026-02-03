"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { getFileDownloadUrl, uploadFile } from "@/lib/utils/file-upload"
import { useAuth } from "@/lib/auth/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ArrowDown, MoreVertical, Paperclip, Plus, Search, Send, Smile, X } from "lucide-react"

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

export default function ChatPage() {
  const { profile } = useAuth()
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
        const lastMessage = last
          ? last.arquivo_nome
            ? `📎 ${last.arquivo_nome}`
            : last.texto
          : prev[userId]?.lastMessage
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
      } catch (error: any) {
        console.error("Erro ao enviar anexo:", error)
        toast.error(error?.message || "Erro ao enviar anexo")
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
        texto: text || "Arquivo enviado",
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
          lastMessage: data?.arquivo_nome ? `📎 ${data.arquivo_nome}` : data?.texto,
          lastAt: data?.created_at || new Date().toISOString(),
          unreadCount: prev[selectedUser.id]?.unreadCount ?? 0,
        },
      }))
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
    ;(data ?? []).forEach((msg) => {
      const otherId = msg.remetente_id === profile.id ? msg.destinatario_id : msg.remetente_id
      if (!meta[otherId]) {
        meta[otherId] = {
          lastMessage: msg.arquivo_nome ? `📎 ${msg.arquivo_nome}` : msg.texto,
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
    <div className="h-[calc(100dvh-7rem)] grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-4">
      {/* LEFT — Conversas */}
      <Card className="h-full flex flex-col overflow-hidden border-border/60 bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)]">
        <CardHeader className="pb-3 border-b border-border/60 bg-card/80 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold tracking-tight">Conversas</CardTitle>
              <p className="text-xs text-muted-foreground">
                {filteredUsuarios.length} contatos • clique para abrir
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-full gap-2 border-border/70 bg-background/60 hover:bg-background"
              onClick={() => {
                setSelectedUser(null)
                searchInputRef.current?.focus()
              }}
            >
              <Plus className="h-4 w-4" />
              Nova
            </Button>
          </div>

          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Buscar contato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 pl-9 pr-9 rounded-full bg-background/60 border-border/70 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
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
        </CardHeader>

        <CardContent className="flex-1 min-h-0 p-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {loadingUsuarios && (
                <div className="text-xs text-muted-foreground px-2 py-2">Carregando...</div>
              )}

              {!loadingUsuarios && filteredUsuarios.length === 0 && (
                <div className="text-xs text-muted-foreground px-2 py-2">
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
                      "group relative w-full text-left flex items-center gap-3 rounded-2xl px-3 py-3 transition",
                      "border border-transparent",
                      isActive
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : "hover:bg-muted/50 hover:border-border/60"
                    )}
                  >
                    {/* left accent */}
                    {isActive && (
                      <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-emerald-500" />
                    )}

                    <div className="relative">
                      <Avatar className="w-10 h-10 ring-1 ring-border/60">
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
                          "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                          online ? "bg-emerald-500" : "bg-muted-foreground/60"
                        )}
                        title={online ? "online" : "offline"}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold truncate">
                          {user.nome}
                        </span>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            {meta?.lastAt
                              ? new Date(meta.lastAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                              : ""}
                          </span>

                          {unread > 0 && (
                            <span className="min-w-[22px] h-5 px-1.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-white flex items-center justify-center">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-[11px] text-muted-foreground truncate block">
                        {user.email || "—"}
                      </span>

                      <span
                        className={cn(
                          "text-[11px] truncate block",
                          isActive ? "text-foreground/80" : "text-muted-foreground"
                        )}
                      >
                        {lastMessage}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* RIGHT — Chat */}
      <Card className="h-full flex flex-col overflow-hidden border-border/60 bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)]">
        <CardHeader className="pb-3 border-b border-border/60 bg-card/80 backdrop-blur sticky top-0 z-10">
          {selectedUser ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="w-10 h-10 ring-1 ring-border/60">
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
                  <CardTitle className="text-base font-semibold truncate">
                    {selectedUser.nome}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedUser.email || "Usuário interno"} • {formatRelative(userMeta[selectedUser.id]?.lastAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" disabled>
                  <Search className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  title="Anexar"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>

                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <CardTitle className="text-base">Selecione um usuário</CardTitle>
          )}
        </CardHeader>

        <CardContent className="relative flex-1 min-h-0 p-0">
          {/* Floating "New messages" — agora no lugar certo */}
          {showNewMessages && selectedUser && (
            <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center">
              <Button
                size="sm"
                className="pointer-events-auto rounded-full shadow-lg bg-emerald-600 hover:bg-emerald-700"
                onClick={() => scrollToBottom("smooth")}
              >
                <ArrowDown className="h-4 w-4 mr-2" />
                Novas mensagens
              </Button>
            </div>
          )}

          <ScrollArea ref={scrollAreaRef} className="h-full">
            <div className="relative min-h-full px-5 py-6 space-y-3 bg-[radial-gradient(900px_circle_at_20%_-10%,rgba(16,185,129,0.14),transparent_45%),radial-gradient(700px_circle_at_90%_10%,rgba(99,102,241,0.10),transparent_42%)]">
              {loadingMensagens && (
                <div className="text-xs text-muted-foreground">Carregando mensagens...</div>
              )}

              {!loadingMensagens && !selectedUser && (
                <div className="flex flex-col items-center justify-center text-center gap-2 py-16 text-muted-foreground">
                  <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center">
                    <Search className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Selecione um usuário</p>
                  <p className="text-xs">Escolha um contato para iniciar a conversa.</p>
                </div>
              )}

              {!loadingMensagens && selectedUser && mensagens.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center gap-2 py-16 text-muted-foreground">
                  <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center">
                    <Send className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Nenhuma mensagem ainda</p>
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
                      <div className="flex items-center justify-center my-5">
                        <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-card/70 border border-border/60 text-muted-foreground backdrop-blur">
                          {formatDayLabel(msg.created_at)}
                        </span>
                      </div>
                    )}

                    <div className={cn("flex", isMine ? "justify-end" : "justify-start", prevSame ? "mt-1" : "mt-3")}>
                      <div
                        className={cn(
                          "max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                          "border",
                          isMine
                            ? "bg-emerald-500/14 border-emerald-500/20"
                            : "bg-card/70 border-border/60",
                          isMine ? (prevSame ? "rounded-tr-md" : "") : (prevSame ? "rounded-tl-md" : ""),
                          isMine ? (nextSame ? "rounded-br-md" : "rounded-br-sm") : (nextSame ? "rounded-bl-md" : "rounded-bl-sm")
                        )}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                          {msg.texto}
                        </p>

                        {msg.arquivo_url && (
                          <div
                            className={cn(
                              "mt-2 flex items-center justify-between gap-3 rounded-xl px-3 py-2 border text-[11px] bg-background/40",
                              isMine ? "border-emerald-500/20" : "border-border/60"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0 text-muted-foreground">
                              <Paperclip className="h-3 w-3" />
                              <span className="truncate text-foreground/90">
                                {msg.arquivo_nome || "Anexo"}
                              </span>
                              {msg.arquivo_tamanho && (
                                <span className="text-[10px] text-muted-foreground">
                                  {formatFileSize(msg.arquivo_tamanho)}
                                </span>
                              )}
                            </div>

                            <a
                              href={attachmentUrls[msg.id] ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                              onClick={(e) => {
                                if (!attachmentUrls[msg.id]) e.preventDefault()
                              }}
                            >
                              Baixar
                            </a>
                          </div>
                        )}

                        {showTimestamp && (
                          <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {isMine && <span>{msg.lida ? "✓✓" : "✓"}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        </CardContent>

        {/* Composer */}
        <div className="border-t border-border/60 p-3 bg-card/80 backdrop-blur">
          {attachedFile && (
            <div className="mb-2 flex items-center justify-between rounded-full border border-border/60 px-3 py-1.5 text-xs bg-background/50">
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
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {uploadingFile && (
            <div className="mb-2 h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-1/2 animate-pulse bg-emerald-500" />
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
              variant="outline"
              size="icon"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedUser || uploadingFile}
              title="Anexar arquivo"
              className="rounded-full h-10 w-10 border-border/70 bg-background/50 hover:bg-background"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              type="button"
              disabled={!selectedUser}
              title="Emoji"
              className="rounded-full h-10 w-10 border-border/70 bg-background/50 hover:bg-background"
            >
              <Smile className="w-4 h-4" />
            </Button>

            <Textarea
              placeholder="Digite sua mensagem..."
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
              className="min-h-[44px] max-h-36 rounded-2xl bg-background/60 border-border/70 px-4 py-2 text-sm focus-visible:ring-2 focus-visible:ring-emerald-500/35"
            />

            <Button
              onClick={handleSendMessage}
              disabled={!selectedUser || (!messageText.trim() && !attachedFile) || uploadingFile}
              className="rounded-full h-10 px-4 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  </div>
  )
}

