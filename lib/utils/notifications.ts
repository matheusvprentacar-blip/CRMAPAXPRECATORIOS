export type NotificationPrecatorioInfo = {
  id: string
  titulo?: string | null
  numero_precatorio?: string | null
  credor_nome?: string | null
  status_kanban?: string | null
  localizacao_kanban?: string | null
  status?: string | null
}

export type NotificationItem = {
  id: string
  usuario_id: string
  precatorio_id: string | null
  tipo: string | null
  mensagem: string | null
  lida: boolean
  created_at: string
  precatorio_nome?: string | null
  precatorio_status?: string | null
  precatorio?: NotificationPrecatorioInfo | null
  precatorio_access?: boolean
}

const STATUS_LABELS: Record<string, string> = {
  entrada: "Entrada",
  triagem_interesse: "Triagem",
  analise_processual_inicial: "Análise Processual Inicial",
  docs_credor: "Documentos do credor",
  pronto_calculo: "Pronto para calculo",
  calculo_andamento: "Calculo em andamento",
  juridico: "Juridico",
  calculo_concluido: "Calculo concluido",
  proposta_negociacao: "Proposta / Negociacao",
  proposta_aceita: "Proposta aceita",
  certidoes: "Certidoes",
  fechado: "Fechado",
  pos_fechamento: "Pos-fechamento",
  pausado_credor: "Pausado (credor)",
  pausado_documentos: "Pausado (documentos)",
  sem_interesse: "Sem interesse",
  reprovado: "Reprovado / nao elegivel",
}

const STATUS_TONES: Record<string, string> = {
  entrada: "border-slate-200 text-slate-600 bg-slate-50/60 dark:border-slate-800 dark:text-slate-300 dark:bg-slate-900/40",
  triagem_interesse: "border-blue-200 text-blue-700 bg-blue-50/60 dark:border-blue-900/50 dark:text-blue-200 dark:bg-blue-950/40",
  analise_processual_inicial: "border-amber-200 text-amber-700 bg-amber-50/60 dark:border-amber-900/50 dark:text-amber-200 dark:bg-amber-950/40",
  docs_credor: "border-indigo-200 text-indigo-700 bg-indigo-50/60 dark:border-indigo-900/50 dark:text-indigo-200 dark:bg-indigo-950/40",
  pronto_calculo: "border-cyan-200 text-cyan-700 bg-cyan-50/60 dark:border-cyan-900/50 dark:text-cyan-200 dark:bg-cyan-950/40",
  calculo_andamento: "border-orange-200 text-orange-700 bg-orange-50/60 dark:border-orange-900/50 dark:text-orange-200 dark:bg-orange-950/40",
  juridico: "border-purple-200 text-purple-700 bg-purple-50/60 dark:border-purple-900/50 dark:text-purple-200 dark:bg-purple-950/40",
  calculo_concluido: "border-emerald-200 text-emerald-700 bg-emerald-50/60 dark:border-emerald-900/50 dark:text-emerald-200 dark:bg-emerald-950/40",
  proposta_negociacao: "border-yellow-200 text-yellow-700 bg-yellow-50/60 dark:border-yellow-900/50 dark:text-yellow-200 dark:bg-yellow-950/40",
  proposta_aceita: "border-green-200 text-green-700 bg-green-50/60 dark:border-green-900/50 dark:text-green-200 dark:bg-green-950/40",
  certidoes: "border-teal-200 text-teal-700 bg-teal-50/60 dark:border-teal-900/50 dark:text-teal-200 dark:bg-teal-950/40",
  fechado: "border-emerald-200 text-emerald-800 bg-emerald-50/70 dark:border-emerald-900/60 dark:text-emerald-100 dark:bg-emerald-950/50",
  pos_fechamento: "border-emerald-200 text-emerald-800 bg-emerald-50/70 dark:border-emerald-900/60 dark:text-emerald-100 dark:bg-emerald-950/50",
  pausado_credor: "border-orange-200 text-orange-700 bg-orange-50/60 dark:border-orange-900/50 dark:text-orange-200 dark:bg-orange-950/40",
  pausado_documentos: "border-orange-200 text-orange-700 bg-orange-50/60 dark:border-orange-900/50 dark:text-orange-200 dark:bg-orange-950/40",
  sem_interesse: "border-slate-200 text-slate-600 bg-slate-50/60 dark:border-slate-800 dark:text-slate-300 dark:bg-slate-900/40",
  reprovado: "border-red-200 text-red-700 bg-red-50/60 dark:border-red-900/50 dark:text-red-200 dark:bg-red-950/40",
}

