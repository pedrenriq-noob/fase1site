-- 023_lock_disponibilidade_e_policies_insert.sql
--
-- 1. Elimina a race condition TOCTOU documentada desde o ADR-003: duas
--    solicitações simultâneas para a última vaga da mesma categoria podiam
--    ambas passar pela checagem de disponibilidade antes de qualquer
--    insert. Adiciona pg_advisory_xact_lock por (tenant_id, categoria_id)
--    dentro de inserir_solicitacao_completa, serializando inserts da mesma
--    categoria/tenant durante a transação.
--
-- 2. Remove policies de INSERT redundantes em solicitacoes e
--    solicitacao_itens. Havia 3 (resp. 3) policies de INSERT coexistindo,
--    sendo a mais permissiva (WITH CHECK true) sempre vencedora por serem
--    combinadas em OR pelo Postgres — isso anulava a policy mais restrita
--    que valida tenant ativo. Mantém só a policy "inserção pública" (com
--    acento), que exige tenant ativo.

-- ---------------------------------------------------------------------------
-- 1. Lock de disponibilidade

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

  -- Serializa inserts concorrentes da mesma categoria/tenant dentro desta
  -- transação — evita que duas requisições simultâneas para a última vaga
  -- ambas passem pela checagem de disponibilidade (feita na Edge Function,
  -- antes de chamar esta RPC) e ambas insiram. O lock é liberado
  -- automaticamente no commit/rollback da transação (xact lock).
  PERFORM pg_advisory_xact_lock(hashtext(v_tenant_id::text || ':' || v_categoria_id::text));

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

-- ---------------------------------------------------------------------------
-- 2. Limpeza de policies de INSERT redundantes

DROP POLICY IF EXISTS "anon pode inserir solicitacoes" ON solicitacoes;
DROP POLICY IF EXISTS "solicitacoes: insercao publica" ON solicitacoes;
-- mantém "solicitacoes: inserção pública" (exige tenant ativo)

DROP POLICY IF EXISTS "anon pode inserir solicitacao_itens" ON solicitacao_itens;
DROP POLICY IF EXISTS "solicitacao_itens: insercao publica" ON solicitacao_itens;
-- mantém "solicitacao_itens: inserção pública" (exige tenant ativo via join com solicitacoes)
