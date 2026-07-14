// Testes do domínio local×horário do site público (apps/site/js/locations.js) —
// é onde os dois bugs de 2026-07-14 aconteceram (ver docs/DECISION_LOG.md):
// (1) troca de horário pela sidebar sem revalidar o local escolhido, e
// (2) reload sobrescrevendo o período sem recalcular as diárias. Estes
// testes cobrem a lógica pura de resolução de local×horário para que a
// próxima mudança nessa área quebre um teste antes de chegar ao cliente.
//
// Rodar: node --test tests/

import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { S } from '../apps/site/js/state.js'
import {
  locaisParaRetirada, locaisParaDevolucao,
  avisoRetirada, avisoDevolucao,
  isAddAero, localIsAero, syncAeroAdd,
  janelaTexto, nomeCurto, revalidarLocaisPeriodo,
} from '../apps/site/js/locations.js'

const CENTRO = {
  nome: 'Av. Brasil, 90 — Centro',
  permite_retirada: true, permite_devolucao: true,
  hora_retirada_inicio: '08:00', hora_retirada_fim: '18:00',
  hora_devolucao_inicio: '08:00', hora_devolucao_fim: '18:00',
  disponivel_domingo: false, is_aeroporto: false,
}
const CATARATAS = {
  nome: 'Av. das Cataratas, 1419 — Vila Yolanda',
  permite_retirada: true, permite_devolucao: true,
  hora_retirada_inicio: '08:00', hora_retirada_fim: '18:00',
  hora_devolucao_inicio: '08:00', hora_devolucao_fim: '18:00',
  disponivel_domingo: true, is_aeroporto: false,
}
const AEROPORTO = {
  nome: 'Estacionamento Leva e Trás 24h — Aeroporto',
  permite_retirada: false, permite_devolucao: true,
  hora_retirada_inicio: null, hora_retirada_fim: null,
  hora_devolucao_inicio: null, hora_devolucao_fim: null,
  disponivel_domingo: true, is_aeroporto: true,
}
const TAXA_AEROPORTO = { id: 'taxa-aero', nome: 'DEVOLUCAO NO AEROPORTO', preco: 69.9, tipo_preco: 'fixed' }

beforeEach(() => {
  S.locais = [CENTRO, CATARATAS, AEROPORTO]
  S.adicionais = [TAXA_AEROPORTO]
  S.adicionais_sel = []
  S.retData = '2026-07-15' // quarta-feira
  S.devData = '2026-07-15'
  S.retLocal = ''
  S.devLocal = ''
  S.dias = 1
})

// ── locaisParaRetirada / locaisParaDevolucao ───────────────
test('locaisParaDevolucao: dentro da janela (08:00–18:00), todos os locais que permitem devolução aparecem', () => {
  const r = locaisParaDevolucao('2026-07-15', '12:00').map(l => l.nome)
  assert.deepEqual(r, [CENTRO.nome, CATARATAS.nome, AEROPORTO.nome])
})

test('locaisParaDevolucao: fora da janela da loja (19:00), só o aeroporto (24h) permanece — este é o caso do bug do usuário', () => {
  const r = locaisParaDevolucao('2026-07-15', '19:00').map(l => l.nome)
  assert.deepEqual(r, [AEROPORTO.nome])
})

test('locaisParaDevolucao: exatamente na borda da janela (18:00) ainda é válido', () => {
  const r = locaisParaDevolucao('2026-07-15', '18:00').map(l => l.nome)
  assert.ok(r.includes(CENTRO.nome))
})

test('locaisParaDevolucao: domingo remove locais sem disponivel_domingo (Centro não abre)', () => {
  const domingo = '2026-07-19' // domingo
  const r = locaisParaDevolucao(domingo, '12:00').map(l => l.nome)
  assert.ok(!r.includes(CENTRO.nome))
  assert.ok(r.includes(CATARATAS.nome))
  assert.ok(r.includes(AEROPORTO.nome))
})

test('locaisParaRetirada: aeroporto não permite retirada em nenhum horário', () => {
  const r = locaisParaRetirada('2026-07-15', '10:00').map(l => l.nome)
  assert.ok(!r.includes(AEROPORTO.nome))
})

test('locaisParaRetirada/Devolucao: sem hora informada, não filtra por janela (mostra todos aptos)', () => {
  assert.equal(locaisParaRetirada('2026-07-15', '').length, 2)
  assert.equal(locaisParaDevolucao('2026-07-15', '').length, 3)
})

