// =============================================================================
// oportunidade-comercial.js
// =============================================================================
// Responsabilidade única: pegar as janelas "geométricas" já identificadas pelo
// IdleWindowService (apps/frota-ops/js/idle-window.js) e decidir quais delas
// são oportunidades COMERCIALMENTE viáveis para a Central de Reservas —
// aplicando o período consultado, o horário de funcionamento do local, o
// limiar mínimo de duração, e calculando a locação recomendada em diárias.
//
// Não recalcula janelas nem conhece frota_reservas/frota_veiculos — recebe
// JanelaOciosidade[] já prontas e devolve só as que sobrevivem aos filtros
// comerciais, com o campo `recomendacao` anexado.
//
// Não persiste nada, não conhece Supabase — função pura, testável sem mocks.
// Ver docs/domain/OportunidadeComercial.md e docs/services/OportunidadeComercial.md.
// =============================================================================

const MS_HORA = 3600000

/**
 * @typedef {Object} HorarioLocal
 * @property {string|null} hora_retirada_inicio  "HH:MM[:SS]" ou null (sem restrição)
 * @property {string|null} hora_retirada_fim
 * @property {string|null} hora_devolucao_inicio
 * @property {string|null} hora_devolucao_fim
 * @property {boolean} [disponivel_domingo] Default true (sem restrição de domingo).
 */

/**
 * @typedef {Object} Recomendacao
 * @property {number} diarias Diárias recomendadas para venda segura (>=1, sempre presente pois duracao_horas > 30h já garante isso).
 * @property {Date} devolucaoMaxima Data/hora limite de devolução dentro da janela final (após todos os recortes).
 */

