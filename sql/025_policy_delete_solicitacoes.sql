-- 025_policy_delete_solicitacoes.sql
--
-- Bug real reportado pelo usuário: excluir uma solicitação no
-- apps/intake-admin "funciona" (sem erro, some da tela), mas reaparece ao
-- recarregar. Causa: a tabela solicitacoes tinha RLS habilitado mas
-- NENHUMA policy de DELETE — com RLS ativo, um DELETE que não casa com
-- nenhuma policy simplesmente afeta 0 linhas, sem lançar erro. O código do
-- admin (excluirReserva em pages/reservas.js) só checa `error`, não a
-- contagem de linhas afetadas, então tratava isso como sucesso.

CREATE POLICY "solicitacoes: admin exclui"
  ON solicitacoes FOR DELETE
  USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());
