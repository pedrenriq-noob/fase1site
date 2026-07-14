// ── VALIDAÇÃO POR STEP ─────────────────────────────────────
import { S } from './state.js'
import { calcDias } from './pricing-adapter.js'
import { validarCPF } from './utils.js'
import { mostrarModalSemProtecao } from './ui.js'

export function clearFieldErrors() {
  document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'))
  document.querySelectorAll('.field-error').forEach(el => el.remove())
}

export function markErr(fieldId, msg) {
  const el = document.getElementById(fieldId)
  if (!el) return
  el.classList.add('input-error')
  if (!msg) return
  // Insert after date-time-group when applicable, otherwise after the element itself
  const insertTarget = el.closest('.date-time-group') ?? el
  insertTarget.parentElement?.querySelector('.field-error')?.remove()
  insertTarget.insertAdjacentHTML('afterend', `<span class="field-error" role="alert">${msg}</span>`)
}

function scrollToFirstError() {
  const first = document.querySelector('.input-error')
  if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

// renderStep é injetado pelo chamador (navigation.js) para permitir que
// mostrarModalSemProtecao re-renderize após o cliente confirmar seguir sem
// proteção, sem criar um import circular validation.js ⇄ render.js.
export function validate(renderStep) {
  clearFieldErrors()
  const errEl = document.getElementById(`step${S.step}-err`)
  if (errEl) errEl.innerHTML = ''

  if (S.step === 1) {
    S.retData  = document.getElementById('retData')?.value  || S.retData
    S.retHora  = document.getElementById('retHora')?.value  || S.retHora
    S.devData  = document.getElementById('devData')?.value  || S.devData
    S.devHora  = document.getElementById('devHora')?.value  || S.devHora
    S.retLocal = document.getElementById('retLocal')?.value || S.retLocal
    S.devLocal = document.getElementById('devLocal')?.value || S.devLocal

    let hasErr = false
    if (!S.devLocal) { markErr('devLocal', 'Selecione o local de devolução.');  hasErr = true }
    if (!S.retLocal) { markErr('retLocal', 'Selecione o local de retirada.');   hasErr = true }
    if (!S.devHora)  { markErr('devHora',  'Informe o horário de devolução.');  hasErr = true }
    if (!S.devData)  { markErr('devData',  'Informe a data de devolução.');     hasErr = true }
    if (!S.retHora)  { markErr('retHora',  'Informe o horário de retirada.');   hasErr = true }
    if (!S.retData)  { markErr('retData',  'Informe a data de retirada.');      hasErr = true }
    if (hasErr) { scrollToFirstError(); return false }

    calcDias()
    if (S.dias <= 0) {
      markErr('devHora', 'O horário de devolução deve ser posterior ao de retirada.')
      scrollToFirstError(); return false
    }
    if (!S.catId) {
      if (errEl) errEl.innerHTML = `<div class="step-error">Selecione uma categoria de veículo.</div>`
      document.getElementById('catGrid')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return false
    }
  }

  if (S.step === 2 && !S.protId) {
    mostrarModalSemProtecao(renderStep)
    return false
  }

  if (S.step === 4) {
    S.estrangeiro = document.getElementById('cli-estrangeiro')?.checked || false
    S.nome        = document.getElementById('cli-nome')?.value.trim()   || ''
    S.cpf         = S.estrangeiro
      ? (document.getElementById('cli-doc')?.value.trim()  || '')
      : (document.getElementById('cli-cpf')?.value.trim()  || '')
    S.whatsapp    = document.getElementById('cli-wpp')?.value.trim()    || ''
    S.email       = document.getElementById('cli-email')?.value.trim()  || ''
    S.companhia   = document.getElementById('cli-companhia')?.value     || ''
    S.voo         = document.getElementById('cli-voo')?.value.trim()    || ''
    S.pouso       = document.getElementById('cli-pouso')?.value         || ''
    S.pessoas     = Number(document.getElementById('cli-pessoas')?.value) || 1
    S.obs         = document.getElementById('cli-obs')?.value.trim()    || ''
    S.termos      = document.getElementById('cli-termos')?.checked      || false

    let hasErr = false
    const cat  = S.categorias.find(x => x.id === S.catId)
    if (S.pessoas > (cat?.max_pessoas ?? 5)) { markErr('cli-pessoas', `Máximo ${cat?.max_pessoas ?? 5} pessoas para este veículo.`); hasErr = true }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(S.email)) { markErr('cli-email', 'Informe um e-mail válido.'); hasErr = true }
    if (S.whatsapp.replace(/\D/g,'').length < 10) { markErr('cli-wpp', 'Informe um WhatsApp válido com DDD.');                      hasErr = true }
    if (!S.estrangeiro && !validarCPF(S.cpf)) { markErr('cli-cpf',   'CPF inválido. Verifique os números.');                        hasErr = true }
    if (S.estrangeiro && !S.cpf)              { markErr('cli-doc',   'Informe o documento de identificação.');                       hasErr = true }
    if (!S.nome)                             { markErr('cli-nome',   'Informe seu nome completo.');                                  hasErr = true }
    if (!S.termos) {
      if (errEl) errEl.innerHTML = `<div class="step-error">Você deve declarar estar ciente das informações importantes.</div>`
      hasErr = true
    }
    if (hasErr) { scrollToFirstError(); return false }
  }

  return true
}
