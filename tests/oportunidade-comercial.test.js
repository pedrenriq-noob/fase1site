import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filtrarOportunidadesComerciais } from '../apps/frota-ops/js/services/oportunidade-comercial.js'

function janela({ inicio, fim, categoria = 'B', veiculos_livres = 1 }) {
  const i = new Date(inicio)
  const f = new Date(fim)
  return { categoria, veiculos_livres, inicio: i, fim: f, duracao_horas: (f - i) / 3600000 }
}

test('Regra 1: janela com mais de 30h passa, com exatamente 30h ou menos é descartada', () => {
  const j40h = janela({ inicio: '2026-07-10T08:00:00', fim: '2026-07-12T00:00:00' }) // 40h
  const j30h = janela({ inicio: '2026-07-10T08:00:00', fim: '2026-07-11T14:00:00' }) // exatamente 30h
  const j20h = janela({ inicio: '2026-07-10T08:00:00', fim: '2026-07-11T04:00:00' }) // 20h

  const resultado = filtrarOportunidadesComerciais([j40h, j30h, j20h])
  assert.equal(resultado.length, 1)
  assert.equal(resultado[0].duracao_horas, 40)
})

test('Regra 2: período consultado recorta a janela; sem sobreposição descarta', () => {
  const j = janela({ inicio: '2026-07-10T08:00:00', fim: '2026-07-15T08:00:00' }) // 120h
  const periodoInicio = new Date('2026-07-12T00:00:00')
  const periodoFim = new Date('2026-07-13T12:00:00') // 36h de interseção, > 30h (Regra 1)

  const resultado = filtrarOportunidadesComerciais([j], { periodoInicio, periodoFim })
  assert.equal(resultado.length, 1)
  assert.equal(resultado[0].inicio.getTime(), periodoInicio.getTime())
  assert.equal(resultado[0].fim.getTime(), periodoFim.getTime())

  const foraDoPeriodo = filtrarOportunidadesComerciais([j], {
    periodoInicio: new Date('2026-08-01T00:00:00'),
    periodoFim: new Date('2026-08-05T00:00:00')
  })
  assert.equal(foraDoPeriodo.length, 0)
})

test('Regra 5: retirada fora do horário do local avança para o próximo horário válido', () => {
  // Veículo livre às 22:30 de sexta, local só aceita retirada 08:00-19:00, aberto todo dia
  const j = janela({ inicio: '2026-07-10T22:30:00', fim: '2026-07-14T10:00:00' }) // sexta 22:30 -> terça 10:00
  const horarioLocal = {
    hora_retirada_inicio: '08:00', hora_retirada_fim: '19:00',
    hora_devolucao_inicio: '08:00', hora_devolucao_fim: '19:00',
    disponivel_domingo: true
  }
  const [resultado] = filtrarOportunidadesComerciais([j], { horarioLocal })
  assert.ok(resultado)
  assert.equal(resultado.inicio.toISOString(), new Date('2026-07-11T08:00:00').toISOString())
})

test('Regra 5: domingo fechado pula retirada para segunda', () => {
  // 2026-07-12 é domingo
  const j = janela({ inicio: '2026-07-11T20:00:00', fim: '2026-07-15T18:00:00' })
  const horarioLocal = {
    hora_retirada_inicio: '08:00', hora_retirada_fim: '18:00',
    hora_devolucao_inicio: '08:00', hora_devolucao_fim: '18:00',
    disponivel_domingo: false
  }
  const [resultado] = filtrarOportunidadesComerciais([j], { horarioLocal })
  assert.ok(resultado)
  // sábado 11/07 20:00 já fora do horário -> próximo dia (domingo) fechado -> segunda 13/07 08:00
  assert.equal(resultado.inicio.toISOString(), new Date('2026-07-13T08:00:00').toISOString())
})

test('Regra 5: horário noturno (inicio > fim, atravessa meia-noite) aceita devolução fora do intervalo diurno', () => {
  const j = janela({ inicio: '2026-07-10T09:00:00', fim: '2026-07-12T09:00:00' }) // 48h
  const horarioLocal = {
    hora_retirada_inicio: null, hora_retirada_fim: null,
    hora_devolucao_inicio: '18:01', hora_devolucao_fim: '07:59', // aceita devolução à noite/madrugada
    disponivel_domingo: true
  }
  const [resultado] = filtrarOportunidadesComerciais([j], { horarioLocal })
  assert.ok(resultado)
  // fim bruto 12/07 09:00 está fora da janela noturna (09:00 não é >=18:01 nem <=07:59)
  // deve retroceder até 12/07 07:59
  assert.equal(resultado.fim.toISOString(), new Date('2026-07-12T07:59:00').toISOString())
})

test('horarioLocal null (pátio sem local vinculado) não aplica nenhum recorte de horário', () => {
  const j = janela({ inicio: '2026-07-10T22:30:00', fim: '2026-07-14T10:00:00' })
  const resultado = filtrarOportunidadesComerciais([j], { horarioLocal: null })
  assert.equal(resultado.length, 1)
  assert.equal(resultado[0].inicio.toISOString(), j.inicio.toISOString())
})

test('Regra 10: diárias recomendadas = piso(horas/24), devolução máxima nunca excede o fim', () => {
  const j40h = janela({ inicio: '2026-07-10T09:00:00', fim: '2026-07-12T01:00:00' }) // 40h
  const [r40] = filtrarOportunidadesComerciais([j40h])
  assert.equal(r40.recomendacao.diarias, 1)
  assert.equal(r40.recomendacao.devolucaoMaxima.toISOString(), new Date('2026-07-11T09:00:00').toISOString())

  const j50h = janela({ inicio: '2026-07-10T09:00:00', fim: '2026-07-12T11:00:00' }) // 50h
  const [r50] = filtrarOportunidadesComerciais([j50h])
  assert.equal(r50.recomendacao.diarias, 2)
})

test('Regra 8: ordena por maior duração e, empatado, por menor início', () => {
  const curta = janela({ inicio: '2026-07-10T08:00:00', fim: '2026-07-11T20:00:00' }) // 36h
  const longaDepois = janela({ inicio: '2026-07-15T08:00:00', fim: '2026-07-17T08:00:00' }) // 48h
  const longaAntes = janela({ inicio: '2026-07-10T08:00:00', fim: '2026-07-12T08:00:00' }) // 48h

  const resultado = filtrarOportunidadesComerciais([curta, longaDepois, longaAntes])
  assert.equal(resultado.length, 3)
  assert.equal(resultado[0].inicio.toISOString(), longaAntes.inicio.toISOString()) // 48h, início mais cedo
  assert.equal(resultado[1].inicio.toISOString(), longaDepois.inicio.toISOString()) // 48h, início mais tarde
  assert.equal(resultado[2].duracao_horas, 36)
})

test('função pura: mesma entrada produz sempre a mesma saída', () => {
  const j = janela({ inicio: '2026-07-10T08:00:00', fim: '2026-07-12T08:00:00' })
  const a = filtrarOportunidadesComerciais([j])
  const b = filtrarOportunidadesComerciais([j])
  assert.deepEqual(a, b)
})
