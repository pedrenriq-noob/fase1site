-- 011_add_numero_solicitacao.sql
-- Adiciona campo numero (sequencial por tenant) à tabela solicitacoes.
-- ATENÇÃO: Se o banco já possui este campo (criado manualmente), este script
-- não fará nada graças ao IF NOT EXISTS.

ALTER TABLE solicitacoes
  ADD COLUMN IF NOT EXISTS numero SERIAL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_solicitacoes_numero ON solicitacoes (numero);
