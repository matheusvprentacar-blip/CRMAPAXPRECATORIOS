-- Script 213: campos de itcmd na analise processual
ALTER TABLE public.precatorios
  ADD COLUMN IF NOT EXISTS analise_itcmd_valor numeric(15,2),
  ADD COLUMN IF NOT EXISTS analise_itcmd_percentual numeric(5,2);
