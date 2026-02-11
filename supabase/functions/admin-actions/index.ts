import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_MANAGER_ROLES = ['admin', 'gestor']
const COMMERCIAL_PREFERRED_ROLES = ['operador_comercial', 'admin', 'gestor']

const ASSIGNMENT_FIELDS = [
    'dono_usuario_id',
    'responsavel',
    'responsavel_calculo_id',
    'operador_calculo',
    'responsavel_certidoes_id',
    'responsavel_oficio_id',
    'responsavel_juridico_id',
] as const

type AssignmentField = (typeof ASSIGNMENT_FIELDS)[number]

type CreditRow = {
    id: string
    titulo?: string | null
    numero_precatorio?: string | null
    credor_nome?: string | null
    valor_principal?: number | null
    valor_atualizado?: number | null
    [key: string]: unknown
}

type RecipientRow = {
    id: string
    nome?: string | null
    email?: string | null
    role?: unknown
    ativo?: boolean | null
}

type RedistributionAssignment = {
    precatorioId: string
    newUserId: string
}

type RedistributionSummary = {
    totalAffected: number
    totalReassigned: number
    byUser: Array<{ userId: string; count: number; totalValue: number }>
}

function normalizeRoles(rawRole: unknown): string[] {
    if (Array.isArray(rawRole)) {
        return rawRole.filter((role): role is string => typeof role === 'string')
    }

    if (typeof rawRole === 'string' && rawRole.trim().length > 0) {
        return [rawRole]
    }

    return []
}

function hasAnyRole(rawRole: unknown, targetRoles: string[]): boolean {
    const roles = normalizeRoles(rawRole)
    return targetRoles.some((role) => roles.includes(role))
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message
    if (typeof error === 'string') return error
    return 'Erro desconhecido'
}

function isMissingColumnError(error: unknown): boolean {
    const message = toErrorMessage(error).toLowerCase()
    return (
        message.includes('schema cache') ||
        (message.includes('column') && (message.includes('not found') || message.includes('does not exist')))
    )
}

function getCreditValue(credit: CreditRow): number {
    const valorAtualizado = Number(credit.valor_atualizado ?? 0)
    if (valorAtualizado > 0) return valorAtualizado
    return Number(credit.valor_principal ?? 0) || 0
}

function getCommercialRecommendedRecipientIds(recipients: RecipientRow[]): string[] {
    const preferred = recipients
        .filter((user) => hasAnyRole(user.role, COMMERCIAL_PREFERRED_ROLES))
        .map((user) => user.id)

    if (preferred.length > 0) return preferred
    return recipients.map((user) => user.id)
}

async function resolveAvailableAssignmentFields(supabaseClient: any): Promise<AssignmentField[]> {
    const available: AssignmentField[] = []

    for (const field of ASSIGNMENT_FIELDS) {
        const { error } = await supabaseClient
            .from('precatorios')
            .select(`id, ${field}`)
            .limit(1)

        if (!error) {
            available.push(field)
            continue
        }

        if (isMissingColumnError(error)) continue
        throw new Error(`Erro ao validar campo ${field}: ${error.message}`)
    }

    return available
}

async function fetchEligibleRecipients(
    supabaseClient: any,
    excludedUserId: string
): Promise<RecipientRow[]> {
    const { data, error } = await supabaseClient
        .from('usuarios')
        .select('id, nome, email, role, ativo')
        .eq('ativo', true)
        .neq('id', excludedUserId)

    if (error) {
        throw new Error(`Erro ao carregar usuarios ativos: ${error.message}`)
    }

    return (data ?? []) as RecipientRow[]
}

async function fetchAffectedCredits(
    supabaseClient: any,
    targetUserId: string
): Promise<{ credits: CreditRow[]; fields: AssignmentField[] }> {
    const fields = await resolveAvailableAssignmentFields(supabaseClient)
    if (fields.length === 0) return { credits: [], fields: [] }

    const selectFields = [
        'id',
        'titulo',
        'numero_precatorio',
        'credor_nome',
        'valor_principal',
        'valor_atualizado',
        ...fields,
    ].join(', ')

    const filters = fields.map((field) => `${field}.eq.${targetUserId}`).join(',')
    const { data, error } = await supabaseClient
        .from('precatorios')
        .select(selectFields)
        .or(filters)

    if (error) {
        throw new Error(`Erro ao localizar creditos atribuidos: ${error.message}`)
    }

    return {
        credits: (data ?? []) as CreditRow[],
        fields,
    }
}

