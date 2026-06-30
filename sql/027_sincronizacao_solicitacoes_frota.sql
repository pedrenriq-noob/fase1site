-- 027_sincronizacao_solicitacoes_frota.sql
--
-- Achado do usuário: a disponibilidade (checkDisponibilidade) só considera
-- frota_reservas, nunca solicitacoes — uma solicitação confirmada pelo site
-- não reduzia a disponibilidade real até alguém criar manualmente a reserva
-- operacional correspondente. Já documentado como risco no handoff técnico
-- (Parte 10, "Falha humana: operador esquece de criar a frota_reservas").
--
-- Esta migration automatiza a ponte via trigger:
--   - status -> 'confirmada'           : cria/atualiza frota_reservas (CONFIRMADO)
--   - status -> 'concluida'            : marca frota_reservas como CONCLUIDO
--                                         (senão o veículo ficaria "preso"
--                                         como reservado para sempre depois
--                                         da viagem acabar)
--   - status -> 'cancelada'            : marca frota_reservas como CANCELADO
--                                         (libera o veículo)
--   - DELETE da solicitação            : marca frota_reservas como CANCELADO
--                                         (libera o veículo)
--   - status 'solicitada'/'em_analise' : nunca sincroniza
--
-- A tradução categoria->frota usa uma tabela de mapeamento dedicada
-- (categoria_frota_map) em vez de duplicar o SLUG_MAP do TypeScript dentro
-- do trigger SQL — evita reproduzir o mesmo tipo de bug de divergência de
-- grafia já corrigido para o GRUPO J nesta sessão.

-- ---------------------------------------------------------------------------
-- 1. Mapeamento categoria (vendável) -> texto usado em frota_veiculos/frota_reservas

CREATE TABLE IF NOT EXISTS categoria_frota_map (
  categoria_id    uuid PRIMARY KEY REFERENCES categorias(id),
  frota_categoria text NOT NULL
);

ALTER TABLE categoria_frota_map ENABLE ROW LEVEL SECURITY;
-- Sem políticas públicas: consultada só pelo trigger (SECURITY DEFINER).

INSERT INTO categoria_frota_map (categoria_id, frota_categoria)
SELECT id, CASE slug
  WHEN 'grupo_b' THEN 'B'
  WHEN 'grupo_c' THEN 'C'
  WHEN 'grupo_d' THEN 'D+'
  WHEN 'grupo_e' THEN 'E'
  WHEN 'grupo_f' THEN 'F'
  WHEN 'grupo_g' THEN 'G'
  WHEN 'grupo_h' THEN 'H'
  WHEN 'grupo_i' THEN 'I'
  WHEN 'grupo_j' THEN 'J'
END
FROM categorias
WHERE slug IN ('grupo_b','grupo_c','grupo_d','grupo_e','grupo_f','grupo_g','grupo_h','grupo_i','grupo_j')
ON CONFLICT (categoria_id) DO UPDATE SET frota_categoria = EXCLUDED.frota_categoria;

-- ---------------------------------------------------------------------------
-- 2. Vínculo entre solicitacoes e a reserva operacional sincronizada

ALTER TABLE frota_reservas
  ADD COLUMN IF NOT EXISTS solicitacao_id uuid UNIQUE REFERENCES solicitacoes(id);

-- ---------------------------------------------------------------------------
-- 3. Trigger de sincronização

CREATE OR REPLACE FUNCTION fn_sincronizar_frota_reserva()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_frota_categoria text;
BEGIN
  -- Solicitação excluída: libera o veículo (cancela a reserva vinculada,
  -- não apaga — preserva trilha de auditoria, RSeg-06).
  IF TG_OP = 'DELETE' THEN
    UPDATE frota_reservas
      SET status = 'CANCELADO', sincronizado_em = now()
      WHERE solicitacao_id = OLD.id AND status IN ('PREVISTO', 'CONFIRMADO');
    RETURN OLD;
  END IF;

  -- Sem mudança real de status, nada a fazer.
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'confirmada' THEN
    SELECT frota_categoria INTO v_frota_categoria
      FROM categoria_frota_map WHERE categoria_id = NEW.categoria_id;

    -- Categoria sem mapeamento (ex.: cadastrada depois desta migration e
    -- ainda não adicionada ao mapa) — não sincroniza silenciosamente errado,
    -- só não cria a reserva operacional. Fica visível pelo painel admin.
    IF v_frota_categoria IS NOT NULL THEN
      INSERT INTO frota_reservas (
        tenant_id, categoria, data_saida, data_retorno_prev, cliente,
        ponto_retirada, ponto_retorno, status, solicitacao_id, obs
      ) VALUES (
        NEW.tenant_id, v_frota_categoria, NEW.data_retirada, NEW.data_devolucao,
        NEW.cliente_nome, NEW.local_retirada, NEW.local_devolucao, 'CONFIRMADO',
        NEW.id, 'Sincronizado automaticamente da solicitação #' || COALESCE(NEW.numero::text, NEW.id::text)
      )
      ON CONFLICT (solicitacao_id) DO UPDATE SET
        categoria          = EXCLUDED.categoria,
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

  -- 'solicitada' e 'em_analise': nunca sincroniza (nenhuma ação).
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_solicitacoes_sync_frota ON solicitacoes;
CREATE TRIGGER trg_solicitacoes_sync_frota
  AFTER UPDATE OF status ON solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION fn_sincronizar_frota_reserva();

DROP TRIGGER IF EXISTS trg_solicitacoes_sync_frota_delete ON solicitacoes;
CREATE TRIGGER trg_solicitacoes_sync_frota_delete
  AFTER DELETE ON solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION fn_sincronizar_frota_reserva();
