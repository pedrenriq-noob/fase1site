-- 032_fix_delete_solicitacao_sync_frota.sql
--
-- Bug encontrado ao testar sql/027 de ponta a ponta (2026-07-07): a FK
-- frota_reservas.solicitacao_id -> solicitacoes.id não tinha ON DELETE
-- SET NULL (ficava NO ACTION, o default). Isso significa que DELETE FROM
-- solicitacoes de uma linha já sincronizada falhava com violação de FK
-- ANTES do trigger trg_solicitacoes_sync_frota_delete (AFTER DELETE) ter
-- chance de rodar — o comportamento documentado em sql/027 ("DELETE da
-- solicitação: marca frota_reservas como CANCELADO, libera o veículo")
-- nunca foi de fato executável.
--
-- Não foi notado até agora porque apps/intake-admin não tem UI de exclusão
-- de solicitações hoje (confirmado por grep) — caminho morto na prática,
-- mas documentado como comportamento esperado do trigger, então corrigido
-- aqui antes que alguém dependa dele.
--
-- Correção: FK passa a ON DELETE SET NULL (permite a exclusão em vez de
-- bloquear), e o trigger de exclusão passa a ser BEFORE DELETE (não AFTER)
-- para cancelar o status de frota_reservas enquanto solicitacao_id ainda
-- aponta para a linha sendo excluída — depois disso a exclusão prossegue e
-- a FK apenas desvincula (SET NULL), sem apagar o histórico de frota_reservas.

ALTER TABLE frota_reservas
  DROP CONSTRAINT IF EXISTS frota_reservas_solicitacao_id_fkey,
  ADD CONSTRAINT frota_reservas_solicitacao_id_fkey
    FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS trg_solicitacoes_sync_frota_delete ON solicitacoes;
CREATE TRIGGER trg_solicitacoes_sync_frota_delete
  BEFORE DELETE ON solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION fn_sincronizar_frota_reserva();
