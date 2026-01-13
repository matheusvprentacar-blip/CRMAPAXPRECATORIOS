-- Add extended details for Herdeiro
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'precatorios' AND column_name = 'herdeiro_cpf') THEN
        ALTER TABLE precatorios ADD COLUMN herdeiro_cpf TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'precatorios' AND column_name = 'herdeiro_telefone') THEN
        ALTER TABLE precatorios ADD COLUMN herdeiro_telefone TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'precatorios' AND column_name = 'herdeiro_endereco') THEN
        ALTER TABLE precatorios ADD COLUMN herdeiro_endereco TEXT;
    END IF;
END $$;
