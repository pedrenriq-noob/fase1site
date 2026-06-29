-- 018_fix_frota_reservas_uq_locacao_numero.sql
-- Substitui índice parcial por constraint única completa em frota_reservas.
--
-- Motivo: o índice parcial (WHERE locacao_numero IS NOT NULL) não é reconhecido
-- pelo PostgreSQL para cláusulas ON CONFLICT sem WHERE correspondente.
-- O Supabase JS client não suporta ON CONFLICT com condição parcial,
-- então o upsert de sincronização falhava com:
-- "there is no unique or exclusion constraint matching the ON CONFLICT specification"
--
-- Comportamento com NULLs: em um UNIQUE constraint do PostgreSQL, NULLs não são
-- considerados iguais entre si — múltiplas linhas com locacao_numero NULL são
-- permitidas (mesmo comportamento do índice parcial anterior).

DROP INDEX IF EXISTS frota_reservas_tenant_locnum_uq;

ALTER TABLE frota_reservas
  ADD CONSTRAINT frota_reservas_tenant_locnum_uq
  UNIQUE (tenant_id, locacao_numero);
