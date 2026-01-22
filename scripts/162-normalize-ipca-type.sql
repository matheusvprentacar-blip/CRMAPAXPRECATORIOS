-- Migration 162: Normalize IPCA Type
-- O diagnóstico mostrou que os dados de IPCA-E foram salvos como 'ipca'.
-- Para o cálculo EC113/136 ser rigoroso, devemos usar 'ipca_e' para a correção monetária/mora desse período.

UPDATE public.economic_indices 
SET type = 'ipca_e' 
WHERE type = 'ipca' 
  AND reference_date < '2022-01-01'; 
-- Restringe a data apenas por segurança, embora o set atual seja todo legado.

-- Garantir que não existam duplicatas após update (caso já existisse algum ipca_e)
-- O Constraint unique vai travar se houver colisão, o que é bom (avisa que já existe).
