import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        )

        // Get request body
        const { action, ...data } = await req.json()

        // ----------------------------------------------------------------------
        // ACTION: updateUserRole
        // ----------------------------------------------------------------------
        if (action === 'updateUserRole') {
            const { userId, newRole } = data

            if (!userId || !newRole) {
                throw new Error('UserId e NewRole são obrigatórios')
            }

            // 1. Atualizar na tabela usuarios
            const { error: dbError } = await supabaseClient
                .from('usuarios')
                .update({ role: newRole })
                .eq('id', userId)

            if (dbError) throw new Error(`Erro DB: ${dbError.message}`)

            // 2. Atualizar Auth Metadata (para JWT)
            const { error: authError } = await supabaseClient.auth.admin.updateUserById(
                userId,
                { app_metadata: { role: newRole } }
            )

            if (authError) throw new Error(`Erro Auth: ${authError.message}`)

            return new Response(
                JSON.stringify({ success: true, message: 'Role atualizado com sucesso!' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // ----------------------------------------------------------------------
        // ACTION: createNewUser
        // ----------------------------------------------------------------------
        if (action === 'createNewUser') {
            const { email, password, nome, role, autoConfirm } = data

            if (!email || !password || !nome) {
                throw new Error('Dados incompletos')
            }

            const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
                email,
                password,
                email_confirm: autoConfirm,
                user_metadata: { nome, role },
                app_metadata: { role },
            })

            if (authError) throw authError
            if (!authData.user) throw new Error('Usuário não criado')

            const { error: dbError } = await supabaseClient.from('usuarios').insert({
                id: authData.user.id,
                email,
                nome,
                role,
                created_at: new Date().toISOString(),
            })

            if (dbError) {
                await supabaseClient.auth.admin.deleteUser(authData.user.id)
                throw new Error(`Erro DB: ${dbError.message}`)
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    message: autoConfirm
                        ? 'Usuário criado e confirmado!'
                        : 'Usuário criado! Confirmação enviada.',
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        throw new Error(`Ação desconhecida: ${action}`)

    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    }
})
