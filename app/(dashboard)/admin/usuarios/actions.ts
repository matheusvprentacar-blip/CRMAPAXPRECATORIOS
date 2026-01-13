import { createBrowserClient } from "@/lib/supabase/client"

export async function updateUserRole(userId: string, newRole: string[]) {
  const supabase = createBrowserClient()

  if (!supabase) return { success: false, error: "Cliente Supabase não inicializado" }

  const { data, error } = await supabase.functions.invoke('admin-actions', {
    body: { action: 'updateUserRole', userId, newRole }
  })

  if (error) {
    console.error("Erro Edge Function:", error)
    return { success: false, error: error.message || "Erro ao conectar com servidor" }
  }

  return data
}

export async function createNewUser(userData: {
  email: string
  password: string
  nome: string
  role: string[]
  autoConfirm: boolean
}) {
  const supabase = createBrowserClient()

  if (!supabase) return { success: false, error: "Cliente Supabase não inicializado" }

  const { data, error } = await supabase.functions.invoke('admin-actions', {
    body: { action: 'createNewUser', ...userData }
  })

  if (error) {
    console.error("Erro Edge Function:", error)
    return { success: false, error: error.message || "Erro ao conectar com servidor" }
  }

  return data
}

