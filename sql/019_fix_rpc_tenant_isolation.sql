-- 019_fix_rpc_tenant_isolation.sql
-- Corrige duas falhas de isolamento de tenant encontradas em revisão de segurança:
--
-- 1. dashboard_dados(p_tenant_id, ...) era SECURITY DEFINER e confiava cegamente
--    no p_tenant_id informado pelo chamador — qualquer usuário autenticado podia
--    ler KPIs/faturamento/reservas de outro tenant (IDOR).
-- 2. inserir_solicitacao_completa(p_sol, ...) era SECURITY DEFINER e inseria a
--    solicitação sem revalidar se o tenant_id é ativo nem se categoria_id/
--    protecao_id realmente pertencem a esse tenant — bypassa a validação que
--    hoje só existe na Edge Function (defesa em profundidade ausente).

-- ---------------------------------------------------------------------------
-- 1. dashboard_dados — ignora p_tenant_id informado, usa sempre o tenant do
--    usuário autenticado, e exige que ele seja admin/operador.

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
  v_result    jsonb;
  v_tenant_id uuid;
BEGIN
  IF NOT fn_sou_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas admin/operador.' USING ERRCODE = '42501';
  END IF;

  -- Ignora p_tenant_id do chamador; usa sempre o tenant do usuário autenticado.
  v_tenant_id := fn_meu_tenant_id();

  WITH reservas AS (
    SELECT
      s.id, s.status, s.valor_estimado, s.criado_em,
      s.cliente_nome, s.numero,
      c.nome  AS cat_nome,
      pr.nome AS prot_nome
    FROM solicitacoes s
    LEFT JOIN categorias c  ON c.id  = s.categoria_id
    LEFT JOIN protecoes  pr ON pr.id = s.protecao_id
    WHERE s.tenant_id = v_tenant_id
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
    WHERE s.tenant_id = v_tenant_id
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

-- ---------------------------------------------------------------------------
-- 2. inserir_solicitacao_completa — revalida tenant ativo e que categoria_id/
--    protecao_id pertencem ao tenant_id informado, antes de inserir.

CREATE OR REPLACE FUNCTION inserir_solicitacao_completa(
  p_sol   jsonb,
  p_itens jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id          uuid;
  v_numero      integer;
  v_item        jsonb;
  v_tenant_id   uuid;
  v_categoria_id uuid;
  v_protecao_id  uuid;
BEGIN
  v_tenant_id    := (p_sol->>'tenant_id')::uuid;
  v_categoria_id := (p_sol->>'categoria_id')::uuid;
  v_protecao_id  := NULLIF(p_sol->>'protecao_id', '')::uuid;

  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = v_tenant_id AND ativo = true) THEN
    RAISE EXCEPTION 'Tenant inválido ou inativo.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM categorias
    WHERE id = v_categoria_id AND tenant_id = v_tenant_id AND ativo = true
  ) THEN
    RAISE EXCEPTION 'Categoria inválida para este tenant.' USING ERRCODE = '22023';
  END IF;

  IF v_protecao_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM protecoes
    WHERE id = v_protecao_id AND tenant_id = v_tenant_id AND ativo = true
  ) THEN
    RAISE EXCEPTION 'Proteção inválida para este tenant.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO solicitacoes (
    tenant_id,        categoria_id,     protecao_id,
    cliente_nome,     cliente_email,    cliente_whatsapp,
    cliente_cpf,      estrangeiro,      cliente_doc,
    companhia_aerea,  data_retirada,    data_devolucao,
    local_retirada,   local_devolucao,  valor_estimado,
    pessoas,          numero_voo,       horario_pouso,
    observacoes,      status
  ) VALUES (
    v_tenant_id,
    v_categoria_id,
    v_protecao_id,
    p_sol->>'cliente_nome',
    p_sol->>'cliente_email',
    p_sol->>'cliente_whatsapp',
    NULLIF(p_sol->>'cliente_cpf', ''),
    COALESCE((p_sol->>'estrangeiro')::boolean, false),
    NULLIF(p_sol->>'cliente_doc', ''),
    NULLIF(p_sol->>'companhia_aerea', ''),
    (p_sol->>'data_retirada')::timestamptz,
    (p_sol->>'data_devolucao')::timestamptz,
    p_sol->>'local_retirada',
    p_sol->>'local_devolucao',
    (p_sol->>'valor_estimado')::numeric,
    COALESCE((p_sol->>'pessoas')::integer, 1),
    NULLIF(p_sol->>'numero_voo', ''),
    NULLIF(p_sol->>'horario_pouso', ''),
    NULLIF(p_sol->>'observacoes', ''),
    'solicitada'
  )
  RETURNING id, numero INTO v_id, v_numero;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_itens, '[]'::jsonb))
  LOOP
    INSERT INTO solicitacao_itens (
      solicitacao_id, adicional_id, quantidade, preco_unitario, tipo_preco
    ) VALUES (
      v_id,
      (v_item->>'adicional_id')::uuid,
      (v_item->>'quantidade')::integer,
      (v_item->>'preco_unitario')::numeric,
      v_item->>'tipo_preco'
    );
  END LOOP;

  RETURN jsonb_build_object('id', v_id, 'numero', v_numero);
END;
$$;
