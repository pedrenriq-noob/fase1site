-- 014_solicitacoes_estrangeiro.sql
-- Suporte a solicitantes estrangeiros (sem CPF brasileiro)

ALTER TABLE solicitacoes
  ADD COLUMN IF NOT EXISTS estrangeiro   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cliente_doc   text;  -- Passaporte, RNE, DNI, etc.
