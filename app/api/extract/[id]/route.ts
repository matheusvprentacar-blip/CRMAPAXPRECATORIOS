import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const extracaoId = params.id

    // Buscar extração
    const { data: extracao, error: extracaoError } = await supabase
      .from('precatorio_extracoes')
      .select('*')
      .eq('id', extracaoId)
      .single()

    if (extracaoError) {
      console.error('[Extract] Erro ao buscar extração:', extracaoError)
      return NextResponse.json(
        { error: 'Extração não encontrada' },
        { status: 404 }
      )
    }

    // Buscar campos
    const { data: campos, error: camposError } = await supabase
      .rpc('get_campos_extracao', { p_extracao_id: extracaoId })

    if (camposError) {
      console.error('[Extract] Erro ao buscar campos:', camposError)
    }

    return NextResponse.json({
      extracao,
      campos: campos || [],
    })

  } catch (error) {
    console.error('[Extract] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
