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
import { calcDias, getPreco, calcSubtotal, getTotalCad } from '../apps/site/js/pricing-adapter.js'

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

test('calcSubtotal: usa S.dias atual para tipo_preco per_day', () => {
  S.dias = 3
  assert.equal(calcSubtotal({ tipo_preco: 'per_day', preco: 20 }, 2), 120)
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
