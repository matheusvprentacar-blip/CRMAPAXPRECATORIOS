-- Corrigir a função adicionar_item_customizado para aceitar validade e arquivo_url
-- Motivo: Erro ao tentar salvar certidões com esses campos no Insert
-- v3: Removido referência à coluna "ordem" E "obrigatorio" que não existem na tabela
-- v3: Ajustado tipo de p_validade para DATE para bater com a tabela

DROP FUNCTION IF EXISTS adicionar_item_customizado;

CREATE OR REPLACE FUNCTION adicionar_item_customizado(
    p_precatorio_id UUID,
    p_tipo_grupo TEXT,
    p_nome_item TEXT,
    p_observacao TEXT DEFAULT NULL,
    p_validade DATE DEFAULT NULL,
    p_arquivo_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item_id UUID;
BEGIN
    -- Inserir o novo item
    -- Removidas colunas 'ordem' e 'obrigatorio' que não existem na tabela original
    INSERT INTO precatorio_itens (
        precatorio_id,
        tipo_grupo,
        nome_item,
        status_item,
        observacao,
        validade,
        arquivo_url
    ) VALUES (
        p_precatorio_id,
        p_tipo_grupo,
        p_nome_item,
        'PENDENTE', -- Status inicial padrão
        p_observacao,
        p_validade,
        p_arquivo_url
    )
    RETURNING id INTO v_item_id;

    RETURN v_item_id;
END;
$$;