// ── avisoRetirada / avisoDevolucao ─────────────────────────
test('avisoDevolucao: fora da janela da loja, avisa que só o aeroporto atende', () => {
  const html = avisoDevolucao('2026-07-15', '19:00')
  assert.match(html, /Estacionamento Leva e Trás/)
})

test('avisoDevolucao: dentro da janela normal, sem aviso', () => {
  assert.equal(avisoDevolucao('2026-07-15', '12:00'), '')
})

// ── taxa automática de devolução no aeroporto ──────────────
test('isAddAero: reconhece o adicional pelo nome (case-insensitive)', () => {
  assert.equal(isAddAero({ nome: 'Devolucao no Aeroporto' }), true)
  assert.equal(isAddAero({ nome: 'Cadeirinha Infantil' }), false)
})

test('syncAeroAdd: local aeroporto adiciona a taxa automaticamente', () => {
  S.devLocal = AEROPORTO.nome
  syncAeroAdd()
  assert.equal(S.adicionais_sel.length, 1)
  assert.equal(S.adicionais_sel[0].auto, true)
  assert.equal(S.adicionais_sel[0].id, 'taxa-aero')
})

test('syncAeroAdd: voltar para local não-aeroporto remove a taxa automática (mas não uma manual)', () => {
  S.devLocal = AEROPORTO.nome
  syncAeroAdd()
  S.devLocal = CENTRO.nome
  syncAeroAdd()
  assert.equal(S.adicionais_sel.length, 0)
})

test('localIsAero', () => {
  assert.equal(localIsAero(AEROPORTO.nome), true)
  assert.equal(localIsAero(CENTRO.nome), false)
  assert.equal(localIsAero('local inexistente'), false)
})

// ── janelaTexto / nomeCurto ─────────────────────────────────
test('janelaTexto: local com janela definida formata hh:mm sem segundos', () => {
  const local = { hora_devolucao_inicio: '08:00:00', hora_devolucao_fim: '18:00:00' }
  assert.equal(janelaTexto(local, 'devolução'), 'das 08:00 às 18:00')
})

test('janelaTexto: local sem janela (24h) retorna texto de horário integral', () => {
  assert.equal(janelaTexto(AEROPORTO, 'devolução'), 'em horário integral (24h)')
})

test('nomeCurto: corta no travessão e escapa HTML', () => {
  assert.equal(nomeCurto('Av. Brasil, 90 — Centro'), 'Av. Brasil, 90')
  assert.equal(nomeCurto('<script>x</script> — Y'), '&lt;script&gt;x&lt;/script&gt;')
})

// ── revalidarLocaisPeriodo (bug do usuário, reproduzido) ───
test('revalidarLocaisPeriodo: devHora fora da janela da loja troca automaticamente para o aeroporto e avisa', () => {
  S.devLocal = CENTRO.nome
  S.devHora  = '19:00' // fora de 08:00–18:00
  const aviso = revalidarLocaisPeriodo()
  assert.equal(S.devLocal, AEROPORTO.nome)
  assert.match(aviso, /Local de devolução atualizado/)
  assert.match(aviso, /24 horas/)
})

test('revalidarLocaisPeriodo: devHora dentro da janela não altera nada e não avisa', () => {
  S.devLocal = CENTRO.nome
  S.devHora  = '12:00'
  const aviso = revalidarLocaisPeriodo()
  assert.equal(S.devLocal, CENTRO.nome)
  assert.equal(aviso, null)
})

test('revalidarLocaisPeriodo: retLocal fora da janela é limpo quando há mais de uma alternativa ambígua', () => {
  // Cenário sintético: dois locais de retirada 24h ficam válidos
  // simultaneamente fora da janela do Centro, então não há escolha
  // automática segura — o local é limpo em vez de adivinhar qual o
  // cliente queria (aeroporto nunca conta, pois não permite retirada).
  S.locais = [
    CENTRO,
    { ...CATARATAS, hora_retirada_inicio: null, hora_retirada_fim: null },
    { ...AEROPORTO, permite_retirada: true, nome: 'Outro ponto 24h — Retirada' },
  ]
  S.retLocal = CENTRO.nome
  S.retHora  = '19:00'
  const aviso = revalidarLocaisPeriodo()
  assert.equal(S.retLocal, '')
  assert.match(aviso, /Local de retirada removido/)
})

test('revalidarLocaisPeriodo: sem local selecionado, não faz nada', () => {
  assert.equal(revalidarLocaisPeriodo(), null)
})
