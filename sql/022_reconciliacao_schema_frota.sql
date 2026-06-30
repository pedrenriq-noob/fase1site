-- 022_reconciliacao_schema_frota.sql
-- Reconciliação retroativa: frota_veiculos, frota_reservas, frota_patios,
-- frota_movimentacoes existiam em produção desde antes, criadas direto no
-- banco (provavelmente via Supabase Studio), sem nunca virar migration
-- versionada. Esta migration documenta o schema real e é idempotente
-- (segura de reaplicar) — usa IF NOT EXISTS / OR REPLACE / DROP...IF EXISTS
-- em tudo, não deve alterar dados existentes.
--
-- Aproveitada também para corrigir uma falha de RLS encontrada na auditoria:
-- as policies de escrita de frota_veiculos/frota_reservas/frota_patios não
-- exigiam fn_sou_admin() — qualquer usuário autenticado do tenant (mesmo
-- role='cliente') podia escrever via API direta. Agora exigem admin/operador.

-- ---------------------------------------------------------------------------
-- TABELAS

CREATE TABLE IF NOT EXISTS frota_veiculos (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES tenants(id),
  placa                 text NOT NULL UNIQUE,
  categoria             text NOT NULL,
  modelo                text NOT NULL,
  fabricante            text,
  cor                   text,
  status                text NOT NULL DEFAULT 'DISPONIVEL'
                          CHECK (status = ANY (ARRAY['DISPONIVEL','LOCADO','DEVOLVIDO','NO_LAVADOR','MANUTENCAO'])),
  limpo                 boolean NOT NULL DEFAULT true,
  patio_atual           text,
  hora_entrada_lavador  timestamptz,
  prev_retorno          timestamptz,
  ponto_retorno         text,
  ponto_retirada        text,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS frota_reservas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id),
  locacao_numero      text,
  cliente             text,
  categoria           text NOT NULL,
  placa_atribuida     text,
  data_saida          timestamptz NOT NULL,
  data_retorno_prev   timestamptz NOT NULL,
  ponto_retirada      text,
  ponto_retorno       text,
  status              text NOT NULL DEFAULT 'PREVISTO'
                        CHECK (status = ANY (ARRAY['PREVISTO','CONFIRMADO','CONCLUIDO','CANCELADO'])),
  obs                 text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid REFERENCES auth.users(id),
  condutor            text,
  frequencia          text,
  locacao_id_ext      bigint,
  sincronizado_em     timestamptz,
  UNIQUE (tenant_id, locacao_numero)
);

CREATE TABLE IF NOT EXISTS frota_patios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  nome        text NOT NULL,
  tipo        text NOT NULL DEFAULT 'patio'
                CHECK (tipo = ANY (ARRAY['patio','retorno','retirada'])),
  ativo       boolean NOT NULL DEFAULT true,
  ordem       integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nome)
);

CREATE TABLE IF NOT EXISTS frota_movimentacoes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id    uuid NOT NULL REFERENCES frota_veiculos(id) ON DELETE CASCADE,
  tipo          text NOT NULL
                  CHECK (tipo = ANY (ARRAY['SAIDA','RETORNO','PATIO','LIMPEZA','LAVADOR_ENTRADA','LAVADOR_SAIDA','STATUS'])),
  valor_antes   jsonb,
  valor_depois  jsonb,
  obs           text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id)
);

-- ---------------------------------------------------------------------------
-- ÍNDICES

CREATE INDEX IF NOT EXISTS idx_frota_veiculos_status    ON frota_veiculos (status);
CREATE INDEX IF NOT EXISTS idx_frota_veiculos_categoria  ON frota_veiculos (categoria);
CREATE INDEX IF NOT EXISTS idx_frota_veiculos_tenant     ON frota_veiculos (tenant_id);

CREATE INDEX IF NOT EXISTS idx_frota_reservas_tenant     ON frota_reservas (tenant_id);
CREATE INDEX IF NOT EXISTS idx_frota_reservas_categoria  ON frota_reservas (categoria);
CREATE INDEX IF NOT EXISTS idx_frota_reservas_status     ON frota_reservas (status);
CREATE INDEX IF NOT EXISTS idx_frota_reservas_datas      ON frota_reservas (data_saida, data_retorno_prev);
CREATE INDEX IF NOT EXISTS idx_frota_reservas_placa      ON frota_reservas (placa_atribuida);

CREATE INDEX IF NOT EXISTS idx_frota_mov_veiculo  ON frota_movimentacoes (veiculo_id);
CREATE INDEX IF NOT EXISTS idx_frota_mov_tipo     ON frota_movimentacoes (tipo);
CREATE INDEX IF NOT EXISTS idx_frota_mov_created  ON frota_movimentacoes (created_at DESC);

-- ---------------------------------------------------------------------------
-- FUNCTIONS DE TRIGGER

