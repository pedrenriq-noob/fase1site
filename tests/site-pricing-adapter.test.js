// Testes de apps/site/js/pricing-adapter.js — os wrappers que adaptam o
// módulo canônico shared/pricing.js ao estado S do wizard. A regra de
// negócio em si já é coberta por tests/pricing.test.js e
// tests/pricing-parity.test.js; aqui o foco é a integração com S
// (mutação de S.dias, recálculo de subtotais já selecionados).
//
// Rodar: node --test tests/

import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { S } from '../apps/site/js/state.js'
import { calcDias, getPreco, calcSubtotal, calcBaseProtecao, getTotalCad } from '../apps/site/js/pricing-adapter.js'

beforeEach(() => {
  S.retData = '2026-07-15'
  S.retHora = '09:00'
  S.devData = '2026-07-15'
  S.devHora = '12:00'
  S.sazonalidade = []
  S.adicionais = []
  S.adicionais_sel = []
  S.dias = 0
})

test('calcDias: sem retData/devData, zera S.dias em vez de propagar NaN/Invalid Date', () => {
  S.retData = ''
  calcDias()
  assert.equal(S.dias, 0)
})

test('calcDias: mesma data, 3h de diferença (09:00→12:00), cobra fração em quartos', () => {
  calcDias() // regra de tolerância vem de shared/pricing.js, já coberta em tests/pricing.test.js
  assert.equal(S.dias, 0.75)
})

test('calcDias: devolução antes da retirada (bug reportado) resulta em S.dias = 0, nunca negativo', () => {
  S.devData = S.retData
  S.retHora = '09:00'
  S.devHora = '05:30' // antes da retirada, mesmo dia
  calcDias()
  assert.equal(S.dias, 0)
})

test('calcDias: recalcula o subtotal dos adicionais já selecionados a partir do novo S.dias', () => {
  S.adicionais = [{ id: 'a1', tipo_preco: 'per_day', preco: 10 }]
  S.adicionais_sel = [{ id: 'a1', quantidade: 2, subtotal: 999 }] // subtotal propositalmente errado
  S.devData = '2026-07-22' // 7 dias depois, mais a fração de 09:00→12:00 (0.75)
  calcDias()
  assert.equal(S.dias, 7.75)
  assert.equal(S.adicionais_sel[0].subtotal, 10 * 2 * 7.75)
})

test('getPreco: delega para o preço base da categoria sem sazonalidade cadastrada', () => {
  const cat = { slug: 'grupo_b', preco_diaria: 150 }
  assert.equal(getPreco(cat), 150)
})

// calcSubtotal calcula a diária do próprio item a partir de S.retData/
// devData/retHora/devHora + item.regra_hora_extra — não confia mais em
// S.dias diretamente (S.dias continua correto para a categoria, que não
// passa por calcSubtotal). Ver docs/DECISION_LOG.md 2026-07-14.
test('calcSubtotal: item "proporcional" (padrão) usa a mesma fração que S.dias', () => {
  // 09:00→12:00 no mesmo dia = 0.75 diária (fração), igual a calcDias()
  assert.equal(calcSubtotal({ tipo_preco: 'per_day', preco: 20, regra_hora_extra: 'proporcional' }, 2), 20 * 2 * 0.75)
  assert.equal(calcSubtotal({ tipo_preco: 'per_day', preco: 20 }, 2), 20 * 2 * 0.75) // sem regra definida = proporcional
})

test('calcSubtotal: item "integral_apos_tolerancia" cobra diária cheia em vez da fração', () => {
  // mesmo período (09:00→12:00, 3h de diferença): proporcional cobraria 0.75,
  // integral cobra 1 diária inteira (passou de 1h de tolerância)
  const item = { tipo_preco: 'per_day', preco: 20, regra_hora_extra: 'integral_apos_tolerancia' }
  assert.equal(calcSubtotal(item, 2), 20 * 2 * 1)
})

test('calcSubtotal: tipo_preco "flat"/"fixed" ignora regra_hora_extra e diárias', () => {
  assert.equal(calcSubtotal({ tipo_preco: 'fixed', preco: 50, regra_hora_extra: 'integral_apos_tolerancia' }, 1), 50)
})

test('calcBaseProtecao: aplica a mesma lógica por-item que calcSubtotal', () => {
  assert.equal(calcBaseProtecao(null), 0)
  assert.equal(
    calcBaseProtecao({ tipo_preco: 'per_day', preco: 100, regra_hora_extra: 'proporcional' }),
    100 * 0.75,
  )
  assert.equal(
    calcBaseProtecao({ tipo_preco: 'per_day', preco: 100, regra_hora_extra: 'integral_apos_tolerancia' }),
    100 * 1,
  )
  assert.equal(calcBaseProtecao({ tipo_preco: 'fixed', preco: 250 }), 250)
})

test('getTotalCad: soma só os adicionais marcados como cadeirinha', () => {
  S.adicionais = [
    { id: 'cad1', is_cadeirinha: true },
    { id: 'cad2', is_cadeirinha: true },
    { id: 'outro', is_cadeirinha: false },
  ]
  S.adicionais_sel = [
    { id: 'cad1', quantidade: 2 },
    { id: 'cad2', quantidade: 1 },
    { id: 'outro', quantidade: 5 },
  ]
  assert.equal(getTotalCad(), 3)
})

test('getTotalCad: sem adicionais selecionados, retorna 0', () => {
  assert.equal(getTotalCad(), 0)
})
