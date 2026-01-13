-- Add lawyer fields if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'precatorios' AND column_name = 'advogado_oab') THEN
        ALTER TABLE precatorios ADD COLUMN advogado_oab TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'precatorios' AND column_name = 'advogado_telefone') THEN
        ALTER TABLE precatorios ADD COLUMN advogado_telefone TEXT;
    END IF;
    
    -- Ensure esfera_devedor exists (it should, but just in case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'precatorios' AND column_name = 'esfera_devedor') THEN
        ALTER TABLE precatorios ADD COLUMN esfera_devedor TEXT;
    END IF;

    -- Ensure advogado_cpf_cnpj exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'precatorios' AND column_name = 'advogado_cpf_cnpj') THEN
        ALTER TABLE precatorios ADD COLUMN advogado_cpf_cnpj TEXT;
    END IF;
END $$;
