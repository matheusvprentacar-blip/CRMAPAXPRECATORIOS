-- Índices para acelerar queries da página de telemetria
-- Query principal: ORDER BY occurred_at DESC, id DESC + filtro .gte("occurred_at", cutoff)
CREATE INDEX IF NOT EXISTS idx_telemetria_uso_occurred_at_desc
  ON telemetria_uso (occurred_at DESC, id DESC);

-- Filtro por usuário + data (para visão por usuário)
CREATE INDEX IF NOT EXISTS idx_telemetria_uso_user_occurred
  ON telemetria_uso (user_id, occurred_at DESC);

-- Agrupamento por sessão
CREATE INDEX IF NOT EXISTS idx_telemetria_uso_session_id
  ON telemetria_uso (session_id);

-- Filtro por tipo de evento
CREATE INDEX IF NOT EXISTS idx_telemetria_uso_event_type
  ON telemetria_uso (event_type);

-- Filtro por origem
CREATE INDEX IF NOT EXISTS idx_telemetria_uso_source
  ON telemetria_uso (source);
