BEGIN;

ALTER TABLE public.usuarios
DROP CONSTRAINT IF EXISTS valid_roles_array;

ALTER TABLE public.usuarios
ADD CONSTRAINT valid_roles_array
CHECK (
  role <@ ARRAY[
    'admin'::TEXT,
    'tecnico_ti'::TEXT,
    'operador_comercial'::TEXT,
    'operador_calculo'::TEXT,
    'operador'::TEXT,
    'analista'::TEXT,
    'analista_processual'::TEXT,
    'gestor'::TEXT,
    'gestor_certidoes'::TEXT,
    'gestor_oficio'::TEXT,
    'gestor_escrituras'::TEXT,
    'juridico'::TEXT,
    'financeiro'::TEXT
  ]
);

COMMIT;
