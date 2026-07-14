// ── RENDER STEP (orquestrador) ─────────────────────────────
import { S, saveSession } from './state.js'
import { renderStep1 } from './render/step1.js'
import { renderStep2 } from './render/step2.js'
import { renderStep3 } from './render/step3.js'
import { renderStep4 } from './render/step4.js'
import { updateSummary } from './render/summary.js'
import { ensureMobileBar, updateMobileBar } from './render/mobile.js'

export function renderStep() {
  const content  = document.getElementById('content')
  const app      = document.getElementById('app')
  const stepsBar = document.getElementById('steps-bar')
  const summary  = document.getElementById('summary')

  app?.classList.toggle('step-final', S.step === 4)
  S.maxStep = Math.max(S.maxStep || 1, S.step)

  if (stepsBar) stepsBar.style.display = ''
  if (summary)  summary.style.display  = S.step === 4 ? 'none' : ''

  const prog = document.getElementById('progress')
  if (prog) prog.style.width = `${(S.step / 4) * 100}%`
  document.querySelectorAll('.step').forEach((el, i) => {
    const n = i + 1
    const reachable = n <= S.maxStep && n !== S.step
    el.classList.toggle('active', n === S.step)
    el.classList.toggle('reachable', reachable)
    el.setAttribute('role', 'button')
    el.setAttribute('tabindex', reachable ? '0' : '-1')
    el.setAttribute('aria-current', n === S.step ? 'step' : 'false')
    el.setAttribute('aria-disabled', reachable ? 'false' : 'true')
  })

  if      (S.step === 1) renderStep1(content)
  else if (S.step === 2) renderStep2(content)
  else if (S.step === 3) renderStep3(content)
  else if (S.step === 4) renderStep4(content)

  // Mobile bar: inject once, hide no step 4
  ensureMobileBar()
  const mBar = document.getElementById('mobile-bar')
  if (mBar) mBar.style.display = S.step === 4 ? 'none' : ''

  updateSummary()
  updateMobileBar()
  saveSession()
  window.scrollTo(0, 0)
}
