import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// POST: Enviar para análise jurídica
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase não configurado' },
        { status: 500 }
      )
    }
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar se é operador de cálculo ou admin
    const { data: userData } = await supabase.auth.getUser()
    const userRole = userData.user?.app_metadata?.role

    if (!['operador_calculo', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Sem permissão. Apenas operadores de cálculo podem solicitar análise jurídica.' },
        { status: 403 }
      )
    }

    // Obter dados do body
    const { precatorio_id, motivo, descricao_bloqueio } = await request.json()
    
    if (!precatorio_id || !motivo || !descricao_bloqueio) {
      return NextResponse.json(
        { error: 'precatorio_id, motivo e descricao_bloqueio são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar motivo
    const motivosValidos = ['PENHORA', 'CESSAO', 'HONORARIOS', 'HABILITACAO', 'DUVIDA_BASE_INDICE', 'OUTROS']
    if (!motivosValidos.includes(motivo)) {
      return NextResponse.json(
        { error: `motivo deve ser um de: ${motivosValidos.join(', ')}` },
        { status: 400 }
      )
    }

    // Buscar precatório atual
    const { data: precatorio, error: fetchError } = await supabase
      .from('precatorios')
      .select('id, status_kanban, titulo')
      .eq('id', precatorio_id)
      .single()

    if (fetchError || !precatorio) {
      return NextResponse.json(
        { error: 'Precatório não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se está em coluna que permite enviar para jurídico
    if (precatorio.status_kanban !== 'calculo_andamento') {
      return NextResponse.json(
        { 
          error: 'Precatório deve estar em "Cálculo em andamento" para enviar ao jurídico',
          coluna_atual: precatorio.status_kanban
        },
        { status: 400 }
      )
    }

    // Atualizar precatório
    const { data: updated, error: updateError } = await supabase
      .from('precatorios')
      .update({
        status_kanban: 'analise_juridica',
        juridico_motivo: motivo,
        juridico_descricao_bloqueio: descricao_bloqueio,
        juridico_parecer_status: null, // Limpar parecer anterior
        juridico_parecer_texto: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', precatorio_id)
      .select()
      .single()

    if (updateError) {
      console.error('[Juridico Post] Erro ao atualizar:', updateError)
      return NextResponse.json(
        { error: 'Erro ao enviar para análise jurídica', details: updateError.message },
        { status: 500 }
      )
    }

    // Auditoria já é criada automaticamente pelo trigger

    return NextResponse.json({
      success: true,
      mensagem: 'Precatório enviado para análise jurídica',
      precatorio: updated
    })

  } catch (error) {
    console.error('[Juridico Post] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao enviar para análise jurídica' },
      { status: 500 }
    )
  }
}

// PUT: Salvar parecer jurídico
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase não configurado' },
        { status: 500 }
      )
    }
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar se é jurídico ou admin
    const { data: userData } = await supabase.auth.getUser()
    const userRole = userData.user?.app_metadata?.role

    if (!['juridico', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Sem permissão. Apenas usuários do jurídico podem dar parecer.' },
        { status: 403 }
      )
    }

    // Obter dados do body
    const { precatorio_id, parecer_status, parecer_texto } = await request.json()
    
    if (!precatorio_id || !parecer_status || !parecer_texto) {
      return NextResponse.json(
        { error: 'precatorio_id, parecer_status e parecer_texto são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar parecer_status
    const statusValidos = ['APROVADO', 'AJUSTAR_DADOS', 'IMPEDIMENTO', 'RISCO_ALTO']
    if (!statusValidos.includes(parecer_status)) {
      return NextResponse.json(
        { error: `parecer_status deve ser um de: ${statusValidos.join(', ')}` },
        { status: 400 }
      )
    }

    // Buscar precatório atual
    const { data: precatorio, error: fetchError } = await supabase
      .from('precatorios')
      .select('id, status_kanban, titulo')
      .eq('id', precatorio_id)
      .single()

    if (fetchError || !precatorio) {
      return NextResponse.json(
        { error: 'Precatório não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se está em análise jurídica
    if (precatorio.status_kanban !== 'analise_juridica') {
      return NextResponse.json(
        { 
          error: 'Precatório não está em análise jurídica',
          coluna_atual: precatorio.status_kanban
        },
        { status: 400 }
      )
    }

    // Determinar próxima coluna baseado no parecer
    let proximaColuna = 'recalculo_pos_juridico'
    
    // Se for impedimento, pode ir para fechado
    if (parecer_status === 'IMPEDIMENTO') {
      proximaColuna = 'analise_juridica' // Mantém na mesma coluna, usuário decide se fecha
    }

    // Atualizar precatório
    const { data: updated, error: updateError } = await supabase
      .from('precatorios')
      .update({
        juridico_parecer_status: parecer_status,
        juridico_parecer_texto: parecer_texto,
        status_kanban: proximaColuna,
        updated_at: new Date().toISOString()
      })
      .eq('id', precatorio_id)
      .select()
      .single()

    if (updateError) {
      console.error('[Juridico Put] Erro ao atualizar:', updateError)
      return NextResponse.json(
        { error: 'Erro ao salvar parecer', details: updateError.message },
        { status: 500 }
      )
    }

    // Auditoria já é criada automaticamente pelo trigger

    return NextResponse.json({
      success: true,
      mensagem: 'Parecer jurídico salvo com sucesso',
      precatorio: updated,
      proxima_coluna: proximaColuna
    })

  } catch (error) {
    console.error('[Juridico Put] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar parecer' },
      { status: 500 }
    )
  }
}

// GET: Obter precatórios em análise jurídica
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase não configurado' },
        { status: 500 }
      )
    }
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Buscar precatórios em análise jurídica
    const { data: precatorios, error: fetchError } = await supabase
      .from('precatorios')
      .select(`
        id,
        titulo,
        numero_precatorio,
        credor_nome,
        devedor,
        tribunal,
        status_kanban,
        juridico_motivo,
        juridico_descricao_bloqueio,
        juridico_parecer_status,
        juridico_parecer_texto,
        responsavel_calculo_id,
        created_at,
        updated_at
      `)
      .eq('status_kanban', 'analise_juridica')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('[Juridico Get] Erro:', fetchError)
      return NextResponse.json(
        { error: 'Erro ao buscar precatórios' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      precatorios: precatorios || [],
      total: (precatorios || []).length
    })

  } catch (error) {
    console.error('[Juridico Get] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar precatórios' },
      { status: 500 }
    )
  }
}