async function applyManualRedistribution(
    supabaseClient: any,
    targetUserId: string,
    redistributionAssignments: RedistributionAssignment[] | undefined
): Promise<RedistributionSummary> {
    const { credits, fields } = await fetchAffectedCredits(supabaseClient, targetUserId)
    if (credits.length === 0 || fields.length === 0) {
        return { totalAffected: 0, totalReassigned: 0, byUser: [] }
    }

    if (!Array.isArray(redistributionAssignments) || redistributionAssignments.length === 0) {
        throw new Error('Este usuario possui creditos atribuidos. Defina a redistribuicao manual antes de continuar.')
    }

    const assignmentMap = new Map<string, string>()
    redistributionAssignments.forEach((item) => {
        if (!item || typeof item !== 'object') return
        const precatorioId = typeof item.precatorioId === 'string' ? item.precatorioId : ''
        const newUserId = typeof item.newUserId === 'string' ? item.newUserId : ''
        if (!precatorioId || !newUserId) return
        assignmentMap.set(precatorioId, newUserId)
    })

    const missingAssignments = credits.filter((credit) => !assignmentMap.has(credit.id))
    if (missingAssignments.length > 0) {
        throw new Error(`Existem ${missingAssignments.length} credito(s) sem destinatario definido.`)
    }

    const recipients = await fetchEligibleRecipients(supabaseClient, targetUserId)
    const recipientSet = new Set(recipients.map((recipient) => recipient.id))

    const recipientIds = Array.from(new Set(Array.from(assignmentMap.values())))
    const invalidRecipientIds = recipientIds.filter((id) => !recipientSet.has(id))
    if (invalidRecipientIds.length > 0) {
        throw new Error('A redistribuicao contem destinatarios invalidos ou inativos.')
    }

    const nowIso = new Date().toISOString()
    const statsByUser: Record<string, { count: number; totalValue: number }> = {}
    let totalReassigned = 0

    for (const credit of credits) {
        const newUserId = assignmentMap.get(credit.id)
        if (!newUserId) continue

        const payload: Record<string, unknown> = { updated_at: nowIso }
        let touched = false

        fields.forEach((field) => {
            if (credit[field] === targetUserId) {
                payload[field] = newUserId
                touched = true
            }
        })

        if (!touched) continue

        const { error: updateError } = await supabaseClient
            .from('precatorios')
            .update(payload)
            .eq('id', credit.id)

        if (updateError) {
            throw new Error(`Erro ao redistribuir credito ${credit.id}: ${updateError.message}`)
        }

        if (!statsByUser[newUserId]) {
            statsByUser[newUserId] = { count: 0, totalValue: 0 }
        }
        statsByUser[newUserId].count += 1
        statsByUser[newUserId].totalValue += getCreditValue(credit)
        totalReassigned += 1
    }

    return {
        totalAffected: credits.length,
        totalReassigned,
        byUser: Object.entries(statsByUser).map(([userId, value]) => ({
            userId,
            count: value.count,
            totalValue: value.totalValue,
        })),
    }
}

async function ensureManager(supabaseClient: any, currentUserId: string, appMetadataRoles: unknown) {
    let currentUserRoles = normalizeRoles(appMetadataRoles)
    if (currentUserRoles.length === 0) {
        const { data: currentProfile } = await supabaseClient
            .from('usuarios')
            .select('role')
            .eq('id', currentUserId)
            .single()

        currentUserRoles = normalizeRoles(currentProfile?.role)
    }

    const canManageUsers = ALLOWED_MANAGER_ROLES.some((role) => currentUserRoles.includes(role))
    if (!canManageUsers) throw new Error('Permissao negada para gerenciar usuarios')
}

