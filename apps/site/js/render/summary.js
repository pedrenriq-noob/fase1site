// ── SIDEBAR RESUMO ─────────────────────────────────────────
import { S, saveSession } from '../state.js'
import { esc, fmtN, minDate } from '../utils.js'
import { getPreco, calcDias } from '../pricing-adapter.js'
import { revalidarLocaisPeriodo } from '../locations.js'
import { showLocationModal } from '../ui.js'
import { renderHoraPicker } from './hora-picker.js'
import { updateMobileBar } from './mobile.js'
import { renderStep1 } from './step1.js'

export function updateSummary() {
  const el = document.getElementById('summaryContent')
  if (!el || S.step === 4) return

  const cat  = S.categorias.find(x => x.id === S.catId)
  const prot = S.protecoes.find(x => x.id === S.protId)

  const backBtn = S.step >= 1 ? `<button class="btn btn-secondary" onclick="prevStep()" style="min-width:70px">← Voltar</button>` : ''
  const nextBtn = `<button class="btn btn-primary" onclick="nextStep()" style="flex:1">Avançar →</button>`
  const btns    = `<div style="display:flex;gap:8px;margin-top:14px">${backBtn}${nextBtn}</div>`

  // Period editor — shared between cat and no-cat paths
  const diasLabel = S.dias > 0
    ? `${Number.isInteger(S.dias) ? S.dias : S.dias.toFixed(1).replace('.', ',')} diária${S.dias !== 1 ? 's' : ''}`
    : ''
  const periodEditor = `
    <div class="sb-period">
      <div class="sb-period-label">📅 Período</div>
      <div class="sb-period-row">
        <span>Retirada</span>
        <div class="sb-date-group">
          <input type="date" id="sb-retData" class="sb-input" value="${S.retData}" min="${minDate()}">
          ${renderHoraPicker('sb-retHora', 8, 18, S.retHora, 'Hora de retirada')}
        </div>
      </div>
      <div class="sb-period-row">
        <span>Devolução</span>
        <div class="sb-date-group">
          <input type="date" id="sb-devData" class="sb-input" value="${S.devData}" min="${S.retData || minDate()}">
          ${renderHoraPicker('sb-devHora', 0, 23, S.devHora, 'Hora de devolução')}
        </div>
      </div>
      ${diasLabel ? `<div class="sb-dias">${diasLabel}</div>` : ''}
    </div>`

  if (!cat) {
    el.innerHTML = `
      ${periodEditor}
      <p style="color:var(--muted);font-size:13px;margin-bottom:16px">Escolha uma categoria de veículo.</p>
      ${btns}`
    bindSbPeriod()
    renderUpgradeBlocks(null, 0, 0, 0)
    return
  }

  const preco   = getPreco(cat)
  const dias    = S.dias || 1
  const baseCat = preco * dias
  const baseProt = prot ? (prot.tipo_preco === 'per_day' ? prot.preco * dias : prot.preco) : 0
  const totalAdd = S.adicionais_sel.reduce((s, a) => s + a.subtotal, 0)
  const total    = baseCat + baseProt + totalAdd

  const diasFmt = Number.isInteger(dias) ? dias : dias.toFixed(1).replace('.', ',')

  const img = cat.imagem_url
    ? `<img src="${esc(cat.imagem_url)}" style="width:100%;height:90px;object-fit:cover;border-radius:8px;margin-bottom:12px;display:block" onerror="this.style.display='none'">`
    : ''

  const catOpts = S.categorias.map(c => {
    return `<option value="${c.id}"${c.id === S.catId ? ' selected' : ''}>${esc(c.nome)} — R$ ${fmtN(getPreco(c))}</option>`
  }).join('')

  let items = `
    <div class="summary-item"><span style="font-weight:600">${esc(cat.nome)}</span><span>R$ ${fmtN(baseCat)}</span></div>
    <div style="font-size:11px;color:var(--muted);padding:0 0 6px">${diasFmt} diárias × R$ ${fmtN(preco)}</div>`

  if (prot) items += `<div class="summary-item"><span>🛡 ${esc(prot.nome)}</span><span>R$ ${fmtN(baseProt)}</span></div>`

  S.adicionais_sel.forEach(a => {
    items += `<div class="summary-item"><span>➕ ${esc(a.nome)}${a.quantidade > 1 ? ` (${a.quantidade}×)` : ''}</span><span>R$ ${fmtN(a.subtotal)}</span></div>`
  })

  el.innerHTML = `
    ${img}
    <div style="margin-bottom:10px">
      <label style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;display:block">Veículo</label>
      <select onchange="selectCat(this.value)" style="width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:12px;font-family:Inter,sans-serif;color:var(--text);background:white;outline:none">
        ${catOpts}
      </select>
    </div>
    ${periodEditor}
    ${items}
    <div class="summary-total">R$ ${fmtN(total)}</div>
    ${btns}`

  updateMobileBar()
  bindSbPeriod()
  renderUpgradeBlocks(cat, baseProt, totalAdd, dias)
}

// ── UPGRADE DE CATEGORIA (sidebar, a partir do step 2) ─────
// Mostra até 3 categorias mais caras que a selecionada, cada uma já
// com o valor TOTAL da reserva (mesma proteção/adicionais atuais) caso
// o cliente troque. Clique troca a categoria imediatamente — mesma
// função usada pelos cards do Step 1 (selectCat, ver render/step1.js).
export function renderUpgradeBlocks(cat, baseProt, totalAdd, dias) {
  const box = document.getElementById('summaryUpgrade')
  if (!box) return

  if (!cat || S.step < 2) { box.innerHTML = ''; return }

  const precoAtual = getPreco(cat)
  const candidatas = S.categorias
    .filter(c => c.id !== cat.id && getPreco(c) > precoAtual)
    .sort((a, b) => getPreco(a) - getPreco(b))
    .slice(0, 3)

  if (!candidatas.length) { box.innerHTML = ''; return }

  box.innerHTML = `
    <div class="summary-upgrade">
      <div class="summary-upgrade-title">Que tal um upgrade?</div>
      ${candidatas.map(c => {
        const cPreco = getPreco(c)
        const cTotal = cPreco * dias + baseProt + totalAdd
        return `<div class="summary-upgrade-card" role="button" tabindex="0"
             onclick="selectCat('${c.id}')"
             onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectCat('${c.id}')}"
             aria-label="Trocar para ${esc(c.nome)}, total R$ ${fmtN(cTotal)}">
          <span class="summary-upgrade-cat">${esc(c.nome)}</span>
          <span class="summary-upgrade-price">Total: R$ ${fmtN(cTotal)}</span>
        </div>`
      }).join('')}
    </div>`
}

export function bindSbPeriod() {
  document.getElementById('sb-retData')?.addEventListener('change', e => {
    S.retData = e.target.value
    const devEl = document.getElementById('sb-devData')
    if (devEl) {
      devEl.min = S.retData
      S.devData = S.retData
      devEl.value = S.retData
    }
    calcDiasThenRevalidate()
  })
  document.getElementById('sb-devData')?.addEventListener('change', e => {
    S.devData = e.target.value
    calcDiasThenRevalidate()
  })
}

function calcDiasThenRevalidate() {
  calcDias()
  const aviso = revalidarLocaisPeriodo()
  if (S.step === 1) renderStep1(document.getElementById('content'))
  updateSummary()
  saveSession()
  if (aviso) showLocationModal(aviso)
}
