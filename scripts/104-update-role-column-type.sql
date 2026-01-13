-- Migration to convert 'role' column from text to text[] (array)
-- This allows multiple roles per user

DO $$
BEGIN
    -- Check if 'role' column exists and is not already an array
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'usuarios'
        AND column_name = 'role'
        AND data_type = 'text' -- Ensure we only migrate if it's currently text
    ) THEN
        -- Alter table to change column type to text[]
        ALTER TABLE usuarios
        ALTER COLUMN role TYPE text[]
        USING CASE
            WHEN role IS NULL THEN NULL
            ELSE ARRAY[role] -- Convert existing single string values to single-item arrays
        END;

        -- Update default value to be an array if there was one (optional, good practice)
        ALTER TABLE usuarios ALTER COLUMN role SET DEFAULT ARRAY['operador_comercial'];
    END IF;
END $$;