Deno.serve(async (req) => {
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

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Ausente header de autorizacao')

        const token = authHeader.replace('Bearer ', '')
        const { data: { user: currentUser }, error: authError } = await supabaseClient.auth.getUser(token)
        if (authError || !currentUser) throw new Error('Nao autenticado')

        await ensureManager(supabaseClient, currentUser.id, currentUser.app_metadata?.role)

        const { action, ...data } = await req.json()

        // ----------------------------------------------------------------------
        // ACTION: getUserCreditAssignments
        // ----------------------------------------------------------------------
        if (action === 'getUserCreditAssignments') {
            const { userId } = data
            if (!userId || typeof userId !== 'string') {
                throw new Error('userId e obrigatorio')
            }

            const { credits } = await fetchAffectedCredits(supabaseClient, userId)
            const recipients = await fetchEligibleRecipients(supabaseClient, userId)

            return new Response(
                JSON.stringify({
                    success: true,
                    affectedCredits: credits,
                    eligibleRecipients: recipients,
                    recommendedRecipientIds: getCommercialRecommendedRecipientIds(recipients),
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // ----------------------------------------------------------------------
        // ACTION: updateUserRole
        // ----------------------------------------------------------------------
        if (action === 'updateUserRole') {
            const { userId, newRole } = data

            if (!userId || !newRole) {
                throw new Error('userId e newRole sao obrigatorios')
            }

            const { error: dbError } = await supabaseClient
                .from('usuarios')
                .update({ role: newRole })
                .eq('id', userId)

            if (dbError) throw new Error(`Erro DB: ${dbError.message}`)

            const { error: authRoleError } = await supabaseClient.auth.admin.updateUserById(
                userId,
                { app_metadata: { role: newRole } }
            )

            if (authRoleError) throw new Error(`Erro Auth: ${authRoleError.message}`)

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

            const { data: authData, error: createAuthError } = await supabaseClient.auth.admin.createUser({
                email,
                password,
                email_confirm: autoConfirm,
                user_metadata: { nome, role },
                app_metadata: { role },
            })

            if (createAuthError) throw createAuthError
            if (!authData.user) throw new Error('Usuario nao criado')

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
                        ? 'Usuario criado e confirmado!'
                        : 'Usuario criado! Confirmacao enviada.',
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // ----------------------------------------------------------------------
        // ACTION: setUserActiveStatus (deactivate/reactivate)
        // ----------------------------------------------------------------------
        if (action === 'setUserActiveStatus') {
            const { userId, ativo, redistributionAssignments } = data

            if (!userId || typeof ativo !== 'boolean') {
                throw new Error('userId e ativo sao obrigatorios')
            }

            if (userId === currentUser.id) {
                throw new Error('Voce nao pode desativar sua propria conta')
            }

            const { data: targetUser, error: targetError } = await supabaseClient
                .from('usuarios')
                .select('id, nome, role')
                .eq('id', userId)
                .single()

            if (targetError || !targetUser) {
                throw new Error('Usuario alvo nao encontrado')
            }

            const targetRoles = normalizeRoles(targetUser.role)
            if (!ativo && targetRoles.includes('admin')) {
                const { count, error: adminCountError } = await supabaseClient
                    .from('usuarios')
                    .select('*', { count: 'exact', head: true })
                    .contains('role', ['admin'])
                    .eq('ativo', true)

                if (adminCountError) throw new Error(`Erro ao validar admins: ${adminCountError.message}`)
                if ((count ?? 0) <= 1) {
                    throw new Error('Nao e permitido desativar o ultimo administrador ativo')
                }
            }

            let redistribution: RedistributionSummary | null = null
            if (!ativo) {
                redistribution = await applyManualRedistribution(
                    supabaseClient,
                    userId,
                    Array.isArray(redistributionAssignments) ? (redistributionAssignments as RedistributionAssignment[]) : undefined
                )
            }

            const { error: dbError } = await supabaseClient
                .from('usuarios')
                .update({
                    ativo,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId)

            if (dbError) throw new Error(`Erro DB: ${dbError.message}`)

            const { error: authUpdateError } = await supabaseClient.auth.admin.updateUserById(
                userId,
                { ban_duration: ativo ? 'none' : '876000h' }
            )

            if (authUpdateError) {
                throw new Error(`Erro Auth: ${authUpdateError.message}`)
            }

            const message = ativo
                ? 'Usuario reativado com sucesso!'
                : redistribution && redistribution.totalReassigned > 0
                    ? `Usuario desativado com ${redistribution.totalReassigned} credito(s) redistribuido(s).`
                    : 'Usuario desativado com sucesso!'

            return new Response(
                JSON.stringify({
                    success: true,
                    message,
                    redistribution,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // ----------------------------------------------------------------------
        // ACTION: deleteUser
        // ----------------------------------------------------------------------
        if (action === 'deleteUser') {
            const { userId, redistributionAssignments } = data

            if (!userId || typeof userId !== 'string') {
                throw new Error('userId e obrigatorio')
            }

            if (userId === currentUser.id) {
                throw new Error('Voce nao pode excluir sua propria conta')
            }

            const { data: targetUser, error: targetError } = await supabaseClient
                .from('usuarios')
                .select('id, nome, role, ativo')
                .eq('id', userId)
                .single()

            if (targetError || !targetUser) {
                throw new Error('Usuario alvo nao encontrado')
            }

            const targetRoles = normalizeRoles(targetUser.role)
            if (targetRoles.includes('admin') && targetUser.ativo) {
                const { count, error: adminCountError } = await supabaseClient
                    .from('usuarios')
                    .select('*', { count: 'exact', head: true })
                    .contains('role', ['admin'])
                    .eq('ativo', true)

                if (adminCountError) throw new Error(`Erro ao validar admins: ${adminCountError.message}`)
                if ((count ?? 0) <= 1) {
                    throw new Error('Nao e permitido excluir o ultimo administrador ativo')
                }
            }

            const redistribution = await applyManualRedistribution(
                supabaseClient,
                userId,
                Array.isArray(redistributionAssignments) ? (redistributionAssignments as RedistributionAssignment[]) : undefined
            )

            const { error: authDeleteError } = await supabaseClient.auth.admin.deleteUser(userId)
            if (authDeleteError) {
                throw new Error(`Erro Auth: ${authDeleteError.message}`)
            }

            const { error: dbDeleteError } = await supabaseClient
                .from('usuarios')
                .delete()
                .eq('id', userId)

            if (dbDeleteError) {
                throw new Error(`Erro DB: ${dbDeleteError.message}`)
            }

            const message = redistribution.totalReassigned > 0
                ? `Usuario excluido com ${redistribution.totalReassigned} credito(s) redistribuido(s).`
                : 'Usuario excluido com sucesso!'

            return new Response(
                JSON.stringify({
                    success: true,
                    message,
                    redistribution,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        throw new Error(`Acao desconhecida: ${action}`)
    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: toErrorMessage(error) }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    }
})