CREATE OR REPLACE FUNCTION fn_frota_veiculos_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_log_frota_movimentacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tipo text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_tipo := CASE
      WHEN NEW.status = 'LOCADO'                                      THEN 'SAIDA'
      WHEN NEW.status = 'DEVOLVIDO'                                   THEN 'RETORNO'
      WHEN NEW.status = 'NO_LAVADOR'                                  THEN 'LAVADOR_ENTRADA'
      WHEN NEW.status = 'DISPONIVEL' AND OLD.status = 'NO_LAVADOR'   THEN 'LAVADOR_SAIDA'
      ELSE 'STATUS'
    END;

    INSERT INTO frota_movimentacoes (veiculo_id, tipo, valor_antes, valor_depois, created_by)
    VALUES (
      NEW.id, v_tipo,
      jsonb_build_object('status', OLD.status, 'limpo', OLD.limpo, 'patio_atual', OLD.patio_atual),
      jsonb_build_object('status', NEW.status, 'limpo', NEW.limpo, 'patio_atual', NEW.patio_atual),
      NEW.updated_by
    );

  ELSIF OLD.patio_atual IS DISTINCT FROM NEW.patio_atual THEN
    INSERT INTO frota_movimentacoes (veiculo_id, tipo, valor_antes, valor_depois, created_by)
    VALUES (
      NEW.id, 'PATIO',
      jsonb_build_object('patio_atual', OLD.patio_atual),
      jsonb_build_object('patio_atual', NEW.patio_atual),
      NEW.updated_by
    );

  ELSIF OLD.limpo IS DISTINCT FROM NEW.limpo THEN
    INSERT INTO frota_movimentacoes (veiculo_id, tipo, valor_antes, valor_depois, created_by)
    VALUES (
      NEW.id, 'LIMPEZA',
      jsonb_build_object('limpo', OLD.limpo),
      jsonb_build_object('limpo', NEW.limpo),
      NEW.updated_by
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_frota_veiculos_updated_at ON frota_veiculos;
CREATE TRIGGER trg_frota_veiculos_updated_at
  BEFORE UPDATE ON frota_veiculos
  FOR EACH ROW
  EXECUTE FUNCTION fn_frota_veiculos_updated_at();

DROP TRIGGER IF EXISTS trg_frota_log_movimentacao ON frota_veiculos;
CREATE TRIGGER trg_frota_log_movimentacao
  AFTER UPDATE ON frota_veiculos
  FOR EACH ROW
  EXECUTE FUNCTION fn_log_frota_movimentacao();

-- ---------------------------------------------------------------------------
-- RLS

ALTER TABLE frota_veiculos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE frota_reservas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE frota_patios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE frota_movimentacoes ENABLE ROW LEVEL SECURITY;

-- frota_veiculos: leitura para qualquer usuário do tenant; escrita só admin/operador
DROP POLICY IF EXISTS frota_veiculos_select ON frota_veiculos;
CREATE POLICY frota_veiculos_select ON frota_veiculos FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS frota_veiculos_insert ON frota_veiculos;
CREATE POLICY frota_veiculos_insert ON frota_veiculos FOR INSERT
  WITH CHECK (fn_sou_admin() AND tenant_id = (SELECT tenant_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS frota_veiculos_update ON frota_veiculos;
CREATE POLICY frota_veiculos_update ON frota_veiculos FOR UPDATE
  USING (fn_sou_admin() AND tenant_id = (SELECT tenant_id FROM usuarios WHERE id = auth.uid()));

-- frota_reservas: leitura para qualquer usuário do tenant; escrita só admin/operador
DROP POLICY IF EXISTS frota_reservas_select ON frota_reservas;
CREATE POLICY frota_reservas_select ON frota_reservas FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS frota_reservas_insert ON frota_reservas;
CREATE POLICY frota_reservas_insert ON frota_reservas FOR INSERT
  WITH CHECK (fn_sou_admin() AND tenant_id = (SELECT tenant_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS frota_reservas_update ON frota_reservas;
CREATE POLICY frota_reservas_update ON frota_reservas FOR UPDATE
  USING (fn_sou_admin() AND tenant_id = (SELECT tenant_id FROM usuarios WHERE id = auth.uid()));

-- frota_patios: leitura para qualquer usuário do tenant; escrita só admin/operador
DROP POLICY IF EXISTS frota_patios_select ON frota_patios;
CREATE POLICY frota_patios_select ON frota_patios FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS frota_patios_insert ON frota_patios;
CREATE POLICY frota_patios_insert ON frota_patios FOR INSERT
  WITH CHECK (fn_sou_admin() AND tenant_id = (SELECT tenant_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS frota_patios_update ON frota_patios;
CREATE POLICY frota_patios_update ON frota_patios FOR UPDATE
  USING (fn_sou_admin() AND tenant_id = (SELECT tenant_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS frota_patios_delete ON frota_patios;
CREATE POLICY frota_patios_delete ON frota_patios FOR DELETE
  USING (fn_sou_admin() AND tenant_id = (SELECT tenant_id FROM usuarios WHERE id = auth.uid()));

-- frota_movimentacoes: log de auditoria — leitura/inserção para qualquer usuário
-- do mesmo tenant do veículo (inserção real só acontece via trigger SECURITY
-- DEFINER, que bypassa RLS como dono da função; policy aqui é só para
-- consultas/inserts manuais eventuais)
DROP POLICY IF EXISTS frota_mov_select ON frota_movimentacoes;
CREATE POLICY frota_mov_select ON frota_movimentacoes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM frota_veiculos v JOIN usuarios u ON u.tenant_id = v.tenant_id
    WHERE v.id = frota_movimentacoes.veiculo_id AND u.id = auth.uid()
  ));

DROP POLICY IF EXISTS frota_mov_insert ON frota_movimentacoes;
CREATE POLICY frota_mov_insert ON frota_movimentacoes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM frota_veiculos v JOIN usuarios u ON u.tenant_id = v.tenant_id
    WHERE v.id = frota_movimentacoes.veiculo_id AND u.id = auth.uid()
  ));
