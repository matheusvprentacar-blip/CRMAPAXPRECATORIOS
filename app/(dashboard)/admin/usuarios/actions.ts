"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

export async function updateUserRole(userId: string, newRole: string) {
  // 🔍 DEBUG: Verificar variáveis de ambiente
  console.log("=== DEBUG UPDATE USER ROLE ===")
  console.log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Configurada" : "❌ FALTANDO")
  console.log("SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ Configurada" : "❌ FALTANDO")
  
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("Primeiros 30 caracteres da key:", process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 30))
    console.log("Tamanho da key:", process.env.SUPABASE_SERVICE_ROLE_KEY.length, "caracteres")
  }
  console.log("=============================")

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada")
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada")
    }

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 1. Atualizar na tabela usuarios
    const { error: dbError } = await supabaseAdmin.from("usuarios").update({ role: newRole }).eq("id", userId)

    if (dbError) {
      throw new Error(`Erro ao atualizar banco de dados: ${dbError.message}`)
    }

    // 2. Atualizar app_metadata no Auth (para JWT/RLS)
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { role: newRole },
    })

    if (authError) {
      throw new Error(`Erro ao atualizar Auth: ${authError.message}`)
    }

    revalidatePath("/admin/usuarios")

    return {
      success: true,
      message: "Role atualizado com sucesso! O usuário precisa fazer logout e login novamente.",
    }
  } catch (error: any) {
    console.error("[SERVER ACTION] Erro ao atualizar role:", error)
    return {
      success: false,
      error: error.message || "Erro ao atualizar role do usuário",
    }
  }
}

export async function createNewUser(data: {
  email: string
  password: string
  nome: string
  role: string
  autoConfirm: boolean
}) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada")
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada")
    }

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: data.autoConfirm,
      user_metadata: {
        nome: data.nome,
        role: data.role,
      },
      app_metadata: {
        role: data.role, // <-- IMPORTANTE: define role no JWT para RLS
      },
    })

    if (authError) {
      throw new Error(authError.message)
    }

    if (!authData.user) {
      throw new Error("Usuário não foi criado")
    }

    const { error: dbError } = await supabaseAdmin.from("usuarios").insert({
      id: authData.user.id,
      email: data.email,
      nome: data.nome,
      role: data.role,
      created_at: new Date().toISOString(),
    })

    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw new Error(`Erro no banco de dados: ${dbError.message}`)
    }

    revalidatePath("/admin/usuarios")

    return {
      success: true,
      data: authData.user,
      message: data.autoConfirm
        ? `Usuário ${data.nome} criado e confirmado com sucesso!`
        : `Usuário ${data.nome} criado! Um email de confirmação foi enviado.`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Erro ao criar usuário",
    }
  }
}
