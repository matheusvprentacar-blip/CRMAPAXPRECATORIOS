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
  color: KanbanColor
  statusIds?: string[]
}> = [
    {
      id: "entrada",
      titulo: "Entrada / Pré-cadastro",
      color: {
        dot: "bg-blue-700 dark:bg-blue-400",
        bar: "bg-blue-700 dark:bg-blue-400",
        bg: "bg-blue-100/80 dark:bg-blue-950/40",
        ring: "ring-blue-300/60 dark:ring-blue-900/60",
        text: "text-blue-900 dark:text-blue-200",
      },
    },
    {
      id: "triagem_interesse",
      titulo: "Triagem (interesse do credor)",
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
      titulo: "Análise Processual Inicial",
      color: {
        dot: "bg-cyan-700 dark:bg-cyan-400",
        bar: "bg-cyan-700 dark:bg-cyan-400",
        bg: "bg-cyan-100/80 dark:bg-cyan-950/40",
        ring: "ring-cyan-300/60 dark:ring-cyan-900/60",
        text: "text-cyan-900 dark:text-cyan-200",
      },
    },
    {
      id: "pronto_calculo",
      titulo: "Pronto para cálculo",
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
      color: {
        dot: "bg-amber-700 dark:bg-amber-400",
        bar: "bg-amber-700 dark:bg-amber-400",
        bg: "bg-amber-100/80 dark:bg-amber-950/40",
        ring: "ring-amber-300/60 dark:ring-amber-900/60",
        text: "text-amber-900 dark:text-amber-200",
      },
    },
    {
      id: "juridico",
      titulo: "Jurídico",
      color: {
        dot: "bg-rose-700 dark:bg-rose-400",
        bar: "bg-rose-700 dark:bg-rose-400",
        bg: "bg-rose-100/80 dark:bg-rose-950/40",
        ring: "ring-rose-300/60 dark:ring-rose-900/60",
        text: "text-rose-900 dark:text-rose-200",
      },
    },
    {
      id: "calculo_concluido",
      titulo: "Cálculo concluído",
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
      color: {
        dot: "bg-purple-700 dark:bg-purple-400",
        bar: "bg-purple-700 dark:bg-purple-400",
        bg: "bg-purple-100/80 dark:bg-purple-950/40",
        ring: "ring-purple-300/60 dark:ring-purple-900/60",
        text: "text-purple-900 dark:text-purple-200",
      },
    },
    {
      id: "fechado",
      titulo: "Fechado",
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
      titulo: "Encerrados / Pausados",
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
      titulo: "Reprovado / não elegível",
      color: {
        dot: "bg-zinc-800 dark:bg-zinc-500",
        bar: "bg-zinc-800 dark:bg-zinc-500",
        bg: "bg-zinc-200/70 dark:bg-zinc-900/60",
        ring: "ring-zinc-300/60 dark:ring-zinc-800/70",
        text: "text-zinc-900 dark:text-zinc-200",
      },
    },
  ]

export const COLUNAS_CALCULO_PERMITIDO = [
  "pronto_calculo",
  "calculo_andamento",
  "calculo_concluido",
]
