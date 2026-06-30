-- 021_numero_solicitacao_por_tenant.sql
-- 011_add_numero_solicitacao.sql pretendia "sequencial por tenant" (ver
-- comentário original), mas implementou um SERIAL global — com mais de um
-- tenant, o número da solicitação vaza volume aproximado de pedidos entre
-- tenants concorrentes. Corrige sem renumerar o histórico existente: só
-- novas inserções passam a usar contador por tenant.

CREATE TABLE IF NOT EXISTS solicitacao_contadores (
  tenant_id     uuid PRIMARY KEY REFERENCES tenants(id),
  ultimo_numero integer NOT NULL DEFAULT 0
);

ALTER TABLE solicitacao_contadores ENABLE ROW LEVEL SECURITY;
-- Sem políticas públicas: gerenciado apenas pelo trigger (SECURITY DEFINER).

-- Inicializa o contador de cada tenant com o maior número já usado, para
-- que a sequência por tenant continue de onde o SERIAL global parou.
INSERT INTO solicitacao_contadores (tenant_id, ultimo_numero)
SELECT tenant_id, COALESCE(MAX(numero), 0)
FROM solicitacoes
GROUP BY tenant_id
ON CONFLICT (tenant_id) DO UPDATE SET ultimo_numero = GREATEST(
  solicitacao_contadores.ultimo_numero, EXCLUDED.ultimo_numero
);

CREATE OR REPLACE FUNCTION fn_atribuir_numero_solicitacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_num integer;
BEGIN
  INSERT INTO solicitacao_contadores (tenant_id, ultimo_numero)
  VALUES (NEW.tenant_id, 1)
  ON CONFLICT (tenant_id) DO UPDATE
    SET ultimo_numero = solicitacao_contadores.ultimo_numero + 1
  RETURNING ultimo_numero INTO v_num;

  NEW.numero := v_num;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_numero_por_tenant ON solicitacoes;
CREATE TRIGGER trg_numero_por_tenant
  BEFORE INSERT ON solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION fn_atribuir_numero_solicitacao();

-- A unicidade global de numero não faz mais sentido — passa a ser por tenant.
DROP INDEX IF EXISTS idx_solicitacoes_numero;
CREATE UNIQUE INDEX IF NOT EXISTS idx_solicitacoes_tenant_numero
  ON solicitacoes (tenant_id, numero);