const STATUS_TAB_MAP: Record<string, string> = {
  juridico: "juridico",
  proposta_aceita: "juridico",
  proposta_negociacao: "propostas",
  calculo_concluido: "calculo",
  calculo_andamento: "calculo",
  pronto_calculo: "calculo",
  certidoes: "certidoes",
  docs_credor: "documentos",
  analise_processual_inicial: "oficio",
}

const STATUS_NOTIFICATION_TITLES: Record<string, (nome: string) => string> = {
  juridico: (nome) => (nome ? `Juridico finalizou analise - ${nome}` : "Juridico finalizou analise"),
  calculo_concluido: (nome) => (nome ? `Calculo concluido - ${nome}` : "Calculo concluido"),
  calculo_andamento: (nome) => (nome ? `Calculo em andamento - ${nome}` : "Calculo em andamento"),
  pronto_calculo: (nome) => (nome ? `Pronto para calculo - ${nome}` : "Pronto para calculo"),
  proposta_negociacao: (nome) => (nome ? `Proposta em negociacao - ${nome}` : "Proposta em negociacao"),
  proposta_aceita: (nome) => (nome ? `Proposta aceita - ${nome}` : "Proposta aceita"),
  certidoes: (nome) => (nome ? `Certidoes em andamento - ${nome}` : "Certidoes em andamento"),
  analise_processual_inicial: (nome) => (nome ? `Análise Processual Inicial - ${nome}` : "Análise Processual Inicial"),
  docs_credor: (nome) => (nome ? `Documentos do credor - ${nome}` : "Documentos do credor"),
  fechado: (nome) => (nome ? `Precatorio fechado - ${nome}` : "Precatorio fechado"),
  pos_fechamento: (nome) => (nome ? `Pos-fechamento - ${nome}` : "Pos-fechamento"),
  sem_interesse: (nome) => (nome ? `Sem interesse - ${nome}` : "Sem interesse"),
  reprovado: (nome) => (nome ? `Precatorio reprovado - ${nome}` : "Precatorio reprovado"),
}

const getTipoKey = (tipo?: string | null) => (tipo || "").toLowerCase()
const isPrecatorioUpdate = (tipo?: string | null) => getTipoKey(tipo).includes("precatorio")

export const getStatusLabel = (status?: string | null) => {
  if (!status) return null
  return STATUS_LABELS[status] || status.replace(/_/g, " ")
}

export const getStatusTone = (status?: string | null) => {
  if (!status) return "border-slate-200 text-slate-600 bg-slate-50/60 dark:border-slate-800 dark:text-slate-300 dark:bg-slate-900/40"
  return STATUS_TONES[status] || "border-slate-200 text-slate-600 bg-slate-50/60 dark:border-slate-800 dark:text-slate-300 dark:bg-slate-900/40"
}

export const getPrecatorioStatus = (prec?: NotificationPrecatorioInfo | null) => {
  return prec?.status_kanban || prec?.localizacao_kanban || prec?.status || null
}

export const getPrecatorioDisplayName = (prec?: NotificationPrecatorioInfo | null) => {
  if (!prec) return ""
  const value = prec.titulo || prec.numero_precatorio || prec.credor_nome
  return value ? String(value) : ""
}

export const getNotificationPrecatorioName = (notification: NotificationItem) => {
  const fromPrec = getPrecatorioDisplayName(notification.precatorio)
  if (fromPrec) return fromPrec
  if (notification.precatorio_nome) return notification.precatorio_nome
  return ""
}

export const getNotificationStatus = (notification: NotificationItem) => {
  return getPrecatorioStatus(notification.precatorio) || notification.precatorio_status || null
}

