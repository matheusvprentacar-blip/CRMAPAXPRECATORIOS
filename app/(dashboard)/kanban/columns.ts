// Centralized Kanban column definitions and allowed calculation columns

type KanbanColor = {
  dot: string
  bar: string
  bg: string
  ring: string
  text: string
}

export const KANBAN_COLUMNS: Array<{
  id: string
  titulo: string
  kicker: string
  meta: string
  color: KanbanColor
  statusIds?: string[]
}> = [
  {
    id: "entrada",
    titulo: "Entrada / Pré-cadastro",
    kicker: "Recepção",
    meta: "Precatórios aguardando cadastro inicial",
    color: {
      dot: "bg-blue-700 dark:bg-blue-400",
      bar: "bg-blue-700 dark:bg-blue-400",
      bg: "bg-blue-100/80 dark:bg-blue-950/40",
      ring: "ring-blue-300/60 dark:ring-blue-900/60",
      text: "text-blue-900 dark:text-blue-200",
    },
  },
  {
    id: "recebidos_admin",
    titulo: "Recebidos do Admin",
    kicker: "Distribuição",
    meta: "Aguardando direcionamento comercial",
    color: {
      dot: "bg-teal-700 dark:bg-teal-400",
      bar: "bg-teal-700 dark:bg-teal-400",
      bg: "bg-teal-100/80 dark:bg-teal-950/40",
      ring: "ring-teal-300/60 dark:ring-teal-900/60",
      text: "text-teal-900 dark:text-teal-200",
    },
  },
  {
    id: "triagem_interesse",
    titulo: "Triagem",
    kicker: "Gate inicial",
    meta: "Interesse e direcionamento do credor",
    color: {
      dot: "bg-indigo-700 dark:bg-indigo-400",
      bar: "bg-indigo-700 dark:bg-indigo-400",
      bg: "bg-indigo-100/80 dark:bg-indigo-950/40",
      ring: "ring-indigo-300/60 dark:ring-indigo-900/60",
      text: "text-indigo-900 dark:text-indigo-200",
    },
  },
  {
    id: "docs_credor",
    titulo: "Documentos do credor",
    kicker: "Gate documental",
    meta: "Coleta e validação dos documentos mínimos",
    color: {
      dot: "bg-sky-700 dark:bg-sky-400",
      bar: "bg-sky-700 dark:bg-sky-400",
      bg: "bg-sky-100/80 dark:bg-sky-950/40",
      ring: "ring-sky-300/60 dark:ring-sky-900/60",
      text: "text-sky-900 dark:text-sky-200",
    },
  },
  {
    id: "analise_processual_inicial",
    titulo: "Pré-análise jurídica",
    kicker: "Gate processual",
    meta: "Análise processual inicial e elegibilidade",
    color: {
      dot: "bg-cyan-700 dark:bg-cyan-400",
      bar: "bg-cyan-700 dark:bg-cyan-400",
      bg: "bg-cyan-100/80 dark:bg-cyan-950/40",
      ring: "ring-cyan-300/60 dark:ring-cyan-900/60",
      text: "text-cyan-900 dark:text-cyan-200",
    },
  },
  {
    id: "juridico",
    titulo: "Jurídico",
    kicker: "Gate jurídico",
    meta: "Parecer e análise de risco jurídico",
    color: {
      dot: "bg-rose-700 dark:bg-rose-400",
      bar: "bg-rose-700 dark:bg-rose-400",
      bg: "bg-rose-100/80 dark:bg-rose-950/40",
      ring: "ring-rose-300/60 dark:ring-rose-900/60",
      text: "text-rose-900 dark:text-rose-200",
    },
  },
  {
    id: "pronto_calculo",
    titulo: "Pronto para cálculo",
    kicker: "Gate de cálculo",
    meta: "Liberados para abertura da área de cálculo",
    color: {
      dot: "bg-orange-700 dark:bg-orange-400",
      bar: "bg-orange-700 dark:bg-orange-400",
      bg: "bg-orange-100/80 dark:bg-orange-950/40",
      ring: "ring-orange-300/60 dark:ring-orange-900/60",
      text: "text-orange-900 dark:text-orange-200",
    },
  },
  {
    id: "calculo_andamento",
    titulo: "Cálculo em andamento",
    kicker: "Produção",
    meta: "Atualização monetária em execução",
    color: {
      dot: "bg-amber-700 dark:bg-amber-400",
      bar: "bg-amber-700 dark:bg-amber-400",
      bg: "bg-amber-100/80 dark:bg-amber-950/40",
      ring: "ring-amber-300/60 dark:ring-amber-900/60",
      text: "text-amber-900 dark:text-amber-200",
    },
  },
  {
    id: "calculo_concluido",
    titulo: "Cálculo concluído",
    kicker: "Pronto para proposta",
    meta: "Valores calculados e validados",
    color: {
      dot: "bg-green-700 dark:bg-green-400",
      bar: "bg-green-700 dark:bg-green-400",
      bg: "bg-green-100/80 dark:bg-green-950/40",
      ring: "ring-green-300/60 dark:ring-green-900/60",
      text: "text-green-900 dark:text-green-200",
    },
  },
  {
    id: "proposta_negociacao",
    titulo: "Proposta / Negociação",
    kicker: "Comercial",
    meta: "Proposta enviada, aguardando aceite",
    color: {
      dot: "bg-yellow-700 dark:bg-yellow-400",
      bar: "bg-yellow-700 dark:bg-yellow-400",
      bg: "bg-yellow-100/80 dark:bg-yellow-950/40",
      ring: "ring-yellow-300/60 dark:ring-yellow-900/60",
      text: "text-yellow-900 dark:text-yellow-200",
    },
  },
  {
    id: "proposta_aceita",
    titulo: "Jurídico de fechamento",
    kicker: "Gate final",
    meta: "Proposta aceita, preparando fechamento",
    color: {
      dot: "bg-emerald-700 dark:bg-emerald-400",
      bar: "bg-emerald-700 dark:bg-emerald-400",
      bg: "bg-emerald-100/80 dark:bg-emerald-950/40",
      ring: "ring-emerald-300/60 dark:ring-emerald-900/60",
      text: "text-emerald-900 dark:text-emerald-200",
    },
  },
  {
    id: "certidoes",
    titulo: "Certidões (pós-aceite)",
    kicker: "Gate certidões",
    meta: "Certidões e documentação final",
    color: {
      dot: "bg-purple-700 dark:bg-purple-400",
      bar: "bg-purple-700 dark:bg-purple-400",
      bg: "bg-purple-100/80 dark:bg-purple-950/40",
      ring: "ring-purple-300/60 dark:ring-purple-900/60",
      text: "text-purple-900 dark:text-purple-200",
    },
  },
  {
    id: "escrituras",
    titulo: "Escrituras",
    kicker: "Formalização",
    meta: "Lavra e assinatura das escrituras",
    color: {
      dot: "bg-fuchsia-700 dark:bg-fuchsia-400",
      bar: "bg-fuchsia-700 dark:bg-fuchsia-400",
      bg: "bg-fuchsia-100/80 dark:bg-fuchsia-950/40",
      ring: "ring-fuchsia-300/60 dark:ring-fuchsia-900/60",
      text: "text-fuchsia-900 dark:text-fuchsia-200",
    },
  },
  {
    id: "fechado",
    titulo: "Fechado",
    kicker: "Concluído",
    meta: "Operação finalizada com sucesso",
    color: {
      dot: "bg-zinc-800 dark:bg-zinc-500",
      bar: "bg-zinc-800 dark:bg-zinc-500",
      bg: "bg-zinc-200/70 dark:bg-zinc-900/60",
      ring: "ring-zinc-300/60 dark:ring-zinc-800/70",
      text: "text-zinc-900 dark:text-zinc-200",
    },
  },
  {
    id: "encerrados",
    titulo: "Pausados",
    kicker: "Fila de espera",
    meta: "Pausados ou sem interesse no momento",
    statusIds: ["pos_fechamento", "pausado_credor", "pausado_documentos", "sem_interesse"],
    color: {
      dot: "bg-slate-800 dark:bg-slate-500",
      bar: "bg-slate-800 dark:bg-slate-500",
      bg: "bg-slate-200/70 dark:bg-slate-900/60",
      ring: "ring-slate-300/60 dark:ring-slate-800/70",
      text: "text-slate-900 dark:text-slate-200",
    },
  },
  {
    id: "reprovado",
    titulo: "Reprovado / Não elegível",
    kicker: "Encerrado",
    meta: "Não elegível ou reprovado na análise",
    color: {
      dot: "bg-zinc-800 dark:bg-zinc-500",
      bar: "bg-zinc-800 dark:bg-zinc-500",
      bg: "bg-zinc-200/70 dark:bg-zinc-900/60",
      ring: "ring-zinc-300/60 dark:ring-zinc-800/70",
      text: "text-zinc-900 dark:text-zinc-200",
    },
  },
]

export const COLUNAS_CALCULO_PERMITIDO = ["pronto_calculo", "calculo_andamento", "calculo_concluido"]
