-- =============================================================================
-- 028 — FK de categoria em frota_veiculos e frota_reservas
-- =============================================================================
-- Problema: `categoria` é texto livre nas duas tabelas. Já causou bug real
-- (grafias divergentes "J-PREMIUM"/"J - PREMIUM" sumiam do cálculo de
-- disponibilidade). Sem FK, o banco não impede nova divergência.
--
-- Estratégia (aditiva, reversível):
--   1. Nova coluna `categoria_id uuid` NULLABLE + FK para categorias(id).
--   2. Backfill via categoria_frota_map (fonte única slug↔texto, migration 027),
--      com caso especial para o legado "J-PREMIUM" → categoria J.
--   3. Índices para os filtros de disponibilidade.
--
-- Deliberadamente SEM NOT NULL: a categoria U-UTILITARIO é exclusiva de um
-- cliente específico e não existe em `categorias` (não é ofertada ao público);
-- suas linhas ficam com categoria_id NULL por design.
-- A coluna texto `categoria` é mantida (remoção só em fase futura, RM-05,
-- após período de estabilidade com dupla aprovação).
-- =============================================================================

-- 1. Colunas + FK
ALTER TABLE frota_veiculos
  ADD COLUMN IF NOT EXISTS categoria_id uuid REFERENCES categorias(id);

ALTER TABLE frota_reservas
  ADD COLUMN IF NOT EXISTS categoria_id uuid REFERENCES categorias(id);

-- 2. Backfill pelo mapeamento oficial
UPDATE frota_veiculos v
SET categoria_id = m.categoria_id
FROM categoria_frota_map m
WHERE v.categoria = m.frota_categoria
  AND v.categoria_id IS NULL;

UPDATE frota_reservas r
SET categoria_id = m.categoria_id
FROM categoria_frota_map m
WHERE r.categoria = m.frota_categoria
  AND r.categoria_id IS NULL;

-- 2b. Legado "J-PREMIUM" (grafia antiga do bug já corrigido na importação):
-- pertence à categoria J.
UPDATE frota_reservas r
SET categoria_id = m.categoria_id
FROM categoria_frota_map m
WHERE m.frota_categoria = 'J'
  AND r.categoria = 'J-PREMIUM'
  AND r.categoria_id IS NULL;

-- 3. Índices (mesmo padrão dos índices existentes sobre o texto)
CREATE INDEX IF NOT EXISTS idx_frota_veiculos_categoria_id ON frota_veiculos (categoria_id);
CREATE INDEX IF NOT EXISTS idx_frota_reservas_categoria_id ON frota_reservas (categoria_id);

-- =============================================================================
-- Verificação pós-migration (executar manualmente):
--   SELECT categoria, count(*) FROM frota_veiculos  WHERE categoria_id IS NULL GROUP BY 1;
--   SELECT categoria, count(*) FROM frota_reservas  WHERE categoria_id IS NULL GROUP BY 1;
-- Esperado: apenas variantes de U-UTILITARIO (sem linha em categorias).
-- =============================================================================
