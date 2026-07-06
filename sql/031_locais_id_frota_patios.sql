-- 031_locais_id_frota_patios.sql
-- Vincula frota_patios (pátios internos do frota-ops) a locais (horários de
-- funcionamento, hoje só usados pelo site público de cotação).
--
-- Contexto: a Regra 5 da funcionalidade de Ociosidade (2026-07-06) exige
-- respeitar o horário de funcionamento real da empresa ao considerar uma
-- oportunidade de locação curta. Os nomes cadastrados em frota_patios
-- (ex: "Oklahoma", "Garagem", "Lavador") não correspondem aos nomes em
-- locais (ex: "Av. Brasil, 90 — Centro") — não há como inferir esse
-- vínculo automaticamente a partir dos dados existentes.
--
-- Esta migration só cria a coluna, nullable, sem popular nenhum vínculo.
-- Até que um administrador vincule cada pátio ao local correspondente
-- (tela Admin > Pátios), a Regra 5 não terá efeito prático (equivalente a
-- "sem restrição de horário", mesmo comportamento de locais_id/horário NULL).

ALTER TABLE frota_patios
    ADD COLUMN IF NOT EXISTS locais_id uuid REFERENCES locais(id);

CREATE INDEX IF NOT EXISTS idx_frota_patios_locais_id ON frota_patios (locais_id);
