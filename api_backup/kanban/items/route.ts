import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET: Obter itens de um precatório
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

    // Usar a função do banco para obter itens
    const { data: itens, error: fetchError } = await supabase
      .rpc('obter_itens_precatorio', {
        p_precatorio_id: precatorio_id
      })

    if (fetchError) {
      console.error('[Items Get] Erro:', fetchError)
      return NextResponse.json(
        { error: 'Erro ao buscar itens' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      itens: itens || [],
      total: (itens || []).length
    })

  } catch (error) {
    console.error('[Items Get] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar itens' },
      { status: 500 }
    )
  }
}

// POST: Adicionar item customizado
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
    const { precatorio_id, tipo_grupo, nome_item, observacao } = await request.json()
    
    if (!precatorio_id || !tipo_grupo || !nome_item) {
      return NextResponse.json(
        { error: 'precatorio_id, tipo_grupo e nome_item são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar tipo_grupo
    if (!['DOC_CREDOR', 'CERTIDAO'].includes(tipo_grupo)) {
      return NextResponse.json(
        { error: 'tipo_grupo deve ser DOC_CREDOR ou CERTIDAO' },
        { status: 400 }
      )
    }

    // Usar a função do banco para adicionar item
    const { data: item_id, error: addError } = await supabase
      .rpc('adicionar_item_customizado', {
        p_precatorio_id: precatorio_id,
        p_tipo_grupo: tipo_grupo,
        p_nome_item: nome_item,
        p_observacao: observacao || null
      })

    if (addError) {
      console.error('[Items Post] Erro:', addError)
      return NextResponse.json(
        { error: 'Erro ao adicionar item', details: addError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      mensagem: 'Item adicionado com sucesso',
      item_id: item_id
    })

  } catch (error) {
    console.error('[Items Post] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao adicionar item' },
      { status: 500 }
    )
  }
}

// PUT: Atualizar status de item
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

    // Obter dados do body
    const { item_id, novo_status, validade, observacao, arquivo_url } = await request.json()
    
    if (!item_id || !novo_status) {
      return NextResponse.json(
        { error: 'item_id e novo_status são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar novo_status
    const statusValidos = ['PENDENTE', 'SOLICITADO', 'RECEBIDO', 'INCOMPLETO', 'VENCIDO', 'NAO_APLICAVEL']
    if (!statusValidos.includes(novo_status)) {
      return NextResponse.json(
        { error: `novo_status deve ser um de: ${statusValidos.join(', ')}` },
        { status: 400 }
      )
    }

    // Usar a função do banco para atualizar item
    const { error: updateError } = await supabase
      .rpc('atualizar_status_item', {
        p_item_id: item_id,
        p_novo_status: novo_status,
        p_validade: validade || null,
        p_observacao: observacao || null,
        p_arquivo_url: arquivo_url || null
      })

    if (updateError) {
      console.error('[Items Put] Erro:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar item', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      mensagem: 'Item atualizado com sucesso'
    })

  } catch (error) {
    console.error('[Items Put] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar item' },
      { status: 500 }
    )
  }
}

// DELETE: Remover item customizado
export async function DELETE(request: NextRequest) {
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

    // Obter item_id da query string
    const { searchParams } = new URL(request.url)
    const item_id = searchParams.get('item_id')

    if (!item_id) {
      return NextResponse.json(
        { error: 'item_id é obrigatório' },
        { status: 400 }
      )
    }

    // Deletar item
    const { error: deleteError } = await supabase
      .from('precatorio_itens')
      .delete()
      .eq('id', item_id)

    if (deleteError) {
      console.error('[Items Delete] Erro:', deleteError)
      return NextResponse.json(
        { error: 'Erro ao remover item', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      mensagem: 'Item removido com sucesso'
    })

  } catch (error) {
    console.error('[Items Delete] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao remover item' },
      { status: 500 }
    )
  }
}
