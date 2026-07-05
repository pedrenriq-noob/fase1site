// IdleWindowService — testes do algoritmo puro (apps/frota-ops/js/idle-window.js).
// Serviço novo e independente do AvailabilityService (ver ORIENTACAO_ARQUITETURAL
// e diretriz do Product Owner de 2026-07-05): não altera disponibilidade,
// overbooking, nem cria/persiste nada — só interpreta as mesmas ocupações.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { identificarJanelasOciosidade } from '../apps/frota-ops/js/idle-window.js'

const AGORA = new Date('2026-08-01T00:00:00Z')
const semBuffer = { agora: AGORA }

function ocupacao(inicio, fim, extra = {}) {
  return { inicio, fim, origem: 'reserva', ...extra }
}

test('sem ocupações: nenhuma janela (não há "próxima ocupação conhecida")', () => {
  const r = identificarJanelasOciosidade('B', 4, [], semBuffer)
  assert.deepEqual(r, [])
})

test('uma única ocupação: nenhuma janela interna (segmento final é aberto, não reportado)', () => {
  const r = identificarJanelasOciosidade('B', 1, [ocupacao('2026-08-05T10:00:00Z', '2026-08-07T10:00:00Z')], semBuffer)
  assert.deepEqual(r, [])
})

test('duas ocupações com espaço entre elas: reporta a janela interna com veiculos_livres correto', () => {
  // totalVeiculos=1: durante cada ocupação o único veículo está ocupado
  // (livres=0, segmento descartado); só o intervalo real entre elas conta.
  const ocupacoes = [
    ocupacao('2026-08-05T09:00:00Z', '2026-08-07T09:00:00Z'),
    ocupacao('2026-08-10T09:00:00Z', '2026-08-12T09:00:00Z'),
  ]
  const r = identificarJanelasOciosidade('B', 1, ocupacoes, semBuffer)
  assert.equal(r.length, 1)
  assert.equal(r[0].categoria, 'B')
  assert.equal(r[0].veiculos_livres, 1)
  assert.equal(r[0].inicio.toISOString(), '2026-08-07T09:00:00.000Z')
  assert.equal(r[0].fim.toISOString(), '2026-08-10T09:00:00.000Z')
  assert.equal(r[0].duracao_horas, 72)
})

test('buffer operacional atrasa o início da janela sem alterar o fim (nunca influencia o AvailabilityService)', () => {
  const bufferDe6h = (fim) => new Date(fim.getTime() + 6 * 3600000)
  const comBuffer = identificarJanelasOciosidade('B', 1, [
    ocupacao('2026-08-01T05:00:00Z', '2026-08-01T09:00:00Z'),
    ocupacao('2026-08-04T15:00:00Z', '2026-08-06T09:00:00Z'),
  ], { agora: AGORA, calcularLiberacao: bufferDe6h })

  assert.equal(comBuffer.length, 1)
  // fim da 1ª ocupação (09:00) + 6h de buffer = início da janela às 15:00
  assert.equal(comBuffer[0].inicio.toISOString(), '2026-08-01T15:00:00.000Z')
  // fim da janela = início da próxima ocupação, sem qualquer ajuste de buffer
  assert.equal(comBuffer[0].fim.toISOString(), '2026-08-04T15:00:00.000Z')
})

test('overbooking na categoria (mais ocupações que veículos) nunca gera veiculos_livres negativo nem janela', () => {
  const ocupacoes = [
    ocupacao('2026-08-05T00:00:00Z', '2026-08-10T00:00:00Z'),
    ocupacao('2026-08-05T00:00:00Z', '2026-08-10T00:00:00Z'),
    ocupacao('2026-08-05T00:00:00Z', '2026-08-10T00:00:00Z'),
    ocupacao('2026-08-10T00:00:00Z', '2026-08-15T00:00:00Z'),
  ]
  const r = identificarJanelasOciosidade('B', 2, ocupacoes, semBuffer)
  assert.equal(r.every((j) => j.veiculos_livres > 0), true)
})

test('janelas totalmente no passado são descartadas; janela em andamento é clipada em "agora"', () => {
  // totalVeiculos=1: só existe janela quando o único veículo está livre.
  const ocupacoes = [
    ocupacao('2026-07-01T00:00:00Z', '2026-07-05T00:00:00Z'),
    ocupacao('2026-07-10T00:00:00Z', '2026-07-20T00:00:00Z'), // janela [05/07,10/07) fica toda no passado
    ocupacao('2026-08-05T00:00:00Z', '2026-08-06T00:00:00Z'),
    ocupacao('2026-08-10T00:00:00Z', '2026-08-12T00:00:00Z'),
  ]
  const r = identificarJanelasOciosidade('B', 1, ocupacoes, semBuffer)
  assert.equal(r.some((j) => j.fim <= AGORA), false)
  // janela [20/07,05/08) está em andamento no momento de "agora" (01/08) — deve ser clipada, não descartada
  const emAndamento = r.find((j) => j.fim.toISOString() === '2026-08-05T00:00:00.000Z')
  assert.ok(emAndamento)
  assert.equal(emAndamento.inicio.getTime(), AGORA.getTime()) // clipado, não 2026-07-20
  // janela [06/08,10/08) é totalmente futura, não precisa de clipping
  const futura = r.find((j) => j.fim.toISOString() === '2026-08-10T00:00:00.000Z')
  assert.ok(futura)
  assert.equal(futura.inicio.toISOString(), '2026-08-06T00:00:00.000Z')
})

test('segmentos adjacentes com a mesma contagem de livres são mesclados em uma única janela', () => {
  // 2 veículos; A devolve e B sai exatamente no mesmo instante, mantendo o
  // saldo de livres constante (1) durante toda a travessia — não deve
  // fragmentar em duas janelas só porque a reserva "atual" mudou.
  const ocupacoes = [
    ocupacao('2026-08-02T00:00:00Z', '2026-08-05T00:00:00Z'), // veículo 1
    ocupacao('2026-08-05T00:00:00Z', '2026-08-08T00:00:00Z'), // veículo 2, começa quando o 1 termina
    ocupacao('2026-08-10T00:00:00Z', '2026-08-11T00:00:00Z'), // próxima demanda conhecida
  ]
  const r = identificarJanelasOciosidade('B', 2, ocupacoes, semBuffer)
  // [02,05) e [05,08) têm o mesmo veiculos_livres (1) e são contíguas -> mescladas em uma só.
  // [08,10) (livres=2, ambos devolvidos) e [10,11) (durante a ocupação C, livres=1)
  // permanecem como janelas separadas — contagens diferentes ou não-contíguas.
  assert.equal(r.length, 3)
  const mesclada = r.find((j) => j.veiculos_livres === 1)
  assert.ok(mesclada)
  assert.equal(mesclada.inicio.toISOString(), '2026-08-02T00:00:00.000Z')
  assert.equal(mesclada.fim.toISOString(), '2026-08-08T00:00:00.000Z')
  const outra = r.find((j) => j.veiculos_livres === 2)
  assert.ok(outra)
  assert.equal(outra.inicio.toISOString(), '2026-08-08T00:00:00.000Z')
  assert.equal(outra.fim.toISOString(), '2026-08-10T00:00:00.000Z')
})

test('sem frota cadastrada na categoria (totalVeiculos=0): nenhuma janela', () => {
  const r = identificarJanelasOciosidade('Z', 0, [ocupacao('2026-08-05T00:00:00Z', '2026-08-10T00:00:00Z')], semBuffer)
  assert.deepEqual(r, [])
})
