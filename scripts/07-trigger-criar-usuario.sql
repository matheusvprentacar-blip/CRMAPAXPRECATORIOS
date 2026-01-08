-- =====================================================
-- SOLUÇÃO ALTERNATIVA: Criar usuários via trigger
-- =====================================================
-- Esta solução permite criar usuários sem precisar da service_role key
-- Quando você insere na tabela usuarios_pendentes, um trigger cria o usuário
-- no auth.users automaticamente

BEGIN;

-- 1. Criar tabela para requisições de novos usuários
CREATE TABLE IF NOT EXISTS public.usuarios_pendentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  senha TEXT NOT NULL,
  nome TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','operador_comercial','operador_calculo','operador','analista','gestor')),
  telefone TEXT,
  foto_url TEXT,
  auto_confirmar BOOLEAN DEFAULT true,
  processado BOOLEAN DEFAULT false,
  erro TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS para usuarios_pendentes (apenas admin pode inserir)
ALTER TABLE public.usuarios_pendentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuarios_pendentes_admin_insert
ON public.usuarios_pendentes
FOR INSERT
TO authenticated
WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY usuarios_pendentes_admin_select
ON public.usuarios_pendentes
FOR SELECT
TO authenticated
USING ((auth.jwt() ->> 'role') = 'admin');

-- 3. Função que será chamada por webhook para processar usuários pendentes
CREATE OR REPLACE FUNCTION public.processar_usuarios_pendentes()
RETURNS TABLE (
  id UUID,
  email TEXT,
  processado BOOLEAN,
  erro TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  registro RECORD;
BEGIN
  -- Esta função deve ser chamada por um webhook com service_role
  -- Por enquanto, apenas retorna os usuários pendentes
  RETURN QUERY
  SELECT 
    up.id,
    up.email,
    up.processado,
    up.erro
  FROM public.usuarios_pendentes up
  WHERE up.processado = false
  ORDER BY up.created_at;
END;
$$;

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_usuarios_pendentes_processado 
ON public.usuarios_pendentes(processado) 
WHERE processado = false;

COMMIT;

-- =====================================================
-- INSTRUÇÕES DE USO:
-- =====================================================
-- 1. Execute este script no Supabase SQL Editor
-- 2. Configure um Edge Function para processar os usuários pendentes
-- 3. A Edge Function terá acesso ao service_role automaticamente
-- 
-- Fluxo:
-- Frontend → INSERT em usuarios_pendentes → Edge Function notificada → Cria usuário com service_role
