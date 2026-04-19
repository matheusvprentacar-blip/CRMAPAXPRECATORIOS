export interface HorarioJanela {
  inicio: string // "HH:MM"
  fim: string    // "HH:MM"
}

export interface HorariosPermitidos {
  ativo: boolean
  dias: Partial<Record<"0" | "1" | "2" | "3" | "4" | "5" | "6", HorarioJanela | null>>
}

const DIAS_LABEL: Record<string, string> = {
  "0": "Domingo",
  "1": "Segunda",
  "2": "Terça",
  "3": "Quarta",
  "4": "Quinta",
  "5": "Sexta",
  "6": "Sábado",
}

function parseMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function currentMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

/** Verifica se agora está dentro da janela permitida para o usuário. */
export function isWithinAllowedHours(horarios: HorariosPermitidos | null | undefined): boolean {
  if (!horarios || !horarios.ativo) return true // sem restrição

  const now = new Date()
  const dayKey = String(now.getDay()) as keyof typeof horarios.dias
  const janela = horarios.dias[dayKey]

  if (!janela) return false // dia bloqueado

  const cur = currentMinutes()
  const start = parseMinutes(janela.inicio)
  const end = parseMinutes(janela.fim)

  return cur >= start && cur < end
}

export interface ProximoAcesso {
  /** Minutos até o próximo horário permitido (pode ser dias à frente) */
  minutosRestantes: number
  /** Data/hora exata em que o acesso será liberado */
  dataHora: Date
  /** Label legível, ex: "Segunda às 08:00" */
  label: string
}

/** Retorna quando será o próximo acesso permitido (próximos 7 dias). */
export function getProximoAcesso(horarios: HorariosPermitidos | null | undefined): ProximoAcesso | null {
  if (!horarios || !horarios.ativo) return null

  const now = new Date()

  for (let daysAhead = 0; daysAhead < 8; daysAhead++) {
    const candidate = new Date(now)
    candidate.setDate(now.getDate() + daysAhead)
    candidate.setSeconds(0, 0)

    const dayKey = String(candidate.getDay()) as keyof typeof horarios.dias
    const janela = horarios.dias[dayKey]
    if (!janela) continue

    const [initH, initM] = janela.inicio.split(":").map(Number)
    candidate.setHours(initH ?? 0, initM ?? 0, 0, 0)

    if (candidate > now) {
      const minutosRestantes = Math.ceil((candidate.getTime() - now.getTime()) / 60_000)
      const label = `${DIAS_LABEL[dayKey] ?? dayKey} às ${janela.inicio}`
      return { minutosRestantes, dataHora: candidate, label }
    }
  }

  return null
}

/** Formata a contagem regressiva em "Xh Ym" ou "Ym" */
export function formatCountdown(minutosRestantes: number): string {
  if (minutosRestantes <= 0) return "agora"
  const h = Math.floor(minutosRestantes / 60)
  const m = minutosRestantes % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

export { DIAS_LABEL }
