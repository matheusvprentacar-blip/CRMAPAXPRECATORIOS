import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, nome, role, autoConfirm } = body

    if (!email || !password || !nome || !role) {
      return NextResponse.json({ success: false, error: "Todos os campos são obrigatórios" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: "A senha deve ter no mínimo 6 caracteres" }, { status: 400 })
    }

    const cookieStore = await cookies()

    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 })
    }

    const { data: currentUserData } = await supabaseClient.from("usuarios").select("role").eq("id", user.id).single()

    if (currentUserData?.role !== "admin") {
      return NextResponse.json({ success: false, error: "Sem permissão para criar usuários" }, { status: 403 })
    }

    // Depois o admin pode confirmar manualmente no dashboard
    const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome,
          role,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard`,
      },
    })

    if (signUpError) {
      console.error("[v0] SignUp error:", signUpError)
      return NextResponse.json(
        { success: false, error: `Erro ao criar usuário: ${signUpError.message}` },
        { status: 400 },
      )
    }

    if (!signUpData.user) {
      return NextResponse.json({ success: false, error: "Usuário não foi criado" }, { status: 400 })
    }

    const { error: dbError } = await supabaseClient.from("usuarios").insert({
      id: signUpData.user.id,
      email,
      nome,
      role,
    })

    if (dbError) {
      console.error("[v0] Database error:", dbError)
      return NextResponse.json({ success: false, error: `Erro ao salvar usuário: ${dbError.message}` }, { status: 500 })
    }

    const message = autoConfirm
      ? `Usuário criado! Para confirmar o email automaticamente, vá no Supabase Dashboard > Authentication > Users e clique em "Confirm Email" para ${email}`
      : `Usuário criado! Um email de confirmação foi enviado para ${email}`

    return NextResponse.json({
      success: true,
      data: {
        id: signUpData.user.id,
        email,
        nome,
        needsManualConfirmation: autoConfirm,
      },
      message,
    })
  } catch (error: any) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ success: false, error: error.message || "Erro inesperado" }, { status: 500 })
  }
}
