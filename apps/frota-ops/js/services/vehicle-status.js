// VehicleStatusService — Camada 3 do Design System Operacional (Fase 1B).
// Contrato: docs/services/VehicleStatusService.md
// Referência funcional: docs/domain/CicloVidaVeiculo.md
//
// Função pura: decide se uma transição de status é válida e qual payload ela
// implica. Nunca executa a escrita (RB-01, serviços stateless), nunca gera
// timestamp internamente (horaEntradaLavador sempre vem de contexto).
//
// Decisão de domínio (2026-07-05): representa o fluxo operacional OFICIAL da
// locadora — só as transições da tabela abaixo são válidas. Qualquer par fora
// dela é recusado, mesmo que não exista ambiguidade técnica em permiti-lo.

const TRANSICOES = {
  'LOCADO->DEVOLVIDO': {
    obrigatorios: ['pontoRetorno'],
    payload: (ctx) => ({
      status: 'DEVOLVIDO',
      limpo: false,
      patio_atual: ctx.pontoRetorno,
      ponto_retorno: ctx.pontoRetorno
    })
  },
  'DEVOLVIDO->NO_LAVADOR': {
    obrigatorios: ['horaEntradaLavador'],
    payload: (ctx) => ({
      status: 'NO_LAVADOR',
      hora_entrada_lavador: ctx.horaEntradaLavador,
      patio_atual: 'Lavador'
    })
  },
  'DEVOLVIDO->DISPONIVEL': {
    obrigatorios: [],
    payload: () => ({ status: 'DISPONIVEL', limpo: true })
  },
  'NO_LAVADOR->DISPONIVEL': {
    obrigatorios: ['patioAtual'],
    payload: (ctx) => ({
      status: 'DISPONIVEL',
      limpo: true,
      patio_atual: ctx.patioAtual === 'Lavador' ? 'Garagem' : ctx.patioAtual
    })
  },
  'DISPONIVEL->LOCADO': {
    obrigatorios: ['pontoRetirada', 'pontoRetorno'],
    payload: (ctx) => ({
      status: 'LOCADO',
      limpo: true,
      patio_atual: null,
      ponto_retirada: ctx.pontoRetirada,
      ponto_retorno: ctx.pontoRetorno,
      prev_retorno: ctx.prevRetorno ?? null
    })
  },
  'DISPONIVEL->MANUTENCAO': { obrigatorios: [], payload: () => ({ status: 'MANUTENCAO' }) },
  'LOCADO->MANUTENCAO': { obrigatorios: [], payload: () => ({ status: 'MANUTENCAO' }) },
  'DEVOLVIDO->MANUTENCAO': { obrigatorios: [], payload: () => ({ status: 'MANUTENCAO' }) },
  'NO_LAVADOR->MANUTENCAO': { obrigatorios: [], payload: () => ({ status: 'MANUTENCAO' }) },
  'MANUTENCAO->DISPONIVEL': { obrigatorios: [], payload: () => ({ status: 'DISPONIVEL', limpo: true }) }
};

/**
 * @param {string} statusAtual
 * @param {string} statusDestino
 * @param {object} [contexto]
 * @returns {{valido:true, payload:object} | {valido:false, motivo:string}}
 */
export function descreverTransicao(statusAtual, statusDestino, contexto = {}) {
  const chave = `${statusAtual}->${statusDestino}`;
  const regra = TRANSICOES[chave];

  if (!regra) {
    return { valido: false, motivo: 'Transição não prevista no fluxo operacional.' };
  }

  for (const campo of regra.obrigatorios) {
    if (contexto[campo] == null || contexto[campo] === '') {
      return { valido: false, motivo: `${campo} é obrigatório para esta transição.` };
    }
  }

  return { valido: true, payload: regra.payload(contexto) };
}
