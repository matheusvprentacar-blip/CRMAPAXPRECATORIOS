import type { Precatorio, Usuario, Atividade, Comentario } from "@/lib/types/database"

const STORAGE_KEYS = {
  PRECATORIOS: "crm_precatorios",
  USUARIOS: "crm_usuarios",
  ATIVIDADES: "crm_atividades",
  COMENTARIOS: "crm_comentarios",
  CURRENT_USER: "crm_current_user",
}

// Precatórios
export function getPrecatoriosLocal(): Precatorio[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_KEYS.PRECATORIOS)
  return data ? JSON.parse(data) : []
}

export function savePrecatorioLocal(precatorio: Precatorio): void {
  const precatorios = getPrecatoriosLocal()
  const index = precatorios.findIndex((p) => p.id === precatorio.id)

  if (index >= 0) {
    precatorios[index] = { ...precatorio, updated_at: new Date().toISOString() }
  } else {
    precatorios.push(precatorio)
  }

  localStorage.setItem(STORAGE_KEYS.PRECATORIOS, JSON.stringify(precatorios))
}

export function deletePrecatorioLocal(id: string): void {
  const precatorios = getPrecatoriosLocal().filter((p) => p.id !== id)
  localStorage.setItem(STORAGE_KEYS.PRECATORIOS, JSON.stringify(precatorios))
}

export const getAllPrecatorios = getPrecatoriosLocal
export const savePrecatorio = savePrecatorioLocal

// Usuários
export function getUsuariosLocal(): Usuario[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_KEYS.USUARIOS)
  return data ? JSON.parse(data) : []
}

export function getCurrentUserLocal(): Usuario | null {
  if (typeof window === "undefined") return null
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER)
  return data ? JSON.parse(data) : null
}

export function setCurrentUserLocal(usuario: Usuario): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(usuario))
}

// Atividades
export function getAtividadesLocal(precatorioId?: string): Atividade[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_KEYS.ATIVIDADES)
  const atividades: Atividade[] = data ? JSON.parse(data) : []

  return precatorioId ? atividades.filter((a) => a.precatorio_id === precatorioId) : atividades
}

export function saveAtividadeLocal(atividade: Atividade): void {
  const atividades = getAtividadesLocal()
  atividades.push(atividade)
  localStorage.setItem(STORAGE_KEYS.ATIVIDADES, JSON.stringify(atividades))
}

// Comentários
export function getComentariosLocal(precatorioId?: string): Comentario[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_KEYS.COMENTARIOS)
  const comentarios: Comentario[] = data ? JSON.parse(data) : []

  return precatorioId ? comentarios.filter((c) => c.precatorio_id === precatorioId) : comentarios
}

export function saveComentarioLocal(comentario: Comentario): void {
  const comentarios = getComentariosLocal()
  comentarios.push(comentario)
  localStorage.setItem(STORAGE_KEYS.COMENTARIOS, JSON.stringify(comentarios))
}