function parseHora(hhmm) {
  // "08:00" ou "08:00:00" -> minutos desde 00:00
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function minutosDoDia(data) {
  return data.getHours() * 60 + data.getMinutes()
}

/**
 * Recorta [inicio, fim] pela interseção com [periodoInicio, periodoFim].
 * Retorna null se não houver sobreposição.
 */
function recortarPeriodo(janela, periodoInicio, periodoFim) {
  if (!periodoInicio && !periodoFim) return janela
  const inicio = periodoInicio && periodoInicio > janela.inicio ? periodoInicio : janela.inicio
  const fim = periodoFim && periodoFim < janela.fim ? periodoFim : janela.fim
  if (inicio >= fim) return null
  return { ...janela, inicio, fim, duracao_horas: (fim.getTime() - inicio.getTime()) / MS_HORA }
}

/**
 * Avança `data` para o próximo instante em que o local aceita retirada,
 * respeitando hora_retirada_inicio/fim e disponivel_domingo. Retorna null se
 * não houver nenhum instante válido antes de `limite`.
 */
function proximaRetiradaValida(data, horarioLocal, limite) {
  return proximoInstanteValido(data, horarioLocal.hora_retirada_inicio, horarioLocal.hora_retirada_fim, horarioLocal.disponivel_domingo, limite)
}

/**
 * Retrocede `data` para o último instante em que o local aceita devolução,
 * respeitando hora_devolucao_inicio/fim e disponivel_domingo. Retorna null se
 * não houver nenhum instante válido depois de `limite`.
 */
function ultimaDevolucaoValida(data, horarioLocal, limite) {
  return ultimoInstanteValido(data, horarioLocal.hora_devolucao_inicio, horarioLocal.hora_devolucao_fim, horarioLocal.disponivel_domingo, limite)
}

function domingoFechado(data, disponivelDomingo) {
  return disponivelDomingo === false && data.getDay() === 0
}

function proximoInstanteValido(data, horaInicio, horaFim, disponivelDomingo, limite) {
  if (!horaInicio || !horaFim) return data // sem restrição de horário
  const inicioMin = parseHora(horaInicio)
  const fimMin = parseHora(horaFim)
  const noturno = inicioMin > fimMin // ex: 18:01 -> 07:59 (vira a noite)

  let candidato = new Date(data)
  for (let i = 0; i < 15; i++) { // no máximo 15 dias de busca — suficiente para o horizonte da tela (Regra 3: 15 dias)
    const minutosAtual = minutosDoDia(candidato)
    const dentroDoHorario = noturno
      ? (minutosAtual >= inicioMin || minutosAtual <= fimMin)
      : (minutosAtual >= inicioMin && minutosAtual <= fimMin)
    const valido = dentroDoHorario && !domingoFechado(candidato, disponivelDomingo)

    if (valido) return candidato > limite ? null : candidato

    // pula para o próximo instante candidato: se o horário-do-dia já era
    // válido (só caiu por domingo fechado), tenta o mesmo horário amanhã;
    // se caiu na lacuna diurna de um horário noturno (inicio > fim, ex:
    // 18:01→07:59), o próximo válido é hoje à noite, não amanhã; senão,
    // avança para o início do próximo horário válido (hoje ou amanhã).
    const proximo = new Date(candidato)
    if (dentroDoHorario) {
      proximo.setDate(proximo.getDate() + 1)
    } else if (noturno) {
      proximo.setHours(Math.floor(inicioMin / 60), inicioMin % 60, 0, 0)
    } else if (minutosAtual < inicioMin) {
      proximo.setHours(Math.floor(inicioMin / 60), inicioMin % 60, 0, 0)
    } else {
      proximo.setDate(proximo.getDate() + 1)
      proximo.setHours(Math.floor(inicioMin / 60), inicioMin % 60, 0, 0)
    }
    if (proximo > limite) return null
    candidato = proximo
  }
  return null
}

function ultimoInstanteValido(data, horaInicio, horaFim, disponivelDomingo, limite) {
  if (!horaInicio || !horaFim) return data // sem restrição de horário
  const inicioMin = parseHora(horaInicio)
  const fimMin = parseHora(horaFim)
  const noturno = inicioMin > fimMin

  let candidato = new Date(data)
  for (let i = 0; i < 15; i++) {
    const minutosAtual = minutosDoDia(candidato)
    const dentroDoHorario = noturno
      ? (minutosAtual >= inicioMin || minutosAtual <= fimMin)
      : (minutosAtual >= inicioMin && minutosAtual <= fimMin)
    const valido = dentroDoHorario && !domingoFechado(candidato, disponivelDomingo)

    if (valido) return candidato < limite ? null : candidato

    // simétrico a proximoInstanteValido: domingo fechado com horário-do-dia
    // válido -> tenta o mesmo horário ontem; lacuna diurna de horário
    // noturno -> último válido é hoje de madrugada (fimMin), não ontem.
    const anterior = new Date(candidato)
    if (dentroDoHorario) {
      anterior.setDate(anterior.getDate() - 1)
    } else if (noturno) {
      anterior.setHours(Math.floor(fimMin / 60), fimMin % 60, 0, 0)
    } else if (minutosAtual > fimMin) {
      anterior.setHours(Math.floor(fimMin / 60), fimMin % 60, 0, 0)
    } else {
      anterior.setDate(anterior.getDate() - 1)
      anterior.setHours(Math.floor(fimMin / 60), fimMin % 60, 0, 0)
    }
    if (anterior < limite) return null
    candidato = anterior
  }
  return null
}

/**
 * Recorta a janela pelo horário de funcionamento do local: adianta o início
 * para a próxima retirada válida, atrasa o fim para a última devolução válida
 * anterior a ele. Retorna null se não sobrar janela válida.
 */
function recortarHorarioFuncionamento(janela, horarioLocal) {
  if (!horarioLocal) return janela // sem local vinculado -> sem restrição (ver sql/031)

  const inicioAjustado = proximaRetiradaValida(janela.inicio, horarioLocal, janela.fim)
  if (!inicioAjustado) return null

  const fimAjustado = ultimaDevolucaoValida(janela.fim, horarioLocal, inicioAjustado)
  if (!fimAjustado || fimAjustado <= inicioAjustado) return null

  return {
    ...janela,
    inicio: inicioAjustado,
    fim: fimAjustado,
    duracao_horas: (fimAjustado.getTime() - inicioAjustado.getTime()) / MS_HORA
  }
}

/**
 * Regra 10: diárias recomendadas = piso inteiro de horas/24 (sem mínimo
 * bloqueante além do já garantido pelo filtro de >30h da Regra 1 — decisão
 * de produto 2026-07-06: "só arredondamento de diárias, sem mínimo
 * bloqueante"). devoluçãoMáxima nunca excede o fim da janela já recortada.
 */
function calcularRecomendacao(janela) {
  const diarias = Math.max(1, Math.floor(janela.duracao_horas / 24))
  const devolucaoMaxima = new Date(janela.inicio.getTime() + diarias * 24 * MS_HORA)
  return { diarias, devolucaoMaxima }
}

/**
 * @param {import('../idle-window.js').JanelaOciosidade[]} janelas
 * @param {Object} [opts]
 * @param {number} [opts.minHoras] Regra 1 — default 30 (estritamente "mais que", não "pelo menos").
 * @param {Date|null} [opts.periodoInicio] Regra 2 — início do período consultado pelo operador.
 * @param {Date|null} [opts.periodoFim] Regra 2 — fim do período consultado pelo operador.
 * @param {HorarioLocal|null} [opts.horarioLocal] Regra 5 — horário do local associado (null = sem restrição).
 * @returns {Array<JanelaOciosidade & {recomendacao: Recomendacao}>} Ordenadas por Regra 8 (maior duração, depois menor início).
 */
export function filtrarOportunidadesComerciais(janelas, opts = {}) {
  const { minHoras = 30, periodoInicio = null, periodoFim = null, horarioLocal = null } = opts

  return janelas
    .map((j) => recortarPeriodo(j, periodoInicio, periodoFim))
    .filter(Boolean)
    .map((j) => recortarHorarioFuncionamento(j, horarioLocal))
    .filter(Boolean)
    .filter((j) => j.duracao_horas > minHoras)
    .map((j) => ({ ...j, recomendacao: calcularRecomendacao(j) }))
    .sort((a, b) => (b.duracao_horas - a.duracao_horas) || (a.inicio.getTime() - b.inicio.getTime()))
}
