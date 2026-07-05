// Testes do motor de disponibilidade — Fase 1 da Especificação
// (ESPECIFICACAO_MOTOR_DE_DISPONIBILIDADE_IFROTAS.md, itens 1 e 2:
// consulta de disponibilidade + identificação automática de overbooking).
//
// Testa a implementação JS pura (apps/frota-ops/js/utils.js
// calcularDisponibilidade). A versão canônica TypeScript
// (supabase/functions/_shared/disponibilidade.ts) replica a mesma lógica
// mas depende de um client Supabase (I/O) — não testável em isolamento
// aqui; a paridade entre as duas é garantida por revisão manual, não por
// teste automático (dívida técnica conhecida da duplicação JS/TS).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularDisponibilidade } from '../apps/frota-ops/js/utils.js'

const veiculosB = [
  { placa: 'AAA1111', categoria: 'B', modelo: 'Onix', status: 'DISPONIVEL' },
  { placa: 'BBB2222', categoria: 'B', modelo: 'Onix', status: 'DISPONIVEL' },
]

function reserva(overrides) {
  return {
    categoria: 'B',
    status: 'PREVISTO',
    data_saida: '2026-08-01T10:00:00',
    data_retorno_prev: '2026-08-03T10:00:00',
    placa_atribuida: null,
    locacao_numero: null,
    cliente: null,
    ...overrides,
  }
}

test('sem reservas: disponivel = total, sem alerta, sem overbooking', () => {
  const r = calcularDisponibilidade('B', '2026-08-01T10:00:00', '2026-08-03T10:00:00', veiculosB, [])
  assert.equal(r.disponivel, 2)
  assert.equal(r.overbooking, false)
  assert.equal(r.alerta, null)
  assert.deepEqual(r.reservas_conflito, [])
})

test('alerta "ultimo_veiculo" quando resta exatamente 1', () => {
  const reservas = [reserva({})]
  const r = calcularDisponibilidade('B', '2026-08-01T10:00:00', '2026-08-03T10:00:00', veiculosB, reservas)
  assert.equal(r.disponivel, 1)
  assert.equal(r.alerta, 'ultimo_veiculo')
  assert.equal(r.overbooking, false)
})

test('alerta "sem_veiculos" quando disponivel = 0 (sem overbooking)', () => {
  const reservas = [reserva({}), reserva({ placa_atribuida: 'AAA1111', status: 'CONFIRMADO' })]
  const r = calcularDisponibilidade('B', '2026-08-01T10:00:00', '2026-08-03T10:00:00', veiculosB, reservas)
  assert.equal(r.disponivel, 0)
  assert.equal(r.alerta, 'sem_veiculos')
  assert.equal(r.overbooking, false)
  assert.deepEqual(r.reservas_conflito, [])
})

test('overbooking: reservas_conflito populado com as reservas do período', () => {
  const reservas = [
    reserva({ locacao_numero: 'L001', cliente: 'Ana' }),
    reserva({ locacao_numero: 'L002', cliente: 'Bruno', placa_atribuida: 'AAA1111', status: 'CONFIRMADO' }),
    reserva({ locacao_numero: 'L003', cliente: 'Caio' }),
  ]
  const r = calcularDisponibilidade('B', '2026-08-01T10:00:00', '2026-08-03T10:00:00', veiculosB, reservas)
  assert.equal(r.disponivel, 0)
  assert.equal(r.overbooking, true)
  assert.equal(r.overbooking_qtd, 1)
  assert.equal(r.overbooking_categoria, 'B')
  assert.equal(r.alerta, 'sem_veiculos') // overbooking implica 0 disponíveis
  assert.equal(r.reservas_conflito.length, 3)
  assert.deepEqual(r.reservas_conflito.map((x) => x.locacao_numero).sort(), ['L001', 'L002', 'L003'])
})

test('reservas fora do período consultado não entram em reservas_conflito nem no cálculo', () => {
  const reservas = [
    reserva({ locacao_numero: 'FORA', data_saida: '2026-09-01T10:00:00', data_retorno_prev: '2026-09-03T10:00:00' }),
  ]
  const r = calcularDisponibilidade('B', '2026-08-01T10:00:00', '2026-08-03T10:00:00', veiculosB, reservas)
  assert.equal(r.disponivel, 2)
  assert.equal(r.overbooking, false)
})

test('reservas de outra categoria são ignoradas', () => {
  const reservas = [reserva({ categoria: 'C' }), reserva({ categoria: 'C' }), reserva({ categoria: 'C' })]
  const r = calcularDisponibilidade('B', '2026-08-01T10:00:00', '2026-08-03T10:00:00', veiculosB, reservas)
  assert.equal(r.disponivel, 2)
  assert.equal(r.overbooking, false)
})

test('sem frota cadastrada na categoria: total 0, disponivel 0, sem alerta (fonte sem_dados na canônica)', () => {
  const r = calcularDisponibilidade('Z', '2026-08-01T10:00:00', '2026-08-03T10:00:00', veiculosB, [])
  assert.equal(r.total, 0)
  assert.equal(r.disponivel, 0)
  assert.equal(r.overbooking, false)
  assert.equal(r.alerta, null)
})

test('sem frota cadastrada mas com reservas ativas: overbooking previsto mesmo sem alerta', () => {
  const reservas = [reserva({ categoria: 'Z' })]
  const r = calcularDisponibilidade('Z', '2026-08-01T10:00:00', '2026-08-03T10:00:00', veiculosB, reservas)
  assert.equal(r.total, 0)
  assert.equal(r.overbooking, true)
  assert.equal(r.overbooking_qtd, 1)
  assert.equal(r.alerta, null)
  assert.equal(r.reservas_conflito.length, 1)
})
