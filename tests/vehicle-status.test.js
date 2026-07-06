// VehicleStatusService — testes do algoritmo puro (apps/frota-ops/js/services/vehicle-status.js).
// Tabela-verdade cobrindo as 7 transições válidas, contexto obrigatório
// faltando, pares fora do fluxo oficial, e statusAtual === statusDestino.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { descreverTransicao } from '../apps/frota-ops/js/services/vehicle-status.js'

test('LOCADO -> DEVOLVIDO: payload correto com pontoRetorno', () => {
  const r = descreverTransicao('LOCADO', 'DEVOLVIDO', { pontoRetorno: 'Oklahoma' })
  assert.deepEqual(r, {
    valido: true,
    payload: { status: 'DEVOLVIDO', limpo: false, patio_atual: 'Oklahoma', ponto_retorno: 'Oklahoma' }
  })
})

test('LOCADO -> DEVOLVIDO: invalida sem pontoRetorno', () => {
  const r = descreverTransicao('LOCADO', 'DEVOLVIDO', {})
  assert.equal(r.valido, false)
  assert.match(r.motivo, /pontoRetorno/)
})

test('DEVOLVIDO -> NO_LAVADOR: payload correto, horaEntradaLavador vem do contexto (nunca gerado internamente)', () => {
  const r = descreverTransicao('DEVOLVIDO', 'NO_LAVADOR', { horaEntradaLavador: '2026-08-01T10:00:00.000Z' })
  assert.deepEqual(r, {
    valido: true,
    payload: { status: 'NO_LAVADOR', hora_entrada_lavador: '2026-08-01T10:00:00.000Z', patio_atual: 'Lavador' }
  })
})

test('DEVOLVIDO -> NO_LAVADOR: invalida sem horaEntradaLavador', () => {
  const r = descreverTransicao('DEVOLVIDO', 'NO_LAVADOR', {})
  assert.equal(r.valido, false)
  assert.match(r.motivo, /horaEntradaLavador/)
})

test('DEVOLVIDO -> DISPONIVEL: sem contexto obrigatório', () => {
  const r = descreverTransicao('DEVOLVIDO', 'DISPONIVEL')
  assert.deepEqual(r, { valido: true, payload: { status: 'DISPONIVEL', limpo: true } })
})

test('NO_LAVADOR -> DISPONIVEL: patioAtual "Lavador" cai para "Garagem"', () => {
  const r = descreverTransicao('NO_LAVADOR', 'DISPONIVEL', { patioAtual: 'Lavador' })
  assert.deepEqual(r, {
    valido: true,
    payload: { status: 'DISPONIVEL', limpo: true, patio_atual: 'Garagem' }
  })
})

test('NO_LAVADOR -> DISPONIVEL: patioAtual diferente de "Lavador" é preservado', () => {
  const r = descreverTransicao('NO_LAVADOR', 'DISPONIVEL', { patioAtual: 'Brasil' })
  assert.equal(r.payload.patio_atual, 'Brasil')
})

test('NO_LAVADOR -> DISPONIVEL: invalida sem patioAtual', () => {
  const r = descreverTransicao('NO_LAVADOR', 'DISPONIVEL', {})
  assert.equal(r.valido, false)
  assert.match(r.motivo, /patioAtual/)
})

test('DISPONIVEL -> LOCADO: payload completo com prevRetorno', () => {
  const r = descreverTransicao('DISPONIVEL', 'LOCADO', {
    pontoRetirada: 'Aeroporto', pontoRetorno: 'Oklahoma', prevRetorno: '2026-08-05T10:00:00.000Z'
  })
  assert.deepEqual(r, {
    valido: true,
    payload: {
      status: 'LOCADO', limpo: true, patio_atual: null,
      ponto_retirada: 'Aeroporto', ponto_retorno: 'Oklahoma', prev_retorno: '2026-08-05T10:00:00.000Z'
    }
  })
})

test('DISPONIVEL -> LOCADO: prevRetorno ausente vira null (campo opcional)', () => {
  const r = descreverTransicao('DISPONIVEL', 'LOCADO', { pontoRetirada: 'Aeroporto', pontoRetorno: 'Oklahoma' })
  assert.equal(r.valido, true)
  assert.equal(r.payload.prev_retorno, null)
})

test('DISPONIVEL -> LOCADO: invalida sem pontoRetirada', () => {
  const r = descreverTransicao('DISPONIVEL', 'LOCADO', { pontoRetorno: 'Oklahoma' })
  assert.equal(r.valido, false)
  assert.match(r.motivo, /pontoRetirada/)
})

test('DISPONIVEL -> LOCADO: invalida sem pontoRetorno', () => {
  const r = descreverTransicao('DISPONIVEL', 'LOCADO', { pontoRetirada: 'Aeroporto' })
  assert.equal(r.valido, false)
  assert.match(r.motivo, /pontoRetorno/)
})

test('qualquer status do fluxo principal -> MANUTENCAO, sem contexto', () => {
  for (const origem of ['DISPONIVEL', 'LOCADO', 'DEVOLVIDO', 'NO_LAVADOR']) {
    const r = descreverTransicao(origem, 'MANUTENCAO')
    assert.deepEqual(r, { valido: true, payload: { status: 'MANUTENCAO' } }, `origem=${origem}`)
  }
})

test('MANUTENCAO -> DISPONIVEL: sem contexto obrigatório', () => {
  const r = descreverTransicao('MANUTENCAO', 'DISPONIVEL')
  assert.deepEqual(r, { valido: true, payload: { status: 'DISPONIVEL', limpo: true } })
})

test('transições fora do fluxo oficial são recusadas, mesmo sem ambiguidade técnica', () => {
  const forasDoFluxo = [
    ['LOCADO', 'NO_LAVADOR'],
    ['MANUTENCAO', 'LOCADO'],
    ['DISPONIVEL', 'DEVOLVIDO'],
    ['NO_LAVADOR', 'LOCADO'],
  ]
  for (const [origem, destino] of forasDoFluxo) {
    const r = descreverTransicao(origem, destino, {
      pontoRetirada: 'X', pontoRetorno: 'Y', patioAtual: 'Z', horaEntradaLavador: 'W'
    })
    assert.equal(r.valido, false, `${origem}->${destino} deveria ser inválido`)
    assert.match(r.motivo, /não prevista/)
  }
})

test('statusAtual === statusDestino é sempre inválido (não documentado no fluxo)', () => {
  const r = descreverTransicao('DISPONIVEL', 'DISPONIVEL')
  assert.equal(r.valido, false)
})

test('função pura: mesma entrada produz sempre a mesma saída, sem side effects', () => {
  const r1 = descreverTransicao('LOCADO', 'DEVOLVIDO', { pontoRetorno: 'Oklahoma' })
  const r2 = descreverTransicao('LOCADO', 'DEVOLVIDO', { pontoRetorno: 'Oklahoma' })
  assert.deepEqual(r1, r2)
})
