-- 024_constraint_sazonalidade_e_limpeza_triggers_orfaos.sql
--
-- 1. EXCLUDE constraint impedindo sazonalidades ativas sobrepostas no mesmo
--    tenant — antes a prioridade entre sazonalidades sobrepostas era
--    indeterminada (query usava .limit(1) sem ORDER BY). Confirmado antes de
--    aplicar: 0 sobreposições existentes hoje, constraint é segura.
--
-- 2. Remove as duas funções de trigger órfãs encontradas na auditoria —
--    confirmado via pg_trigger que nenhuma das duas está anexada a
--    nenhuma tabela:
--    - notificar_reserva_trigger(): usava pg_net para chamar a Edge Function
--      notificar-reserva (hoje um stub, Resend removido). Nunca foi
--      encontrada anexada a um trigger ativo.
--    - validar_transicao_status_solicitacao(): duplicata quase idêntica de
--      fn_validar_transicao_status() (essa sim ativa, via
--      trg_solicitacoes_validar_status). Resquício de refatoração anterior.

-- ---------------------------------------------------------------------------
-- 1. Constraint anti-sobreposição de sazonalidade

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE sazonalidade
  ADD CONSTRAINT sazonalidade_sem_sobreposicao
  EXCLUDE USING gist (
    tenant_id WITH =,
    daterange(data_inicio, data_fim, '[]') WITH &&
  )
  WHERE (ativo);

-- ---------------------------------------------------------------------------
-- 2. Remoção de funções órfãs

DROP FUNCTION IF EXISTS notificar_reserva_trigger();
DROP FUNCTION IF EXISTS validar_transicao_status_solicitacao();
