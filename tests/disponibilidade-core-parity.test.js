// Tripwire: a cópia física do núcleo de disponibilidade deve ser idêntica à
// fonte canônica. (Cópia física existe porque frota-ops é servido de uma raiz
// diferente da Edge Function, sem build step — ver ADR-001/ADR-004. Este
// teste transforma a duplicação em duplicação verificada: divergiu, quebrou.)
//
// Ao alterar a regra: edite a fonte canônica e regenere a cópia:
//   cp supabase/functions/_shared/disponibilidade-core.js apps/frota-ops/js/disponibilidade-core.js

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const CANONICO = 'supabase/functions/_shared/disponibilidade-core.js'
const COPIA = 'apps/frota-ops/js/disponibilidade-core.js'

test(`paridade: ${COPIA} é idêntico à fonte canônica`, () => {
  assert.equal(readFileSync(COPIA, 'utf8'), readFileSync(CANONICO, 'utf8'),
    `${COPIA} divergiu de ${CANONICO} — copie a fonte canônica por cima.`)
})
