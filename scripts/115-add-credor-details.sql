-- Add Credor address and contact fields
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'precatorios' AND column_name = 'credor_cep') THEN
        ALTER TABLE precatorios ADD COLUMN credor_cep TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'precatorios' AND column_name = 'credor_endereco') THEN
        ALTER TABLE precatorios ADD COLUMN credor_endereco TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'precatorios' AND column_name = 'credor_cidade') THEN
        ALTER TABLE precatorios ADD COLUMN credor_cidade TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'precatorios' AND column_name = 'credor_uf') THEN
        ALTER TABLE precatorios ADD COLUMN credor_uf TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'precatorios' AND column_name = 'credor_telefone') THEN
        ALTER TABLE precatorios ADD COLUMN credor_telefone TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'precatorios' AND column_name = 'credor_email') THEN
        ALTER TABLE precatorios ADD COLUMN credor_email TEXT;
    END IF;
END $$;
