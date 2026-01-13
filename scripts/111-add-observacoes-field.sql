-- Adiciona campos 'observacoes' e 'contatos' na tabela precatorios caso não existam
DO $$
BEGIN
    -- Adicionar 'observacoes'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'precatorios' AND column_name = 'observacoes') THEN
        ALTER TABLE precatorios ADD COLUMN observacoes text;
    END IF;

    -- Adicionar 'contatos'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'precatorios' AND column_name = 'contatos') THEN
        ALTER TABLE precatorios ADD COLUMN contatos text;
    END IF;
END $$;
