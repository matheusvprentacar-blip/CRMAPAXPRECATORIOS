-- Add herdeiro field
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'precatorios' AND column_name = 'herdeiro') THEN
        ALTER TABLE precatorios ADD COLUMN herdeiro TEXT;
    END IF;
END $$;
