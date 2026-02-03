-- Script 211: campos de observacoes da analise processual
ALTER TABLE public.precatorios
  ADD COLUMN IF NOT EXISTS analise_penhora_valor numeric(15,2),
  ADD COLUMN IF NOT EXISTS analise_penhora_percentual numeric(5,2),
  ADD COLUMN IF NOT EXISTS analise_adiantamento_valor numeric(15,2),
  ADD COLUMN IF NOT EXISTS analise_adiantamento_percentual numeric(5,2),
  ADD COLUMN IF NOT EXISTS analise_honorarios_valor numeric(15,2),
  ADD COLUMN IF NOT EXISTS analise_honorarios_percentual numeric(5,2),
  ADD COLUMN IF NOT EXISTS analise_itcmd boolean;
