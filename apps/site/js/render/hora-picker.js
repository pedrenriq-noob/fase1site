// ── SELETOR DE HORA (widget compartilhado) ─────────────────
// Usado tanto no Step 1 (ids 'retHora'/'devHora') quanto na sidebar
// (ids 'sb-retHora'/'sb-devHora' — ver render/summary.js).
import { S, saveSession } from '../state.js'
import { esc, pad } from '../utils.js'
import { calcDias } from '../pricing-adapter.js'
import { revalidarLocaisPeriodo } from '../locations.js'
import { showLocationModal } from '../ui.js'
import { renderStep1 } from './step1.js'
import { updateSummary } from './summary.js'

export function renderHoraPicker(id, from, to, sel, ariaLabel) {
  let opts = ''
  for (let h = from; h <= to; h++)
    for (let m = 0; m < 60; m += 30) {
      const v = pad(h) + ':' + pad(m)
      opts += `<div class="hora-opt${v === sel ? ' selected' : ''}" onclick="selectHora('${id}','${v}')">${v}</div>`
    }
  const label = sel || 'Hora'
  return `
    <div class="hora-picker">
      <button type="button" id="${id}" class="hora-btn${sel ? '' : ' placeholder'}"
        onclick="toggleHoraPicker('${id}')"
        aria-label="${ariaLabel}" aria-haspopup="listbox" aria-expanded="false">
        <span>${esc(label)}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="hora-dropdown" id="${id}-dropdown" role="listbox">${opts}</div>
    </div>`
}

window.toggleHoraPicker = function(id) {
  const dd  = document.getElementById(`${id}-dropdown`)
  const btn = document.getElementById(id)
  if (!dd || !btn) return
  const isOpen = dd.classList.contains('open')
  // Fecha todos antes
  document.querySelectorAll('.hora-dropdown.open').forEach(el => el.classList.remove('open'))
  document.querySelectorAll('.hora-btn.open').forEach(el => {
    el.classList.remove('open'); el.setAttribute('aria-expanded', 'false')
  })
  if (!isOpen) {
    dd.classList.add('open')
    btn.classList.add('open')
    btn.setAttribute('aria-expanded', 'true')
    // Scroll até a opção selecionada
    requestAnimationFrame(() => {
      const sel = dd.querySelector('.hora-opt.selected')
      if (sel) sel.scrollIntoView({ block: 'nearest' })
    })
  }
}

window.selectHora = function(id, value) {
  if (id === 'retHora' || id === 'sb-retHora') {
    S.retHora = value
    S.devHora = value
  }
  if (id === 'devHora' || id === 'sb-devHora') S.devHora = value
  calcDias()
  if (id.startsWith('sb-')) {
    const aviso = revalidarLocaisPeriodo()
    if (S.step === 1) renderStep1(document.getElementById('content'))
    updateSummary()
    saveSession()
    if (aviso) showLocationModal(aviso)
  } else {
    renderStep1(document.getElementById('content'))
    updateSummary()
  }
}

// Fecha os hora-pickers ao clicar fora — registrado uma única vez pelo boot.
export function bindCloseHoraPickerOnOutsideClick() {
  document.addEventListener('click', e => {
    if (!e.target.closest('.hora-picker')) {
      document.querySelectorAll('.hora-dropdown.open').forEach(el => el.classList.remove('open'))
      document.querySelectorAll('.hora-btn.open').forEach(el => {
        el.classList.remove('open'); el.setAttribute('aria-expanded', 'false')
      })
    }
  })
}
