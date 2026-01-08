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

    const { extracao_id, campos_selecionados } = await request.json()
    
    if (!extracao_id || !campos_selecionados || !Array.isArray(campos_selecionados)) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    // Buscar extração
    const { data: extracao, error: extracaoError } = await supabase
      .from('precatorio_extracoes')
      .select('*, precatorio_id')
      .eq('id', extracao_id)
      .single()

    if (extracaoError || !extracao) {
      return NextResponse.json(
        { error: 'Extração não encontrada' },
        { status: 404 }
      )
    }

    // Buscar campos selecionados
    const { data: campos, error: camposError } = await supabase
      .from('precatorio_extracao_campos')
      .select('*')
      .in('id', campos_selecionados)

    if (camposError || !campos || campos.length === 0) {
      return NextResponse.json(
        { error: 'Campos não encontrados' },
        { status: 404 }
      )
    }

    // Preparar dados para atualizar no precatório
    const dadosParaAtualizar: any = {}
    const camposAplicados: string[] = []

    for (const campo of campos) {
      dadosParaAtualizar[campo.campo_nome] = campo.campo_valor
      camposAplicados.push(campo.campo_nome)
    }

    // Atualizar precatório
    const { error: updateError } = await supabase
      .from('precatorios')
      .update(dadosParaAtualizar)
      .eq('id', extracao.precatorio_id)

    if (updateError) {
      console.error('[Extract] Erro ao atualizar precatório:', updateError)
      return NextResponse.json(
        { error: 'Erro ao aplicar campos' },
        { status: 500 }
      )
    }

    // Marcar campos como aplicados
    const { error: marcarError } = await supabase
      .from('precatorio_extracao_campos')
      .update({
        aplicado: true,
        aplicado_at: new Date().toISOString(),
      })
      .in('id', campos_selecionados)

    if (marcarError) {
      console.error('[Extract] Erro ao marcar campos:', marcarError)
    }

    // Atualizar extração
    const { error: extracaoUpdateError } = await supabase
      .from('precatorio_extracoes')
      .update({
        status: 'aplicado',
        applied_at: new Date().toISOString(),
        applied_by: user.id,
        campos_aplicados: camposAplicados,
      })
      .eq('id', extracao_id)

    if (extracaoUpdateError) {
      console.error('[Extract] Erro ao atualizar extração:', extracaoUpdateError)
    }

    return NextResponse.json({
      success: true,
      campos_aplicados: camposAplicados.length,
      message: 'Campos aplicados com sucesso',
    })

  } catch (error) {
    console.error('[Extract] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
