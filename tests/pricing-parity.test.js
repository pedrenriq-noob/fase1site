// Tripwire: as cópias distribuídas do módulo canônico de pricing devem ser
// BYTE-IDÊNTICAS à fonte em supabase/functions/_shared/pricing.js.
// (Cópias físicas existem porque cada superfície é servida de uma raiz
// diferente sem build step — ver ADR-001. Este teste transforma a duplicação
// em duplicação verificada: divergiu, quebrou.)
//
// Ao alterar a regra de preço: edite a fonte canônica e rode
//   cp supabase/functions/_shared/pricing.js apps/site/shared/pricing.js

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const CANONICO = 'supabase/functions/_shared/pricing.js'
const COPIAS = [
  'apps/site/shared/pricing.js',
  'apps/intake-admin/shared/pricing.js',
]

const fonte = readFileSync(CANONICO, 'utf8')

for (const copia of COPIAS) {
  test(`paridade: ${copia} é idêntico à fonte canônica`, () => {
    assert.equal(readFileSync(copia, 'utf8'), fonte,
      `${copia} divergiu de ${CANONICO} — copie a fonte canônica por cima.`)
  })
}
