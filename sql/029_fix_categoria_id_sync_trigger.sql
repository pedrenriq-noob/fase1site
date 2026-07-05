-- =============================================================================
-- 029 — Corrige fn_sincronizar_frota_reserva para popular categoria_id
-- =============================================================================
-- Achado da Technical Audit de 2026-07-05 (Ação #2): a migration 028 adicionou
-- `categoria_id` a frota_veiculos/frota_reservas e fez backfill histórico, mas
-- o trigger fn_sincronizar_frota_reserva (sql/027) — o caminho PRINCIPAL de
-- criação de reservas ativas, disparado quando uma solicitação é confirmada
-- no site — nunca foi atualizado para também gravar categoria_id. Toda
-- reserva confirmada desde a migration 028 nasce com categoria_id NULL,
-- mesmo a solicitação de origem (NEW.categoria_id) já sabendo essa categoria.
--
-- Confirmado via consulta direta em produção (2026-07-05): nenhuma reserva
-- ativa (PREVISTO/CONFIRMADO) hoje, mas dezenas de reservas CONCLUIDO já
-- carregam esse gap (ex.: categoria 'C' — 263 linhas, apenas 242 com
-- categoria_id).
--
-- Escopo desta migration (decisão do Product Owner, 2026-07-05): fechar a
-- origem do vazamento e o histórico. NÃO altera o algoritmo de disponibilidade
-- (checkDisponibilidade/calcularDisponibilidade) nem a chave usada em suas
-- consultas — isso fica registrado como possível segunda etapa futura,
-- deliberadamente fora do escopo agora.
-- =============================================================================

-- 1. Trigger passa a gravar categoria_id (já disponível em NEW.categoria_id,
--    a mesma solicitação — nenhum lookup adicional necessário).
CREATE OR REPLACE FUNCTION fn_sincronizar_frota_reserva()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_frota_categoria text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE frota_reservas
      SET status = 'CANCELADO', sincronizado_em = now()
      WHERE solicitacao_id = OLD.id AND status IN ('PREVISTO', 'CONFIRMADO');
    RETURN OLD;
  END IF;

  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'confirmada' THEN
    SELECT frota_categoria INTO v_frota_categoria
      FROM categoria_frota_map WHERE categoria_id = NEW.categoria_id;

    IF v_frota_categoria IS NOT NULL THEN
      INSERT INTO frota_reservas (
        tenant_id, categoria, categoria_id, data_saida, data_retorno_prev, cliente,
        ponto_retirada, ponto_retorno, status, solicitacao_id, obs
      ) VALUES (
        NEW.tenant_id, v_frota_categoria, NEW.categoria_id, NEW.data_retirada, NEW.data_devolucao,
        NEW.cliente_nome, NEW.local_retirada, NEW.local_devolucao, 'CONFIRMADO',
        NEW.id, 'Sincronizado automaticamente da solicitação #' || COALESCE(NEW.numero::text, NEW.id::text)
      )
      ON CONFLICT (solicitacao_id) DO UPDATE SET
        categoria          = EXCLUDED.categoria,
        categoria_id       = EXCLUDED.categoria_id,
        data_saida         = EXCLUDED.data_saida,
        data_retorno_prev  = EXCLUDED.data_retorno_prev,
        cliente            = EXCLUDED.cliente,
        ponto_retirada     = EXCLUDED.ponto_retirada,
        ponto_retorno      = EXCLUDED.ponto_retorno,
        status             = 'CONFIRMADO',
        sincronizado_em    = now();
    END IF;

  ELSIF NEW.status = 'concluida' THEN
    UPDATE frota_reservas
      SET status = 'CONCLUIDO', sincronizado_em = now()
      WHERE solicitacao_id = NEW.id AND status IN ('PREVISTO', 'CONFIRMADO');

  ELSIF NEW.status = 'cancelada' THEN
    UPDATE frota_reservas
      SET status = 'CANCELADO', sincronizado_em = now()
      WHERE solicitacao_id = NEW.id AND status IN ('PREVISTO', 'CONFIRMADO');

  END IF;

  RETURN NEW;
END;
$$;

-- 2. Backfill do histórico: mesmo critério da migration 028, reaplicado para
--    cobrir as linhas criadas/atualizadas pelo trigger sem categoria_id desde
--    então. U-UTILITARIO permanece NULL por design (sem entrada em
--    categoria_frota_map).
UPDATE frota_reservas r
SET categoria_id = m.categoria_id
FROM categoria_frota_map m
WHERE r.categoria = m.frota_categoria
  AND r.categoria_id IS NULL;

-- Legado "J-PREMIUM" (mesmo caso especial da migration 028).
UPDATE frota_reservas r
SET categoria_id = m.categoria_id
FROM categoria_frota_map m
WHERE m.frota_categoria = 'J'
  AND r.categoria = 'J-PREMIUM'
  AND r.categoria_id IS NULL;

-- =============================================================================
-- Verificação pós-migration (executar manualmente):
--   SELECT categoria, count(*), count(categoria_id) FROM frota_reservas GROUP BY 1 ORDER BY 1;
-- Esperado: count = count(categoria_id) para toda categoria exceto U-UTILITARIO.
-- =============================================================================
