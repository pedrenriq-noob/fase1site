// Testes de congelamento do domínio de precificação.
// Os valores esperados foram derivados do comportamento ATUAL em produção
// (apps/site/script.js + supabase/functions/criar-solicitacao) — qualquer
// falha aqui significa mudança de regra de negócio, não "teste desatualizado".
//
// Rodar: node --test tests/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcDias, calcDiasItem, precoDiariaComSazonalidade, calcSubtotal } from '../supabase/functions/_shared/pricing.js'

// ── calcDias ────────────────────────────────────────────────
test('calcDias: períodos inválidos retornam 0', () => {
  assert.equal(calcDias('2026-08-02T10:00:00', '2026-08-01T10:00:00'), 0) // invertido
  assert.equal(calcDias('2026-08-01T10:00:00', '2026-08-01T10:00:00'), 0) // igual
  assert.equal(calcDias('data-invalida', '2026-08-01T10:00:00'), 0)
})

test('calcDias: diárias exatas', () => {
  assert.equal(calcDias('2026-08-01T10:00:00', '2026-08-02T10:00:00'), 1)
  assert.equal(calcDias('2026-08-01T10:00:00', '2026-08-08T10:00:00'), 7)
})

test('calcDias: tolerância de até 1h não cobra fração', () => {
  assert.equal(calcDias('2026-08-01T10:00:00', '2026-08-02T11:00:00'), 1)  // +1h exata
  assert.equal(calcDias('2026-08-01T10:00:00', '2026-08-03T10:30:00'), 2)  // +30min
})

test('calcDias: resto acima de 4h cobra diária extra inteira', () => {
  assert.equal(calcDias('2026-08-01T10:00:00', '2026-08-02T15:00:00'), 2)  // +5h
  assert.equal(calcDias('2026-08-01T10:00:00', '2026-08-02T23:00:00'), 2)  // +13h
})

test('calcDias: resto entre 1h e 4h cobra fração em quartos', () => {
  // +2h → floor(2*2)/8 = 4/8 = 0.5
  assert.equal(calcDias('2026-08-01T10:00:00', '2026-08-02T12:00:00'), 1.5)
  // +4h → floor(4*2)/8 = 8/8 = 1 (limite superior da faixa)
  assert.equal(calcDias('2026-08-01T10:00:00', '2026-08-02T14:00:00'), 2)
  // +1.5h → floor(1.5*2)/8 = 3/8 = 0.375
  assert.equal(calcDias('2026-08-01T10:00:00', '2026-08-02T11:30:00'), 1.375)
})

test('calcDias: locação de poucas horas no mesmo dia cobra mínimo de 1 diária', () => {
  assert.equal(calcDias('2026-08-01T10:00:00', '2026-08-01T10:30:00'), 1)  // resto 0.5h ≤ 1
})

// ── precoDiariaComSazonalidade ──────────────────────────────
const catB = { slug: 'grupo_b', preco_diaria: 100 }
const natal = { data_inicio: '2026-12-20', data_fim: '2027-01-05', precos: { grupo_b: 180 } }
const semPrecoB = { data_inicio: '2026-07-01', data_fim: '2026-07-31', precos: { grupo_c: 90 } }

test('sazonalidade: data dentro do período usa preço sazonal', () => {
  assert.equal(precoDiariaComSazonalidade(catB, '2026-12-25', [natal]), 180)
  assert.equal(precoDiariaComSazonalidade(catB, '2026-12-20', [natal]), 180) // borda início
  assert.equal(precoDiariaComSazonalidade(catB, '2027-01-05', [natal]), 180) // borda fim
})

test('sazonalidade: fora do período (ou sem preço para o slug) usa preço base', () => {
  assert.equal(precoDiariaComSazonalidade(catB, '2026-11-01', [natal]), 100)
  assert.equal(precoDiariaComSazonalidade(catB, '2026-07-15', [semPrecoB]), 100)
  assert.equal(precoDiariaComSazonalidade(catB, '2026-07-15', []), 100)
  assert.equal(precoDiariaComSazonalidade(catB, '', [natal]), 100) // sem data
})

test('sazonalidade: preco_diaria string (numeric do Postgres) vira número', () => {
  assert.equal(precoDiariaComSazonalidade({ slug: 'grupo_b', preco_diaria: '100.50' }, '', []), 100.5)
})

// ── calcSubtotal ────────────────────────────────────────────
test('calcSubtotal: per_day multiplica por diárias, flat não', () => {
  assert.equal(calcSubtotal('per_day', 25, 2, 3), 150)  // 25 × 2 × 3
  assert.equal(calcSubtotal('flat', 25, 2, 3), 50)      // 25 × 2
  assert.equal(calcSubtotal('per_day', '10.5', 1, 2), 21)
})

// ── calcDiasItem ──────────────────────────────────────────────
// Regra por-item configurável no painel admin (protecoes/adicionais),
// ver docs/DECISION_LOG.md 2026-07-14.
test('calcDiasItem: sem regra ou "proporcional" é idêntico a calcDias (regra histórica)', () => {
  const casos = [
    ['2026-08-01T10:00:00', '2026-08-02T10:00:00'],   // exato
    ['2026-08-01T10:00:00', '2026-08-02T11:00:00'],   // +1h (tolerância)
    ['2026-08-01T10:00:00', '2026-08-02T12:00:00'],   // +2h (fração)
    ['2026-08-01T10:00:00', '2026-08-02T15:00:00'],   // +5h (diária cheia extra)
  ]
  for (const [ret, dev] of casos) {
    assert.equal(calcDiasItem(ret, dev, 'proporcional'), calcDias(ret, dev))
    assert.equal(calcDiasItem(ret, dev, undefined), calcDias(ret, dev))
    assert.equal(calcDiasItem(ret, dev, null), calcDias(ret, dev))
  }
})

test('calcDiasItem: "integral_apos_tolerancia" — dentro de 1h não cobra fração', () => {
  assert.equal(calcDiasItem('2026-08-01T10:00:00', '2026-08-02T10:00:00', 'integral_apos_tolerancia'), 1)
  assert.equal(calcDiasItem('2026-08-01T10:00:00', '2026-08-02T11:00:00', 'integral_apos_tolerancia'), 1) // +1h, ainda tolerância
})

test('calcDiasItem: "integral_apos_tolerancia" — acima de 1h cobra diária INTEIRA extra, sem fração', () => {
  // +2h: regra proporcional cobraria fração (1.5); integral cobra diária cheia (2)
  assert.equal(calcDiasItem('2026-08-01T10:00:00', '2026-08-02T12:00:00', 'integral_apos_tolerancia'), 2)
  assert.notEqual(calcDiasItem('2026-08-01T10:00:00', '2026-08-02T12:00:00', 'integral_apos_tolerancia'),
    calcDias('2026-08-01T10:00:00', '2026-08-02T12:00:00'))
  // +5h: mesma diária extra que a regra proporcional já cobra por passar de 4h
  assert.equal(calcDiasItem('2026-08-01T10:00:00', '2026-08-02T15:00:00', 'integral_apos_tolerancia'), 2)
})

test('calcDiasItem: período inválido retorna 0 nas duas regras', () => {
  assert.equal(calcDiasItem('2026-08-02T10:00:00', '2026-08-01T10:00:00', 'proporcional'), 0)
  assert.equal(calcDiasItem('2026-08-02T10:00:00', '2026-08-01T10:00:00', 'integral_apos_tolerancia'), 0)
})
