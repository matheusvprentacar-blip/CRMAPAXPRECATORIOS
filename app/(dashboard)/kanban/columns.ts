// Centralized Kanban column definitions and allowed calculation columns

export const KANBAN_COLUMNS = [
    { id: "entrada", titulo: "Entrada", cor: "bg-blue-500" },
    { id: "triagem_interesse", titulo: "Triagem Interesse", cor: "bg-indigo-500" },
    { id: "aguardando_oficio", titulo: "Aguardando Ofício", cor: "bg-cyan-500" },
    { id: "pronto_calculo", titulo: "Pronto p/ Cálculo", cor: "bg-orange-500" },
    { id: "calculo_andamento", titulo: "Cálculo", cor: "bg-orange-500" },
    { id: "certidoes", titulo: "Certidões", cor: "bg-purple-500" },
    { id: "analise_juridica", titulo: "Jurídico", cor: "bg-red-500" },
    { id: "calculo_concluido", titulo: "Calculado", cor: "bg-green-500" },
    { id: "proposta_negociacao", titulo: "Proposta", cor: "bg-yellow-500" },
    { id: "sem_interesse", titulo: "Sem Interesse", cor: "bg-slate-500" },
    { id: "fechado", titulo: "Fechado", cor: "bg-gray-700" },
];

// Columns that allow access to the calculation area (used by operador_calculo)
export const COLUNAS_CALCULO_PERMITIDO = [
    "pronto_calculo",
    "calculo_andamento",
    "calculo_concluido",
    "aguardando_oficio",
];
