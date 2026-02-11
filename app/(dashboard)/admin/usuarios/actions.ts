import { createBrowserClient } from "@/lib/supabase/client"

export type CreditRedistributionAssignment = {
  precatorioId: string
  newUserId: string
}

async function invokeAdminAction(payload: Record<string, unknown>) {
  const supabase = createBrowserClient()

  if (!supabase) return { success: false, error: "Cliente Supabase nao inicializado" }

  const { data, error } = await supabase.functions.invoke("admin-actions", {
    body: payload,
  })

  if (error) {
    console.error("Erro Edge Function:", error)
    return { success: false, error: error.message || "Erro ao conectar com servidor" }
  }

  return data
}

export async function updateUserRole(userId: string, newRole: string[]) {
  return invokeAdminAction({ action: "updateUserRole", userId, newRole })
}

export async function createNewUser(userData: {
  email: string
  password: string
  nome: string
  role: string[]
  autoConfirm: boolean
}) {
  return invokeAdminAction({ action: "createNewUser", ...userData })
}

export async function getUserCreditAssignments(userId: string) {
  return invokeAdminAction({ action: "getUserCreditAssignments", userId })
}

export async function setUserActiveStatus(
  userId: string,
  ativo: boolean,
  redistributionAssignments?: CreditRedistributionAssignment[],
) {
  return invokeAdminAction({ action: "setUserActiveStatus", userId, ativo, redistributionAssignments })
}

export async function deleteUser(userId: string, redistributionAssignments?: CreditRedistributionAssignment[]) {
  return invokeAdminAction({ action: "deleteUser", userId, redistributionAssignments })
}
