-- Migration: Adicionar Gestor de Ofícios
-- Data: 2026-01-11
-- Descrição: Adiciona role gestor_oficio e campo responsavel_oficio_id

-- 1. Atualizar constraint CHECK para incluir gestor_oficio
-- Primeiro, remover constraint existente
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_role_check;

-- Adicionar nova constraint com gestor_oficio incluído
ALTER TABLE usuarios 
ADD CONSTRAINT usuarios_role_check 
CHECK (role IN ('admin', 'operador_comercial', 'operador_calculo', 'operador', 'analista', 'gestor', 'gestor_certidoes', 'gestor_oficio'));

-- 2. Adicionar coluna responsavel_oficio_id
ALTER TABLE precatorios 
ADD COLUMN IF NOT EXISTS responsavel_oficio_id UUID REFERENCES usuarios(id);

COMMENT ON COLUMN precatorios.responsavel_oficio_id IS 'Gestor responsável pela inclusão de ofício requisitório';

-- 3. Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_precatorios_responsavel_oficio 
ON precatorios(responsavel_oficio_id);

-- 4. Atualizar RLS Policies para gestor_oficio

-- Policy de SELECT: gestor_oficio pode ver precatórios atribuídos a ele
DROP POLICY IF EXISTS "Gestor oficio pode ver seus precatorios" ON precatorios;
CREATE POLICY "Gestor oficio pode ver seus precatorios"
ON precatorios FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'gestor_oficio'
    AND precatorios.responsavel_oficio_id = auth.uid()
  )
);

-- Policy de UPDATE: gestor_oficio pode atualizar precatórios atribuídos a ele
DROP POLICY IF EXISTS "Gestor oficio pode atualizar seus precatorios" ON precatorios;
CREATE POLICY "Gestor oficio pode atualizar seus precatorios"
ON precatorios FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'gestor_oficio'
    AND precatorios.responsavel_oficio_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'gestor_oficio'
    AND precatorios.responsavel_oficio_id = auth.uid()
  )
);

-- 5. Adicionar trigger para timeline quando responsavel_oficio_id for atribuído
CREATE OR REPLACE FUNCTION registrar_atribuicao_oficio()
RETURNS TRIGGER AS $$
BEGIN
  -- Se responsavel_oficio_id foi definido ou alterado
  IF (TG_OP = 'UPDATE' AND NEW.responsavel_oficio_id IS DISTINCT FROM OLD.responsavel_oficio_id AND NEW.responsavel_oficio_id IS NOT NULL) THEN
    INSERT INTO timeline (precatorio_id, user_id, tipo, descricao, created_at)
    VALUES (
      NEW.id,
      NEW.responsavel_oficio_id,
      'atribuicao_oficio',
      'Gestor de ofícios atribuído ao precatório',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_atribuicao_oficio ON precatorios;
CREATE TRIGGER trigger_atribuicao_oficio
AFTER INSERT OR UPDATE ON precatorios
FOR EACH ROW
EXECUTE FUNCTION registrar_atribuicao_oficio();

-- Migration concluída: Gestor de Ofícios implementado
