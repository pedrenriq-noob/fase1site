-- 012_add_companhia_aerea.sql
-- Adiciona campo companhia_aerea à tabela solicitacoes.
-- O campo era enviado pelo frontend mas descartado silenciosamente por não existir.

ALTER TABLE solicitacoes
  ADD COLUMN IF NOT EXISTS companhia_aerea text;
