-- =====================================================
-- SCRIPT 72: Adicionar Campos de Perfil do Usuário
-- =====================================================
-- Descrição: Adiciona campos para perfil completo do usuário
--            - Endereço completo
--            - Cargo e descrição
--            - Preferências (notificações, tema)
-- =====================================================

-- 1. Adicionar campos de endereço
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS cep VARCHAR(9),
ADD COLUMN IF NOT EXISTS endereco TEXT,
ADD COLUMN IF NOT EXISTS numero VARCHAR(20),
ADD COLUMN IF NOT EXISTS complemento TEXT,
ADD COLUMN IF NOT EXISTS bairro VARCHAR(100),
ADD COLUMN IF NOT EXISTS cidade VARCHAR(100),
ADD COLUMN IF NOT EXISTS estado VARCHAR(2);

-- 2. Adicionar campos de cargo/função
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS cargo VARCHAR(100),
ADD COLUMN IF NOT EXISTS descricao_cargo TEXT;

-- 3. Adicionar campos de preferências
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS notificacoes_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS tema VARCHAR(20) DEFAULT 'system'; -- 'light', 'dark', 'system'

-- 4. Adicionar comentários
COMMENT ON COLUMN public.usuarios.cep IS 'CEP do endereço do usuário';
COMMENT ON COLUMN public.usuarios.endereco IS 'Logradouro (rua, avenida, etc)';
COMMENT ON COLUMN public.usuarios.numero IS 'Número do endereço';
COMMENT ON COLUMN public.usuarios.complemento IS 'Complemento do endereço (apto, sala, etc)';
COMMENT ON COLUMN public.usuarios.bairro IS 'Bairro';
COMMENT ON COLUMN public.usuarios.cidade IS 'Cidade';
COMMENT ON COLUMN public.usuarios.estado IS 'Estado (UF)';
COMMENT ON COLUMN public.usuarios.cargo IS 'Cargo/função do usuário';
COMMENT ON COLUMN public.usuarios.descricao_cargo IS 'Descrição detalhada das responsabilidades';
COMMENT ON COLUMN public.usuarios.notificacoes_email IS 'Receber notificações por email';
COMMENT ON COLUMN public.usuarios.tema IS 'Tema preferido (light, dark, system)';

-- 5. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_usuarios_cidade ON public.usuarios(cidade);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON public.usuarios(estado);
CREATE INDEX IF NOT EXISTS idx_usuarios_cargo ON public.usuarios(cargo);

-- =====================================================
-- TESTES
-- =====================================================

-- Teste 1: Verificar se colunas foram criadas
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'usuarios'
  AND column_name IN (
    'cep', 'endereco', 'numero', 'complemento', 
    'bairro', 'cidade', 'estado', 'cargo', 
    'descricao_cargo', 'notificacoes_email', 'tema'
  )
ORDER BY column_name;

-- Teste 2: Verificar índices criados
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'usuarios'
  AND indexname LIKE 'idx_usuarios_%';

-- =====================================================
-- NOTAS
-- =====================================================
-- Estes campos permitem que os usuários completem
-- seu perfil com informações de endereço, cargo e
-- preferências de notificação e tema.
--
-- O campo 'tema' aceita: 'light', 'dark', 'system'
-- O campo 'notificacoes_email' é boolean (true/false)
-- =====================================================
