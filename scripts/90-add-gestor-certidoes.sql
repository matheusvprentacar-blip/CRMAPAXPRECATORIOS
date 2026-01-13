-- Migration: Adicionar Gestor de Certidões
-- Data: 2026-01-11
-- Descrição: Adiciona role gestor_certidoes e campo responsavel_certidoes_id

-- 1. Atualizar constraint CHECK para incluir gestor_certidoes
-- Primeiro, remover constraint existente
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_role_check;

-- Adicionar nova constraint com gestor_certidoes incluído
ALTER TABLE usuarios 
ADD CONSTRAINT usuarios_role_check 
CHECK (role IN ('admin', 'operador_comercial', 'operador_calculo', 'operador', 'analista', 'gestor', 'gestor_certidoes'));

-- 2. Adicionar coluna responsavel_certidoes_id
ALTER TABLE precatorios 
ADD COLUMN IF NOT EXISTS responsavel_certidoes_id UUID REFERENCES usuarios(id);

COMMENT ON COLUMN precatorios.responsavel_certidoes_id IS 'Gestor responsável pelas certidões deste precatório';

-- 3. Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_precatorios_responsavel_certidoes 
ON precatorios(responsavel_certidoes_id);

-- 4. Atualizar RLS Policies para gestor_certidoes

-- Policy de SELECT: gestor_certidoes pode ver precatórios atribuídos a ele
DROP POLICY IF EXISTS "Gestor certidoes pode ver seus precatorios" ON precatorios;
CREATE POLICY "Gestor certidoes pode ver seus precatorios"
ON precatorios FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'gestor_certidoes'
    AND precatorios.responsavel_certidoes_id = auth.uid()
  )
);

-- Policy de UPDATE: gestor_certidoes pode atualizar precatórios atribuídos a ele
DROP POLICY IF EXISTS "Gestor certidoes pode atualizar seus precatorios" ON precatorios;
CREATE POLICY "Gestor certidoes pode atualizar seus precatorios"
ON precatorios FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'gestor_certidoes'
    AND precatorios.responsavel_certidoes_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'gestor_certidoes'
    AND precatorios.responsavel_certidoes_id = auth.uid()
  )
);

-- 5. Atualizar função precatorios_por_role para incluir gestor_certidoes
-- (Será feito em outro script se necessário)

-- 6. Adicionar trigger para timeline quando responsavel_certidoes_id for atribuído
CREATE OR REPLACE FUNCTION registrar_atribuicao_certidoes()
RETURNS TRIGGER AS $$
BEGIN
  -- Se responsavel_certidoes_id foi definido ou alterado
  IF (TG_OP = 'UPDATE' AND NEW.responsavel_certidoes_id IS DISTINCT FROM OLD.responsavel_certidoes_id AND NEW.responsavel_certidoes_id IS NOT NULL) THEN
    INSERT INTO timeline (precatorio_id, user_id, tipo, descricao, created_at)
    VALUES (
      NEW.id,
      NEW.responsavel_certidoes_id,
      'atribuicao_certidoes',
      'Gestor de certidões atribuído ao precatório',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_atribuicao_certidoes ON precatorios;
CREATE TRIGGER trigger_atribuicao_certidoes
AFTER INSERT OR UPDATE ON precatorios
FOR EACH ROW
EXECUTE FUNCTION registrar_atribuicao_certidoes();

-- Migration concluída: Gestor de Certidões implementado
