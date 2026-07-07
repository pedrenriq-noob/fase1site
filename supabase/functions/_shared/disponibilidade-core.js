// =============================================================================
// disponibilidade-core.js — FONTE CANÔNICA do núcleo de cálculo de disponibilidade
// =============================================================================
// JavaScript puro, sem I/O e sem dependências — mesmo padrão de pricing.js
// (ver ADR-001, ADR-004). Cópia física em apps/frota-ops/js/disponibilidade-core.js,
// garantida por tests/disponibilidade-core-parity.test.js.
//
// Contém só a MATEMÁTICA compartilhada entre as duas superfícies que hoje
// calculam disponibilidade:
//   - supabase/functions/_shared/disponibilidade.ts (Edge Function, busca os
//     dados via Supabase e filtra por categoria antes de chamar este núcleo)
//   - apps/frota-ops/js/utils.js (recebe veiculos/reservas já carregados pela
//     página, filtra por categoria, chama este núcleo, e adiciona por cima o
//     detalhamento por veículo — que não existe na Edge Function, pois o site
//     público só precisa do agregado)
//
// Antes deste módulo, a fórmula (total/ocupados/disponivel/overbooking/alerta)
// estava duplicada manualmente nos dois arquivos — o mesmo tipo de risco de
// divergência silenciosa que motivou consolidar o mapeamento categoria→frota
// (ver categoria_frota_map, sql/027).
// =============================================================================

/**
 * Filtra reservas que se sobrepõem ao período consultado.
 * @param {Array<{data_saida: string, data_retorno_prev: string}>} reservas
 * @param {Date} inicio
 * @param {Date} fim
 * @returns {Array}
 */
export function filtrarReservasNoPeriodo(reservas, inicio, fim) {
  return reservas.filter((r) => {
    const rSaida = new Date(r.data_saida)
    const rRetorno = new Date(r.data_retorno_prev)
    return rSaida < fim && rRetorno > inicio
  })
}

/**
 * Núcleo puro do cálculo: dado o total de veículos da categoria e as reservas
 * já filtradas para o período, decide disponibilidade/overbooking/alerta.
 * Não sabe o que é "categoria", não faz I/O, não conhece Supabase.
 *
 * @param {number} totalVeiculos
 * @param {Array} reservasNoPeriodo
 * @returns {{ total: number, ocupados: number, disponivel: number,
 *   overbooking: boolean, overbookingQtd: number,
 *   alerta: 'sem_veiculos'|'ultimo_veiculo'|null }}
 */
export function calcularNucleoDisponibilidade(totalVeiculos, reservasNoPeriodo) {
  const total = totalVeiculos
  const ocupados = reservasNoPeriodo.length
  const disponivel = Math.max(0, total - ocupados)
  const overbookingQtd = Math.max(0, ocupados - total)
  const overbooking = overbookingQtd > 0
  // Sem frota cadastrada na categoria (total=0) não é o mesmo alerta que
  // "frota esgotada" — força alerta=null quando não há dado de frota.
  const alerta = total === 0 ? null : disponivel === 0 ? 'sem_veiculos' : disponivel === 1 ? 'ultimo_veiculo' : null
  return { total, ocupados, disponivel, overbooking, overbookingQtd, alerta }
}

/**
 * Formato padronizado de uma reserva em conflito (exibido só quando
 * overbooking=true).
 * @param {{locacao_numero?, cliente?, status, data_saida, data_retorno_prev, placa_atribuida?}} r
 */
export function mapReservaConflito(r) {
  return {
    locacao_numero: r.locacao_numero ?? null,
    cliente: r.cliente ?? null,
    status: r.status,
    data_saida: r.data_saida,
    data_retorno_prev: r.data_retorno_prev,
    placa_atribuida: r.placa_atribuida ?? null,
  }
}
