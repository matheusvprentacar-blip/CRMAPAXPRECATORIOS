-- Script de limpeza completa para recomeçar do zero
-- ⚠️ ATENÇÃO: Este script apaga TODOS os dados!
-- Use apenas se quiser recomeçar do zero

-- Dropar tabelas com CASCADE (remove automaticamente todas policies, triggers, índices, constraints)
DROP TABLE IF EXISTS comentarios CASCADE;
DROP TABLE IF EXISTS atividades CASCADE;
DROP TABLE IF EXISTS precatorios CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Dropar funções com CASCADE
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_user_role() CASCADE;

-- Mensagem de sucesso
SELECT 'Banco de dados limpo com sucesso! Execute agora o script 04-schema-completo-crm.sql' as status;
