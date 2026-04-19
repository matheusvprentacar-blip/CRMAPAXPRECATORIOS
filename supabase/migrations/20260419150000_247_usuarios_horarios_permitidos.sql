-- Horários permitidos por usuário
-- Estrutura JSONB: { ativo: boolean, dias: { "0": null|{inicio,fim}, ..., "6": null|{inicio,fim} } }
-- Dias: 0=domingo, 1=segunda, 2=terça, 3=quarta, 4=quinta, 5=sexta, 6=sábado
-- null no dia = bloqueado o dia todo; ausente = bloqueado
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS horarios_permitidos JSONB DEFAULT NULL;

COMMENT ON COLUMN usuarios.horarios_permitidos IS
  'Controle de horários de acesso. NULL = sem restrição. '
  'Exemplo: {"ativo":true,"dias":{"1":{"inicio":"08:00","fim":"18:00"},"2":{"inicio":"08:00","fim":"18:00"}}}';
