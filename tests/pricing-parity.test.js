// Tripwire: as cópias distribuídas do módulo canônico de pricing devem ser
// equivalentes à fonte em supabase/functions/_shared/pricing.js.
// (Cópias físicas existem porque cada superfície é servida de uma raiz
// diferente sem build step — ver ADR-001. Este teste transforma a duplicação
// em duplicação verificada: divergiu, quebrou.)
//
// Ao alterar a regra de preço: edite a fonte canônica e regenere as cópias:
//   cp supabase/functions/_shared/pricing.js apps/site/shared/pricing.js
//   cp supabase/functions/_shared/pricing.js apps/intake-admin/shared/pricing.js
//   sed 's/^export //' supabase/functions/_shared/pricing.js > extensions/cotacao-rapida/shared/pricing.js

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const CANONICO = 'supabase/functions/_shared/pricing.js'

// Cópias ES module: byte-idênticas à fonte canônica.
const COPIAS_ESM = [
  'apps/site/shared/pricing.js',
  'apps/intake-admin/shared/pricing.js',
]

// Cópias classic-script: a fonte canônica com "export " removido do início
// de cada linha (a extensão não suporta ES modules — ver DT-01 em sidebar.js).
const COPIAS_CLASSIC = [
  'extensions/cotacao-rapida/shared/pricing.js',
]

const fonte = readFileSync(CANONICO, 'utf8')
const fonteClassic = fonte.replace(/^export /gm, '')

for (const copia of COPIAS_ESM) {
  test(`paridade (ESM): ${copia} é idêntico à fonte canônica`, () => {
    assert.equal(readFileSync(copia, 'utf8'), fonte,
      `${copia} divergiu de ${CANONICO} — copie a fonte canônica por cima.`)
  })
}

for (const copia of COPIAS_CLASSIC) {
  test(`paridade (classic script): ${copia} é a fonte canônica sem "export "`, () => {
    assert.equal(readFileSync(copia, 'utf8').replace(/^\/\/ =+\n(?:\/\/.*\n)*\/\/ =+\n\n/, ''),
      fonteClassic.replace(/^\/\/ =+\n(?:\/\/.*\n)*\/\/ =+\n\n/, ''),
      `${copia} divergiu de ${CANONICO} — regenere com: sed 's/^export //' ${CANONICO} > ${copia} (mantendo o cabeçalho próprio do arquivo).`)
  })
}
