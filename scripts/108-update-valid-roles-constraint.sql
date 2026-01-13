-- Drop the old constraint
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS valid_roles_array;

-- Recreate constraint with ALL new roles
ALTER TABLE usuarios
ADD CONSTRAINT valid_roles_array CHECK (
  role <@ ARRAY[
    'admin',
    'operador_comercial',
    'operador_calculo',
    'operador',
    'analista',
    'gestor',
    'gestor_certidoes',
    'gestor_oficio',
    'juridico'
  ]::text[]
);
