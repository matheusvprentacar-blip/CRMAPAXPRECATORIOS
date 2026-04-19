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
  pronto_calculo: "Pronto para calculo",
  calculo_andamento: "Calculo em andamento",
  juridico: "Juridico",
  calculo_concluido: "Calculo concluido",
  proposta_negociacao: "Proposta / Negociacao",
  proposta_aceita: "Proposta aceita",
  certidoes: "Certidoes",
  escrituras: "Escrituras",
  fechado: "Fechado",
  pos_fechamento: "Pos-fechamento",
  pausado_credor: "Pausado (credor)",
  pausado_documentos: "Pausado (documentos)",
  sem_interesse: "Sem interesse",
  reprovado: "Reprovado / nao elegivel",
}

const STATUS_TONES: Record<string, string> = {
  entrada: "border-border text-muted-foreground bg-muted dark:border-border dark:text-muted-foreground dark:bg-muted",
  triagem_interesse: "border-primary/40 text-primary bg-primary/15 dark:border-primary/40 dark:text-primary dark:bg-primary/15",
  analise_processual_inicial: "border-primary/40 text-primary bg-primary/15 dark:border-primary/40 dark:text-primary dark:bg-primary/15",
  pronto_calculo: "border-primary/40 text-primary bg-primary/15 dark:border-primary/40 dark:text-primary dark:bg-primary/15",
  calculo_andamento: "border-primary/40 text-primary bg-primary/15 dark:border-primary/40 dark:text-primary dark:bg-primary/15",
  juridico: "border-primary/40 text-primary bg-primary/15 dark:border-primary/40 dark:text-primary dark:bg-primary/15",
  calculo_concluido: "border-primary/40 text-primary bg-primary/15 dark:border-primary/40 dark:text-primary dark:bg-primary/15",
  proposta_negociacao: "border-primary/40 text-primary bg-primary/15 dark:border-primary/40 dark:text-primary dark:bg-primary/15",
  proposta_aceita: "border-primary/40 text-primary bg-primary/15 dark:border-primary/40 dark:text-primary dark:bg-primary/15",
  certidoes: "border-primary/40 text-primary bg-primary/15 dark:border-primary/40 dark:text-primary dark:bg-primary/15",
  escrituras: "border-primary/40 text-primary bg-primary/15 dark:border-primary/40 dark:text-primary dark:bg-primary/15",
  fechado: "border-primary/40 text-primary bg-primary/15 dark:border-primary/40 dark:text-primary dark:bg-primary/15",
  pos_fechamento: "border-primary/40 text-primary bg-primary/15 dark:border-primary/40 dark:text-primary dark:bg-primary/15",
  pausado_credor: "border-primary/40 text-primary bg-primary/15 dark:border-primary/40 dark:text-primary dark:bg-primary/15",
  pausado_documentos: "border-primary/40 text-primary bg-primary/15 dark:border-primary/40 dark:text-primary dark:bg-primary/15",
  sem_interesse: "border-border text-muted-foreground bg-muted dark:border-border dark:text-muted-foreground dark:bg-muted",
  reprovado: "border-destructive/40 text-destructive bg-destructive/15 dark:border-destructive/40 dark:text-destructive dark:bg-destructive/15",
}

const STATUS_TAB_MAP: Record<string, string> = {
  juridico: "juridico",
  proposta_aceita: "juridico",
  proposta_negociacao: "propostas",
  calculo_concluido: "calculo",
  calculo_andamento: "calculo",
  pronto_calculo: "calculo",
  certidoes: "certidoes",
  escrituras: "escrituras",
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
  escrituras: (nome) => (nome ? `Escrituras em andamento - ${nome}` : "Escrituras em andamento"),
  analise_processual_inicial: (nome) => (nome ? `Análise Processual Inicial - ${nome}` : "Análise Processual Inicial"),
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
  if (!status) return "border-border text-muted-foreground bg-muted dark:border-border dark:text-muted-foreground dark:bg-muted"
  return STATUS_TONES[status] || "border-border text-muted-foreground bg-muted dark:border-border dark:text-muted-foreground dark:bg-muted"
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
  if (tipo.includes("escritura")) return nome ? `Atualizacao de escrituras - ${nome}` : "Atualizacao de escrituras"

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
  if (tipo.includes("escritura")) return "escrituras"
  if (tipo.includes("documento") || tipo.includes("doc")) return "documentos"
  if (tipo.includes("oficio")) return "oficio"

  const status = getNotificationStatus(notification)
  return status ? STATUS_TAB_MAP[status] || null : null
}

const resolveModuleRoute = (notification: NotificationItem) => {
  const tipo = getTipoKey(notification.tipo)
  const status = getNotificationStatus(notification)

  if (status) {
    if (status === "juridico" || status === "proposta_aceita") return "/parecer-juridico"
    if (status === "proposta_negociacao") return "/propostas"
    if (status === "calculo_concluido" || status === "calculo_andamento" || status === "pronto_calculo") return "/calculo"
    if (status === "certidoes") return "/gestao-certidoes"
    if (status === "escrituras") return "/gestao-escrituras"
    if (status === "analise_processual_inicial") return "/gestao-oficios"
  }

  if (tipo.includes("juridico")) return "/parecer-juridico"
  if (tipo.includes("calculo")) return "/calculo"
  if (tipo.includes("proposta")) return "/propostas"
  if (tipo.includes("certidao")) return "/gestao-certidoes"
  if (tipo.includes("escritura")) return "/gestao-escrituras"
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
