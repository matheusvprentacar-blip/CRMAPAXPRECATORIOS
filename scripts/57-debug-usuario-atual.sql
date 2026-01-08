-- =====================================================
-- DEBUG: Verificar usuário atual e permissões
-- =====================================================

-- 1. Quem sou eu?
SELECT 
  auth.uid() as meu_id,
  u.nome as meu_nome,
  u.email as meu_email,
  u.role as minha_role
FROM usuarios u
WHERE u.id = auth.uid();

-- 2. Dados do documento que estou tentando deletar
SELECT 
  d.id as documento_id,
  d.enviado_por as documento_enviado_por,
  u1.nome as enviado_por_nome,
  u1.role as enviado_por_role,
  d.precatorio_id,
  p.criado_por as precatorio_criado_por,
  u2.nome as criado_por_nome,
  p.responsavel as precatorio_responsavel,
  u3.nome as responsavel_nome,
  p.responsavel_calculo_id,
  u4.nome as responsavel_calculo_nome
FROM documentos_precatorio d
JOIN precatorios p ON p.id = d.precatorio_id
LEFT JOIN usuarios u1 ON u1.id = d.enviado_por
LEFT JOIN usuarios u2 ON u2.id = p.criado_por
LEFT JOIN usuarios u3 ON u3.id = p.responsavel
LEFT JOIN usuarios u4 ON u4.id = p.responsavel_calculo_id
WHERE d.id = 'bf0f685c-9f2d-476e-856d-20b5e591a06c';

-- 3. Verificar se tenho permissão
SELECT 
  auth.uid() as meu_id,
  -- Sou admin?
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND role = 'admin'
  ) as sou_admin,
  -- Sou quem enviou?
  (SELECT enviado_por FROM documentos_precatorio WHERE id = 'bf0f685c-9f2d-476e-856d-20b5e591a06c') = auth.uid() as sou_quem_enviou,
  -- Tenho acesso ao precatório?
  EXISTS (
    SELECT 1 FROM precatorios p
    JOIN documentos_precatorio d ON d.precatorio_id = p.id
    WHERE d.id = 'bf0f685c-9f2d-476e-856d-20b5e591a06c'
      AND p.deleted_at IS NULL
      AND (
        p.criado_por = auth.uid() OR
        p.responsavel = auth.uid() OR
        p.responsavel_calculo_id = auth.uid()
      )
  ) as tenho_acesso_precatorio;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- Query 1: Mostra quem você é
-- Query 2: Mostra dados do documento e precatório
-- Query 3: Mostra se você tem permissão (deve ter pelo menos 1 TRUE)
-- =====================================================
