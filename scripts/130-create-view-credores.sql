-- Cria uma view para facilitar a listagem de credores únicos (CRM)
-- Agrupa por CPF/CNPJ (ou Nome se CPF nulo) para evitar duplicatas visuais
-- Traz métricas agregadas como total de precatórios e valor total

CREATE OR REPLACE VIEW view_credores AS
SELECT
    COALESCE(credor_cpf_cnpj, 'SEM_CPF_' || md5(credor_nome)) as id_unico, -- Garante um ID mesmo sem CPF
    credor_nome,
    credor_cpf_cnpj,
    MAX(credor_cidade) as cidade, -- Pega a cidade mais recente/preenchida
    MAX(credor_uf) as uf,
    MAX(credor_telefone) as telefone,
    MAX(credor_email) as email,
    COUNT(id) as total_precatorios,
    SUM(valor_principal) as valor_total_principal,
    MAX(created_at) as ultimo_precatorio_data
FROM
    precatorios
WHERE
    credor_nome IS NOT NULL AND credor_nome != ''
    AND deleted_at IS NULL
GROUP BY
    credor_cpf_cnpj, credor_nome;

-- Comentário para facilitar entendimento
COMMENT ON VIEW view_credores IS 'View consolidada de credores para o módulo CRM, agrupada por CPF/CNPJ';

-- Permissões
GRANT SELECT ON view_credores TO authenticated;
GRANT SELECT ON view_credores TO service_role;
