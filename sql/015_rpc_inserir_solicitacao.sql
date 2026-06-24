-- 015_rpc_inserir_solicitacao.sql
-- Garante atomicidade ao inserir solicitação + itens em uma única transação PostgreSQL.
-- Se a inserção dos itens falhar, a solicitação principal também é revertida (rollback automático).

CREATE OR REPLACE FUNCTION inserir_solicitacao_completa(
  p_sol   jsonb,
  p_itens jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id     uuid;
  v_numero integer;
  v_item   jsonb;
BEGIN
  INSERT INTO solicitacoes (
    tenant_id,        categoria_id,     protecao_id,
    cliente_nome,     cliente_email,    cliente_whatsapp,
    cliente_cpf,      estrangeiro,      cliente_doc,
    companhia_aerea,  data_retirada,    data_devolucao,
    local_retirada,   local_devolucao,  valor_estimado,
    pessoas,          numero_voo,       horario_pouso,
    observacoes,      status
  ) VALUES (
    (p_sol->>'tenant_id')::uuid,
    (p_sol->>'categoria_id')::uuid,
    NULLIF(p_sol->>'protecao_id', '')::uuid,
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
