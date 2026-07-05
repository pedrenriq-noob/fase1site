// =============================================================================
// locacao-status.js — máquina de estados da Locação (tabela solicitacoes)
// =============================================================================
// Espelha as regras de sql/008_triggers.sql (fn_validar_transicao_status,
// aplicada como trigger BEFORE UPDATE OF status) e a evolução aplicada em
// produção (migration fix_trigger_solicitada_to_confirmada). Confirmado
// contra a definição real em produção via pg_get_functiondef em 2026-07-02.
//
// Por que isto existe separado: essa máquina de estados já divergiu de
// verdade entre SQL e UI (hotfix "permite transicao direta solicitada →
// confirmada"). O SQL continua sendo o enforcement (nada passa sem ele);
// este arquivo é a fonte única do lado JS, testada em
// tests/locacao-status.test.js contra o mesmo contrato do trigger.
//
// Mudou a regra? Atualize os DOIS lados: sql/0XX_nova_migration.sql
// (nova migration, RM-01: migrations são imutáveis) e este arquivo.
// =============================================================================

/** @type {Record<string, string[]>} próximos status permitidos a partir de cada status atual (inclui o próprio, sem-mudança sempre é permitido) */
export const TRANSICOES = {
  solicitada: ['solicitada', 'em_analise', 'confirmada', 'cancelada'],
  em_analise: ['em_analise', 'confirmada', 'cancelada'],
  confirmada: ['confirmada', 'concluida', 'cancelada'],
  concluida:  ['concluida'],
  cancelada:  ['cancelada'],
}

/** Estados finais: o trigger rejeita qualquer UPDATE de status a partir daqui. */
export const ESTADOS_FINAIS = ['concluida', 'cancelada']

/**
 * Status para os quais é possível transicionar a partir do status atual
 * (usado para popular os `<select>` de mudança de status na UI).
 * @param {string} statusAtual
 * @returns {string[]}
 */
export function transicoesPossiveis(statusAtual) {
  return TRANSICOES[statusAtual] ?? [statusAtual]
}

/**
 * Réplica em JS do predicado de validação do trigger SQL — usada só para
 * feedback imediato na UI. A validação real e definitiva é sempre o
 * trigger (RB-04: sem lógica de negócio crítica só no cliente).
 * @param {string} de status atual
 * @param {string} para novo status
 * @returns {boolean}
 */
export function transicaoValida(de, para) {
  if (de === para) return true
  if (ESTADOS_FINAIS.includes(de)) return false
  return (TRANSICOES[de] ?? []).includes(para)
}
