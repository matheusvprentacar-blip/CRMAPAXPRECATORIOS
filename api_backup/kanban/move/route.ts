import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

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

    // Obter dados do body
    const { precatorio_id, coluna_destino, motivo_fechamento } = await request.json()
    
    if (!precatorio_id || !coluna_destino) {
      return NextResponse.json(
        { error: 'precatorio_id e coluna_destino são obrigatórios' },
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

    // Validar movimentação usando a função do banco
    const { data: validacao, error: validacaoError } = await supabase
      .rpc('validar_movimentacao_kanban', {
        p_precatorio_id: precatorio_id,
        p_coluna_destino: coluna_destino
      })

    if (validacaoError) {
      console.error('[Kanban Move] Erro na validação:', validacaoError)
      return NextResponse.json(
        { error: 'Erro ao validar movimentação', details: validacaoError.message },
        { status: 500 }
      )
    }

    // Verificar se a validação passou
    if (!validacao.valido) {
      return NextResponse.json(
        { 
          error: 'Movimentação bloqueada',
          mensagem: validacao.mensagem,
          detalhes: validacao
        },
        { status: 400 }
      )
    }

    // Se for para "fechado", motivo é obrigatório
    if (coluna_destino === 'fechado' && !motivo_fechamento) {
      return NextResponse.json(
        { error: 'Motivo de fechamento é obrigatório' },
        { status: 400 }
      )
    }

    // Atualizar status do precatório
    const updateData: any = {
      status_kanban: coluna_destino,
      updated_at: new Date().toISOString()
    }

    // Se for fechamento, adicionar motivo
    if (coluna_destino === 'fechado' && motivo_fechamento) {
      updateData.interesse_observacao = motivo_fechamento
    }

    const { data: updated, error: updateError } = await supabase
      .from('precatorios')
      .update(updateData)
      .eq('id', precatorio_id)
      .select()
      .single()

    if (updateError) {
      console.error('[Kanban Move] Erro ao atualizar:', updateError)
      return NextResponse.json(
        { error: 'Erro ao mover precatório', details: updateError.message },
        { status: 500 }
      )
    }

    // Auditoria já é criada automaticamente pelo trigger

    return NextResponse.json({
      success: true,
      mensagem: `Precatório movido para ${coluna_destino}`,
      precatorio: updated,
      validacao: validacao
    })

  } catch (error) {
    console.error('[Kanban Move] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao processar movimentação' },
      { status: 500 }
    )
  }
}

// GET: Obter precatórios por coluna
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

    // Obter coluna da query string
    const { searchParams } = new URL(request.url)
    const coluna = searchParams.get('coluna')

    // Buscar precatórios
    let query = supabase
      .from('precatorios')
      .select(`
        id,
        titulo,
        numero_precatorio,
        credor_nome,
        devedor,
        tribunal,
        status_kanban,
        interesse_status,
        calculo_desatualizado,
        calculo_ultima_versao,
        valor_atualizado,
        saldo_liquido,
        responsavel_calculo_id,
        created_at,
        updated_at
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    // Filtrar por coluna se especificado
    if (coluna) {
      query = query.eq('status_kanban', coluna)
    }

    const { data: precatorios, error: fetchError } = await query

    if (fetchError) {
      console.error('[Kanban Get] Erro:', fetchError)
      return NextResponse.json(
        { error: 'Erro ao buscar precatórios' },
        { status: 500 }
      )
    }

    // Para cada precatório, buscar resumo de itens
    const precatoriosComResumo = await Promise.all(
      (precatorios || []).map(async (p) => {
        const { data: resumo, error: resumoError } = await supabase
          .from('view_resumo_itens_precatorio')
          .select('*')
          .eq('precatorio_id', p.id)
          .single()

        return {
          ...p,
          resumo_itens: resumo || null
        }
      })
    )

    return NextResponse.json({
      success: true,
      precatorios: precatoriosComResumo,
      total: precatoriosComResumo.length
    })

  } catch (error) {
    console.error('[Kanban Get] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar precatórios' },
      { status: 500 }
    )
  }
}
