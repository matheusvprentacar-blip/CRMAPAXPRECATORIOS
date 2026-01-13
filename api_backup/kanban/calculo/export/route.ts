
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

    // Verificar se é operador de cálculo ou admin
    const { data: userData } = await supabase.auth.getUser()
    const userRole = userData.user?.app_metadata?.role

    if (!['operador_calculo', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Sem permissão. Apenas operadores de cálculo podem exportar cálculos.' },
        { status: 403 }
      )
    }

    // Obter dados do body
    const {
      precatorio_id,
      data_base,
      valor_atualizado,
      saldo_liquido,
      premissas_json,
      premissas_resumo,
      arquivo_pdf_url
    } = await request.json()
    
    if (!precatorio_id || !data_base || !valor_atualizado || !saldo_liquido) {
      return NextResponse.json(
        { error: 'precatorio_id, data_base, valor_atualizado e saldo_liquido são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar precatório atual
    const { data: precatorio, error: fetchError } = await supabase
      .from('precatorios')
      .select('id, status_kanban, calculo_ultima_versao, titulo')
      .eq('id', precatorio_id)
      .single()

    if (fetchError || !precatorio) {
      return NextResponse.json(
        { error: 'Precatório não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se está em coluna que permite exportar cálculo
    const colunasPermitidas = [
      'calculo_andamento',
      'analise_juridica',
      'recalculo_pos_juridico'
    ]

    if (!colunasPermitidas.includes(precatorio.status_kanban)) {
      return NextResponse.json(
        { 
          error: 'Precatório não está em coluna que permite exportar cálculo',
          coluna_atual: precatorio.status_kanban
        },
        { status: 400 }
      )
    }

    // Calcular nova versão
    const novaVersao = (precatorio.calculo_ultima_versao || 0) + 1

    // 1. Criar registro na tabela precatorio_calculos (histórico)
    const { data: calculoCriado, error: calculoError } = await supabase
      .from('precatorio_calculos')
      .insert({
        precatorio_id: precatorio_id,
        versao: novaVersao,
        data_base: data_base,
        valor_atualizado: valor_atualizado,
        saldo_liquido: saldo_liquido,
        premissas_json: premissas_json || null,
        premissas_resumo: premissas_resumo || null,
        arquivo_pdf_url: arquivo_pdf_url || null,
        created_by: user.id
      })
      .select()
      .single()

    if (calculoError) {
      console.error('[Export Calculo] Erro ao criar histórico:', calculoError)
      return NextResponse.json(
        { error: 'Erro ao salvar histórico do cálculo', details: calculoError.message },
        { status: 500 }
      )
    }

    // 2. Atualizar campos do precatório (exportar para o card)
    const { data: precatorioAtualizado, error: updateError } = await supabase
      .from('precatorios')
      .update({
        data_base_calculo: data_base,
        valor_atualizado: valor_atualizado,
        saldo_liquido: saldo_liquido,
        premissas_calculo_resumo: premissas_resumo || null,
        calculo_pdf_url: arquivo_pdf_url || null,
        calculo_ultima_versao: novaVersao,
        calculo_desatualizado: false,
        status_kanban: 'calculo_concluido', // Move automaticamente para concluído
        updated_at: new Date().toISOString()
      })
      .eq('id', precatorio_id)
      .select()
      .single()

    if (updateError) {
      console.error('[Export Calculo] Erro ao atualizar precatório:', updateError)
      return NextResponse.json(
        { error: 'Erro ao exportar cálculo para o card', details: updateError.message },
        { status: 500 }
      )
    }

    // 3. Criar auditoria
    await supabase
      .from('precatorio_auditoria')
      .insert({
        precatorio_id: precatorio_id,
        acao: 'CONCLUIR_CALCULO',
        de: precatorio.status_kanban,
        para: 'calculo_concluido',
        payload_json: {
          versao: novaVersao,
          valor_atualizado: valor_atualizado,
          saldo_liquido: saldo_liquido,
          data_base: data_base
        },
        user_id: user.id
      })

    return NextResponse.json({
      success: true,
      mensagem: `Cálculo exportado com sucesso (versão ${novaVersao})`,
      versao: novaVersao,
      calculo: calculoCriado,
      precatorio: precatorioAtualizado
    })

  } catch (error) {
    console.error('[Export Calculo] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao exportar cálculo' },
      { status: 500 }
    )
  }
}

// GET: Obter histórico de cálculos de um precatório
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

    // Obter precatorio_id da query string
    const { searchParams } = new URL(request.url)
    const precatorio_id = searchParams.get('precatorio_id')

    if (!precatorio_id) {
      return NextResponse.json(
        { error: 'precatorio_id é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar histórico de cálculos
    const { data: calculos, error: fetchError } = await supabase
      .from('precatorio_calculos')
      .select(`
        id,
        versao,
        data_base,
        valor_atualizado,
        saldo_liquido,
        premissas_json,
        premissas_resumo,
        arquivo_pdf_url,
        created_by,
        created_at
      `)
      .eq('precatorio_id', precatorio_id)
      .order('versao', { ascending: false })

    if (fetchError) {
      console.error('[Get Calculos] Erro:', fetchError)
      return NextResponse.json(
        { error: 'Erro ao buscar histórico de cálculos' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      calculos: calculos || [],
      total_versoes: (calculos || []).length
    })

  } catch (error) {
    console.error('[Get Calculos] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar histórico' },
      { status: 500 }
    )
  }
}
