// ── UI FLUTUANTE (toasts e modais) ─────────────────────────
// Widgets genéricos, sem regra de negócio — quem chama decide o texto.
import { S } from './state.js'

export function showToast(msg, type = 'info') {
  const colors = { info: '#d1ecf1:#0c5460:#bee5eb', warning: '#fff3cd:#856404:#ffc107', error: '#f8d7da:#721c24:#f5c6cb' }
  const [bg, text, border] = (colors[type] || colors.info).split(':')
  const el = document.createElement('div')
  el.style.cssText = `position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:9999;background:${bg};color:${text};border:1.5px solid ${border};border-radius:10px;padding:12px 20px;font-size:13px;max-width:360px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.15);animation:fadeIn .2s ease`
  el.textContent = msg
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 4000)
}

// Pop-up de aviso (ex.: troca automática de local por horário — ver
// locations.js/revalidarLocaisPeriodo). Genérico: só recebe o HTML do corpo.
export function showLocationModal(html) {
  document.querySelectorAll('.modal-overlay').forEach(el => el.remove())
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-label="Aviso sobre local da reserva">
      <button type="button" class="modal-close" aria-label="Fechar aviso">✕</button>
      <div class="modal-body">${html}</div>
      <button type="button" class="btn btn-primary modal-ok">Entendi</button>
    </div>`
  document.body.appendChild(overlay)
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey) }
  const onKey = e => { if (e.key === 'Escape') close() }
  overlay.querySelector('.modal-close').addEventListener('click', close)
  overlay.querySelector('.modal-ok').addEventListener('click', close)
  overlay.addEventListener('click', e => { if (e.target === overlay) close() })
  document.addEventListener('keydown', onKey)
  overlay.querySelector('.modal-ok').focus()
}

// Confirmação obrigatória antes de avançar sem proteção — modifica S.protId/
// S.step diretamente e re-renderiza, por isso depende de render() (injetado
// pelo chamador para evitar import circular com render.js).
export function mostrarModalSemProtecao(renderStep) {
  const overlay = document.createElement('div')
  overlay.id = 'modal-sem-prot'
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;
    display:flex;align-items:center;justify-content:center;padding:16px`

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;max-width:460px;width:100%;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.25)">
      <div style="font-size:32px;text-align:center;margin-bottom:12px">⚠️</div>
      <h3 style="text-align:center;font-size:18px;color:#1a2332;margin-bottom:16px">Locação Sem Proteção</h3>
      <p style="font-size:14px;color:#374151;line-height:1.65;margin-bottom:12px">
        Ao optar por não contratar nenhuma proteção, você assume <strong>100% da responsabilidade</strong>
        por danos ao veículo e a terceiros.
      </p>
      <p style="font-size:14px;color:#374151;line-height:1.65;margin-bottom:20px">
        Nesta modalidade, a <strong>caução exigida é de R$ 25.000,00</strong>, bloqueada no limite
        do seu cartão de crédito até a devolução do veículo.
      </p>
      <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin-bottom:24px;background:#fef9ec;border:1.5px solid #fbbf24;border-radius:10px;padding:12px">
        <input type="checkbox" id="chk-sem-prot" style="margin-top:2px;width:16px;height:16px;flex-shrink:0;cursor:pointer">
        <span style="font-size:13px;color:#374151;line-height:1.5">
          Declaro que li e estou de acordo com estas condições.<br>
          <strong>Estou de acordo e desejo continuar sem proteção.</strong>
        </span>
      </label>
      <div style="display:flex;gap:10px">
        <button id="btn-modal-cancelar" style="flex:1;padding:12px;border:1.5px solid #e2e8f0;background:#fff;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;color:#374151">
          Escolher uma proteção
        </button>
        <button id="btn-modal-confirmar" style="flex:1;padding:12px;background:#FF6B00;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;color:#fff;opacity:.4;pointer-events:none">
          Continuar sem proteção
        </button>
      </div>
    </div>`

  document.body.appendChild(overlay)

  const chk     = document.getElementById('chk-sem-prot')
  const btnConf = document.getElementById('btn-modal-confirmar')
  const btnCanc = document.getElementById('btn-modal-cancelar')

  chk.addEventListener('change', () => {
    btnConf.style.opacity        = chk.checked ? '1'    : '.4'
    btnConf.style.pointerEvents  = chk.checked ? 'auto' : 'none'
  })

  btnCanc.addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })
  overlay.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.remove() })
  setTimeout(() => btnCanc.focus(), 50)

  btnConf.addEventListener('click', () => {
    overlay.remove()
    S.protId = null
    S.step++
    renderStep()
  })
}