export const getNotificationTitle = (notification: NotificationItem) => {
  const nome = getNotificationPrecatorioName(notification)
  const tipo = getTipoKey(notification.tipo)
  const status = getNotificationStatus(notification)
  const statusTitle = status ? STATUS_NOTIFICATION_TITLES[status]?.(nome) : null
  const statusLabel = status ? getStatusLabel(status) : null

  if (isPrecatorioUpdate(notification.tipo)) {
    if (statusTitle) return statusTitle
    if (statusLabel && nome) return `Precatorio ${nome} - ${statusLabel}`
    if (statusLabel) return `Status ${statusLabel}`
    if (nome) return `Precatorio (${nome}) atualizado`
    if (notification.mensagem) return notification.mensagem
    return "Precatorio atualizado"
  }

  if (notification.mensagem) {
    const mensagem = notification.mensagem
    const lowerMensagem = mensagem.toLowerCase()
    const lowerNome = nome.toLowerCase()
    if (notification.precatorio_id && nome && !lowerMensagem.includes(lowerNome)) {
      return `${mensagem} - ${nome}`
    }
    return mensagem
  }

  if (tipo.includes("juridico")) return nome ? `Juridico finalizou analise - ${nome}` : "Juridico finalizou analise"
  if (tipo.includes("calculo_concluido")) return nome ? `Calculo concluido - ${nome}` : "Calculo concluido"
  if (tipo.includes("calculo")) return nome ? `Atualizacao de calculo - ${nome}` : "Atualizacao de calculo"
  if (tipo.includes("proposta_aceita")) return nome ? `Proposta aceita - ${nome}` : "Proposta aceita"
  if (tipo.includes("proposta")) return nome ? `Atualizacao de proposta - ${nome}` : "Atualizacao de proposta"
  if (tipo.includes("precatorio")) return nome ? `Precatorio atualizado - ${nome}` : "Precatorio atualizado"
  if (tipo.includes("mensagem")) return nome ? `Nova mensagem - ${nome}` : "Nova mensagem"
  if (tipo.includes("admin_aviso")) return nome ? `Aviso do administrador - ${nome}` : "Aviso do administrador"
  if (tipo.includes("certidao")) return nome ? `Atualizacao de certidoes - ${nome}` : "Atualizacao de certidoes"

  return nome ? `Nova notificacao - ${nome}` : "Nova notificacao"
}

export const getNotificationSubtitle = (notification: NotificationItem) => {
  const nome = getNotificationPrecatorioName(notification)
  const statusLabel = getStatusLabel(getNotificationStatus(notification))
  const hasPrecatorio = Boolean(notification.precatorio || notification.precatorio_id)

  if (statusLabel) return `Status alterado: ${statusLabel}`
  if (hasPrecatorio && nome) return nome
  return ""
}

export const resolveNotificationTab = (notification: NotificationItem) => {
  const tipo = getTipoKey(notification.tipo)
  if (tipo.includes("juridico")) return "juridico"
  if (tipo.includes("calculo")) return "calculo"
  if (tipo.includes("proposta")) return "propostas"
  if (tipo.includes("certidao")) return "certidoes"
  if (tipo.includes("documento") || tipo.includes("doc")) return "documentos"
  if (tipo.includes("oficio")) return "oficio"

  const status = getNotificationStatus(notification)
  return status ? STATUS_TAB_MAP[status] || null : null
}

const resolveModuleRoute = (notification: NotificationItem) => {
  const tipo = getTipoKey(notification.tipo)
  const status = getNotificationStatus(notification)

  if (status) {
    if (status === "juridico" || status === "proposta_aceita") return "/juridico"
    if (status === "proposta_negociacao") return "/propostas"
    if (status === "calculo_concluido" || status === "calculo_andamento" || status === "pronto_calculo") return "/calculo"
    if (status === "certidoes") return "/gestao-certidoes"
    if (status === "analise_processual_inicial") return "/gestao-oficios"
  }

  if (tipo.includes("juridico")) return "/juridico"
  if (tipo.includes("calculo")) return "/calculo"
  if (tipo.includes("proposta")) return "/propostas"
  if (tipo.includes("certidao")) return "/gestao-certidoes"
  if (tipo.includes("oficio")) return "/gestao-oficios"
  if (isPrecatorioUpdate(notification.tipo)) return "/precatorios"
  return "/dashboard"
}

export const getNotificationTarget = (notification: NotificationItem) => {
  const tipo = getTipoKey(notification.tipo)
  if (tipo.includes("mensagem")) return "/chat"

  if (!notification.precatorio_id) {
    return resolveModuleRoute(notification)
  }

  if (!notification.precatorio_access) {
    return resolveModuleRoute(notification)
  }

  const tab = resolveNotificationTab(notification)
  const base = `/precatorios/detalhes?id=${notification.precatorio_id}`
  return tab ? `${base}&tab=${tab}` : base
}
