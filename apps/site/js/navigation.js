// ── NAVIGATION ─────────────────────────────────────────────
import { S } from './state.js'
import { calcDias } from './pricing-adapter.js'
import { validate } from './validation.js'
import { renderStep } from './render.js'

window.nextStep = function() {
  if (!validate(renderStep)) return
  if (S.step < 4) { S.step++; renderStep() }
}

window.prevStep = function() {
  if (S.step > 1) { S.step--; renderStep() }
  // step 1 é a primeira tela, não volta mais
}

// Clique direto num passo da steps-bar. Só navega para passos já alcançados
// nesta sessão (S.maxStep) — pular à frente ainda exige passar por nextStep()
// (validação de cada etapa), então isso é puramente navegação de "voltar rápido".
//
// Diferente de nextStep(), aqui não há garantia de que os dados do Step 1
// ainda são válidos: o cliente pode ter voltado ao Step 1, editado
// data/hora/local para uma combinação inconsistente (ex.: devolução antes
// da retirada) e clicado direto num chip à frente — sem passar pelo
// validate() que barra isso em nextStep(). Por isso recalculamos e
// reconferimos o essencial do período aqui antes de permitir avançar; se
// inválido, força a permanência no Step 1 com o erro em destaque.
window.goToStep = function(n) {
  if (n < 1 || n > 4 || n === S.step || n > (S.maxStep || 1)) return

  if (n > 1) {
    calcDias()
    if (S.dias <= 0 || !S.retLocal || !S.devLocal || !S.catId) {
      if (S.step !== 1) { S.step = 1; renderStep() }
      validate(renderStep)
      return
    }
  }

  S.step = n
  renderStep()
}
