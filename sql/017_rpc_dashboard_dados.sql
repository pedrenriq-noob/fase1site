-- 017_rpc_dashboard_dados.sql
-- Substitui o carregamento de 500 registros no cliente por uma única RPC
-- que retorna KPIs, segmentos e recentes já agregados no banco.

CREATE OR REPLACE FUNCTION dashboard_dados(
  p_tenant_id uuid,
  p_de  timestamptz DEFAULT NULL,
  p_ate timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH reservas AS (
    SELECT
      s.id, s.status, s.valor_estimado, s.criado_em,
      s.cliente_nome, s.numero,
      c.nome  AS cat_nome,
      pr.nome AS prot_nome
    FROM solicitacoes s
    LEFT JOIN categorias c  ON c.id  = s.categoria_id
    LEFT JOIN protecoes  pr ON pr.id = s.protecao_id
    WHERE s.tenant_id = p_tenant_id
      AND (p_de  IS NULL OR s.criado_em >= p_de)
      AND (p_ate IS NULL OR s.criado_em <= p_ate)
  ),
  kpis AS (
    SELECT
      COUNT(*)                                                               AS total,
      COUNT(*) FILTER (WHERE status = 'confirmada')                         AS confirmada,
      COUNT(*) FILTER (WHERE status = 'em_analise')                         AS em_analise,
      COUNT(*) FILTER (WHERE status = 'cancelada')                          AS cancelada,
      COALESCE(SUM(valor_estimado) FILTER (WHERE status <> 'cancelada'), 0) AS faturamento
    FROM reservas
  ),
  cats AS (
    SELECT cat_nome AS nome, COUNT(*) AS qty
    FROM reservas
    WHERE status <> 'cancelada' AND cat_nome IS NOT NULL
    GROUP BY cat_nome ORDER BY qty DESC
  ),
  prots AS (
    SELECT COALESCE(prot_nome, 'Sem proteção') AS nome, COUNT(*) AS qty
    FROM reservas
    WHERE status <> 'cancelada'
    GROUP BY prot_nome ORDER BY qty DESC
  ),
  adds AS (
    SELECT a.nome, SUM(si.quantidade) AS qty
    FROM solicitacao_itens si
    JOIN adicionais   a ON a.id = si.adicional_id
    JOIN solicitacoes s ON s.id = si.solicitacao_id
    WHERE s.tenant_id = p_tenant_id
      AND s.status <> 'cancelada'
      AND (p_de  IS NULL OR s.criado_em >= p_de)
      AND (p_ate IS NULL OR s.criado_em <= p_ate)
    GROUP BY a.nome ORDER BY qty DESC
  ),
  recentes AS (
    SELECT id, numero, status, cliente_nome, valor_estimado, criado_em, cat_nome, prot_nome
    FROM reservas ORDER BY criado_em DESC LIMIT 10
  )
  SELECT jsonb_build_object(
    'kpis',     (SELECT row_to_json(k)           FROM kpis k),
    'cats',     (SELECT jsonb_agg(row_to_json(c)) FROM cats c),
    'prots',    (SELECT jsonb_agg(row_to_json(p)) FROM prots p),
    'adds',     (SELECT jsonb_agg(row_to_json(a)) FROM adds a),
    'recentes', (SELECT jsonb_agg(row_to_json(r)) FROM recentes r)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
