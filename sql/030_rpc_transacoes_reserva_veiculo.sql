-- =============================================================================
-- 030 — RPCs transacionais para confirmar saída/retorno de reserva
-- =============================================================================
-- Achado da Technical Audit de 2026-07-05 (Ação #3): apps/frota-ops/pages/
-- reservas.js confirma saída/retorno de uma reserva com duas chamadas
-- supabase.update() sequenciais e independentes — uma em frota_reservas,
-- outra em frota_veiculos. Falha de rede/RLS entre as duas deixa reserva e
-- veículo em estados incompatíveis (ex.: reserva CONFIRMADO com veículo
-- ainda DISPONIVEL, ou reserva CONCLUIDO com veículo preso em LOCADO para
-- sempre).
--
-- Mesmo padrão já usado com sucesso em inserir_solicitacao_completa
-- (sql/023): função SECURITY DEFINER fazendo as duas escritas na mesma
-- transação implícita do corpo PL/pgSQL, com a mesma verificação de
-- autorização (fn_sou_admin() + tenant) que as policies de RLS já exigem
-- para essas tabelas.
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_confirmar_saida_reserva(
  p_reserva_id uuid,
  p_placa      text
)
RETURNS frota_reservas
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid := fn_meu_tenant_id();
  v_reserva   frota_reservas;
BEGIN
  IF NOT fn_sou_admin() THEN
    RAISE EXCEPTION 'Sem permissão para confirmar saída de reserva.';
  END IF;

  UPDATE frota_reservas
    SET status = 'CONFIRMADO', placa_atribuida = p_placa
    WHERE id = p_reserva_id AND tenant_id = v_tenant_id
    RETURNING * INTO v_reserva;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva % não encontrada neste tenant.', p_reserva_id;
  END IF;

  UPDATE frota_veiculos
    SET status = 'LOCADO',
        limpo = true,
        ponto_retirada = v_reserva.ponto_retirada,
        ponto_retorno  = v_reserva.ponto_retorno,
        prev_retorno   = v_reserva.data_retorno_prev,
        updated_at     = now()
    WHERE placa = p_placa AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Veículo de placa % não encontrado neste tenant.', p_placa;
  END IF;

  RETURN v_reserva;
END;
$$;

CREATE OR REPLACE FUNCTION fn_confirmar_retorno_reserva(
  p_reserva_id uuid
)
RETURNS frota_reservas
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid := fn_meu_tenant_id();
  v_reserva   frota_reservas;
BEGIN
  IF NOT fn_sou_admin() THEN
    RAISE EXCEPTION 'Sem permissão para confirmar retorno de reserva.';
  END IF;

  UPDATE frota_reservas
    SET status = 'CONCLUIDO'
    WHERE id = p_reserva_id AND tenant_id = v_tenant_id
    RETURNING * INTO v_reserva;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva % não encontrada neste tenant.', p_reserva_id;
  END IF;

  IF v_reserva.placa_atribuida IS NOT NULL THEN
    UPDATE frota_veiculos
      SET status = 'DEVOLVIDO', limpo = false, updated_at = now()
      WHERE placa = v_reserva.placa_atribuida AND tenant_id = v_tenant_id;
  END IF;

  RETURN v_reserva;
END;
$$;

-- Funções chamadas via RPC pelo cliente autenticado (frota-ops) — não são
-- acessíveis a anon, pois exigem fn_sou_admin() internamente e RPCs do
-- PostgREST já respeitam o mesmo contexto de auth.uid() das policies.
