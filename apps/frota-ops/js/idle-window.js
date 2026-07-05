// =============================================================================
// idle-window.js — IdleWindowService
// =============================================================================
// Responsabilidade única: identificar oportunidades operacionais de locação
// curta na frota — janelas de tempo em que veículos de uma categoria ficam
// livres entre uma ocupação e a próxima ocupação conhecida.
//
// NÃO é uma extensão do AvailabilityService (_shared/disponibilidade.ts /
// calcularDisponibilidade em utils.js). É um serviço separado, com
// responsabilidade única, que reinterpreta os MESMOS dados (frota +
// contratos + reservas) sem alterar o algoritmo oficial de disponibilidade:
//   - não cria reservas
//   - não altera disponibilidade nem overbooking
//   - não atribui placas
//   - não persiste nada — é uma função pura
//
// Implementação única (sem cópia JS/TS): este serviço só é consumido pelo
// frota-ops (app autenticado, lê os dados via RLS com a anon key) — não há
// necessidade de uma Edge Function com service_role para responder a ele,
// diferente do AvailabilityService (que atende o site público sem RLS).
// Por isso este módulo existe em um único lugar. Se um dia outro app em
// outra raiz de deploy precisar dele, aí sim replicaríamos o padrão de
// cópia física + teste de paridade já usado em pricing.js (limitação da
// arquitetura sem build step — ADR-001 —, não duplicação de linguagem).
//
// Regra de domínio (não confundir com a estratégia de implementação
// abaixo): "identificar toda oportunidade de utilização da frota antes da
// próxima ocupação conhecida, respeitando o tempo mínimo seguro após uma
// devolução". A estratégia de varredura por eventos (sweep line) é apenas
// COMO isso é calculado hoje — pode ser trocada por outra sem mudar o
// contrato desta função (parâmetros de entrada e formato de saída).
// =============================================================================

/**
 * @typedef {Object} BlocoOcupacao
 * @property {string|Date} inicio
 * @property {string|Date} fim
 * @property {'reserva'|'manutencao'|'bloqueio'} [origem] Tipo da ocupação.
 *   Hoje só 'reserva' é produzido (a partir de frota_reservas). O campo
 *   existe para permitir, no futuro, incorporar manutenção/lavagem/vistoria
 *   sem mudar a assinatura da função (ver ponto 8 da diretriz do produto).
 * @property {{locacao_numero?: string, cliente?: string, status?: string}} [referencia]
 *   Metadados da ocupação de origem, só para contexto/exibição.
 */

/**
 * @typedef {Object} JanelaOciosidade
 * @property {string} categoria
 * @property {number} veiculos_livres Quantos veículos da categoria estão
 *   livres durante toda a janela (modelo de pool — mesmo conceito usado
 *   pelo AvailabilityService, não atribuição por veículo individual).
 * @property {Date} inicio
 * @property {Date} fim Também é a devolução máxima segura da locação curta.
 * @property {number} duracao_horas
 */

/**
 * Identifica janelas de ociosidade "internas" — ou seja, limitadas nas duas
 * pontas por ocupações conhecidas (uma que termina, outra que começa
 * depois). Não reporta o tempo "livre para sempre" após a última ocupação
 * conhecida: isso já é respondido pelo AvailabilityService (disponibilidade
 * comum), não é uma oportunidade com prazo que mereça alerta operacional.
 *
 * @param {string} categoria
 * @param {number} totalVeiculos Frota total da categoria (mesma fonte que o AvailabilityService usa).
 * @param {BlocoOcupacao[]} ocupacoes Ocupações ativas da categoria (tipicamente frota_reservas PREVISTO+CONFIRMADO).
 * @param {Object} [opts]
 * @param {Date} [opts.agora] Momento de referência — janelas totalmente no passado são descartadas. Default: `new Date()`.
 * @param {(fimOcupacao: Date) => Date} [opts.calcularLiberacao] Buffer operacional: quando o veículo
 *   fica de fato pronto após o fim de uma ocupação do tipo 'reserva'. Default: identidade (sem buffer).
 *   Esta é a ÚNICA finalidade do buffer neste serviço — nunca influencia o AvailabilityService.
 * @returns {JanelaOciosidade[]}
 */
export function identificarJanelasOciosidade(categoria, totalVeiculos, ocupacoes, opts = {}) {
  const agora = opts.agora ?? new Date()
  const calcularLiberacao = opts.calcularLiberacao ?? ((fim) => fim)

  if (!totalVeiculos || totalVeiculos <= 0) return []

  /** @type {{ t: Date, delta: number }[]} */
  const eventos = []
  for (const o of ocupacoes) {
    const inicio = o.inicio instanceof Date ? o.inicio : new Date(o.inicio)
    const fimBruto = o.fim instanceof Date ? o.fim : new Date(o.fim)
    if (isNaN(inicio.getTime()) || isNaN(fimBruto.getTime())) continue
    const fimEfetivo = (o.origem ?? 'reserva') === 'reserva' ? calcularLiberacao(fimBruto) : fimBruto
    eventos.push({ t: inicio, delta: +1 })
    eventos.push({ t: fimEfetivo, delta: -1 })
  }
  eventos.sort((a, b) => a.t.getTime() - b.t.getTime())

  /** @type {JanelaOciosidade[]} */
  const brutas = []
  let ocupados = 0
  for (let i = 0; i < eventos.length; i++) {
    ocupados += eventos[i].delta
    const livres = totalVeiculos - ocupados
    const inicioSegmento = eventos[i].t
    const fimSegmento = eventos[i + 1]?.t ?? null // segmento aberto (após o último evento) não é reportado
    if (!fimSegmento || fimSegmento <= inicioSegmento) continue
    if (livres <= 0) continue
    if (fimSegmento <= agora) continue // totalmente no passado
    brutas.push({
      categoria,
      veiculos_livres: livres,
      inicio: inicioSegmento < agora ? agora : inicioSegmento,
      fim: fimSegmento,
    })
  }

  // Mescla segmentos adjacentes com a mesma contagem de veículos livres —
  // detalhe de apresentação (evita fragmentar uma janela contígua em várias
  // linhas só porque o sweep gerou eventos intermediários com o mesmo saldo).
  /** @type {JanelaOciosidade[]} */
  const mescladas = []
  for (const j of brutas) {
    const anterior = mescladas[mescladas.length - 1]
    if (anterior && anterior.veiculos_livres === j.veiculos_livres && anterior.fim.getTime() === j.inicio.getTime()) {
      anterior.fim = j.fim
    } else {
      mescladas.push({ ...j })
    }
  }

  return mescladas.map((j) => ({
    ...j,
    duracao_horas: (j.fim.getTime() - j.inicio.getTime()) / 3600000,
  }))
}
