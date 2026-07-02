// =============================================================================
// pricing.js — FONTE CANÔNICA das regras de precificação da Igufoz Platform
// =============================================================================
// JavaScript puro, sem I/O e sem dependências: importável pelo Deno (edge
// functions), pelo Node (testes em tests/pricing.test.js) e por browsers
// (ES module), sem passo de build.
//
// Cópias históricas desta lógica ainda existem em:
//   - apps/site/script.js            (calcDias, getPreco, calcSubtotal)
//   - apps/intake-admin/pages/reservas.js (calcDias)
//   - extensions/cotacao-rapida/sidebar.js (getDias, getPreco)
// Plano de migração (docs/governance/): cada consumidor passa a importar
// daqui, um por commit. Até lá, QUALQUER mudança de regra deve ser aplicada
// aqui primeiro e replicada nas cópias.
// =============================================================================

/**
 * Calcula o número de diárias entre retirada e devolução.
 *
 * Regra de negócio (tolerância de horas no último dia):
 *   - resto ≤ 1h  → não cobra fração (mínimo 1 diária)
 *   - resto > 4h  → cobra 1 diária inteira extra
 *   - 1h < resto ≤ 4h → cobra fração em quartos de diária
 *
 * @param {string|Date} retirada  data/hora de retirada
 * @param {string|Date} devolucao data/hora de devolução
 * @returns {number} diárias (0 se período inválido)
 */
export function calcDias(retirada, devolucao) {
  const ret = retirada instanceof Date ? retirada : new Date(retirada)
  const dev = devolucao instanceof Date ? devolucao : new Date(devolucao)
  const diffH = (dev.getTime() - ret.getTime()) / 3600000
  if (!isFinite(diffH) || diffH <= 0) return 0
  const full = Math.floor(diffH / 24)
  const resto = diffH % 24
  if (resto <= 1) return Math.max(1, full)
  if (resto > 4) return full + 1
  return full + Math.floor(resto * 2) / 8
}

/**
 * Preço da diária de uma categoria considerando sazonalidade.
 * Usa o primeiro período de sazonalidade que contém a data de retirada e
 * tem preço definido para o slug; senão, o preço base da categoria.
 *
 * @param {{slug: string, preco_diaria: number|string}} categoria
 * @param {string} dataRetirada 'YYYY-MM-DD'
 * @param {Array<{data_inicio: string, data_fim: string, precos: Object}>} sazonalidades
 * @returns {number}
 */
export function precoDiariaComSazonalidade(categoria, dataRetirada, sazonalidades) {
  if (dataRetirada) {
    for (const p of sazonalidades ?? []) {
      if (dataRetirada >= p.data_inicio && dataRetirada <= p.data_fim) {
        const pr = (p.precos ?? {})[categoria.slug]
        if (pr != null) return Number(pr)
      }
    }
  }
  return Number(categoria.preco_diaria)
}

/**
 * Subtotal de um item (proteção ou adicional).
 * 'per_day' multiplica pelas diárias; qualquer outro tipo é valor fixo.
 *
 * @param {'per_day'|string} tipoPreco
 * @param {number|string} preco unitário
 * @param {number} quantidade
 * @param {number} dias
 * @returns {number}
 */
export function calcSubtotal(tipoPreco, preco, quantidade, dias) {
  const base = Number(preco) * quantidade
  return tipoPreco === 'per_day' ? base * dias : base
}
