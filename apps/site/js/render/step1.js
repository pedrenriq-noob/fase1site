// ── STEP 1 — PERÍODO + CATEGORIA ──────────────────────────
import { S, saveSession } from '../state.js'
import { esc, fmtN, minDate } from '../utils.js'
import { getPreco, calcSubtotal, calcDias, getTotalCad } from '../pricing-adapter.js'
import { locaisParaRetirada, locaisParaDevolucao, avisoRetirada, avisoDevolucao, syncAeroAdd } from '../locations.js'
import { showToast } from '../ui.js'
import { renderHoraPicker } from './hora-picker.js'
import { updateSummary } from './summary.js'
import { updateMobileBar } from './mobile.js'
import { renderStep2 } from './step2.js'
import { renderStep3 } from './step3.js'

export function renderStep1(c) {
  const locRet = locaisParaRetirada(S.retData, S.retHora)
  const locDev = locaisParaDevolucao(S.devData, S.devHora)

  // Se o local selecionado sumiu das opções disponíveis, limpa
  if (S.retLocal && !locRet.find(l => l.nome === S.retLocal)) S.retLocal = ''
  if (S.devLocal && !locDev.find(l => l.nome === S.devLocal)) { S.devLocal = ''; syncAeroAdd() }

  c.innerHTML = `
  <div class="main-content">
    <h2>📅 Período da Locação</h2>

    <div class="period-row">
      <div class="period-group">
        <label>Retirada *</label>
        <div class="dt-block">
          <div class="dt-row dt-date-row">
            <span class="dt-sub-label">Data</span>
            <input type="date" id="retData" min="${minDate()}" value="${S.retData}">
          </div>
          <div class="dt-row dt-time-row">
            <span class="dt-sub-label">Hora</span>
            ${renderHoraPicker('retHora', 8, 18, S.retHora, 'Horário de retirada')}
          </div>
        </div>
        ${avisoRetirada(S.retData, S.retHora)}
      </div>
      <div class="period-group">
        <label>Devolução *</label>
        <div class="dt-block">
          <div class="dt-row dt-date-row">
            <span class="dt-sub-label">Data</span>
            <input type="date" id="devData" min="${S.retData || minDate()}" value="${S.devData}">
          </div>
          <div class="dt-row dt-time-row">
            <span class="dt-sub-label">Hora</span>
            ${renderHoraPicker('devHora', 0, 23, S.devHora, 'Horário de devolução')}
          </div>
        </div>
        ${avisoDevolucao(S.devData, S.devHora)}
      </div>
    </div>

    <div class="location-row">
      <div>
        <label for="retLocal">Local de Retirada *</label>
        <select id="retLocal">
          <option value="">Selecione...</option>
          ${locRet.map(l => `<option value="${esc(l.nome)}"${l.nome === S.retLocal ? ' selected' : ''}>${esc(l.nome)}</option>`).join('')}
        </select>
      </div>
      <div>
        <label for="devLocal">Local de Devolução *</label>
        <select id="devLocal">
          <option value="">Selecione...</option>
          ${locDev.map(l => `<option value="${esc(l.nome)}"${l.nome === S.devLocal ? ' selected' : ''}>${esc(l.nome)}</option>`).join('')}
        </select>
      </div>
    </div>

    <h2 style="margin-top:4px">🚘 Escolha a Categoria</h2>
    <div class="category-grid" id="catGrid" role="radiogroup" aria-label="Categorias de veículos">${renderCatCards()}</div>

    <div id="step1-err"></div>
    <div class="button-group">
      <button class="btn btn-primary" onclick="nextStep()">Avançar →</button>
    </div>
  </div>`

  // Se só um local disponível na devolução, auto-seleciona
  if (locDev.length === 1 && !S.devLocal) {
    S.devLocal = locDev[0].nome
    const sel = document.getElementById('devLocal')
    if (sel) sel.value = locDev[0].nome
    syncAeroAdd()
  }

  // Eventos
  document.getElementById('retData').addEventListener('change', e => {
    S.retData = e.target.value
    const devEl = document.getElementById('devData')
    if (devEl) {
      devEl.min = S.retData
      S.devData = S.retData
      devEl.value = S.retData
    }
    calcDias(); renderStep1(c); updateSummary()
  })
  document.getElementById('devData').addEventListener('change', e => { S.devData = e.target.value; calcDias(); renderStep1(c); updateSummary() })
  document.getElementById('retLocal').addEventListener('change', e => { S.retLocal = e.target.value })
  document.getElementById('devLocal').addEventListener('change', e => { S.devLocal = e.target.value; syncAeroAdd(); updateSummary() })
}

export function renderCatCards() {
  if (!S.categorias.length) return '<p style="color:var(--muted);font-size:14px;padding:12px 0">Carregando categorias...</p>'
  return S.categorias.map(cat => {
    const preco = getPreco(cat)
    const sel      = S.catId === cat.id
    const img      = cat.imagem_url
      ? `<img src="${esc(cat.imagem_url)}" alt="${esc(cat.nome)}" class="category-img" onerror="this.style.display='none'">`
      : ''
    return `<div
      class="category-card${sel ? ' selected' : ''}"
      role="radio"
      aria-checked="${sel}"
      tabindex="0"
      onclick="selectCat('${cat.id}')"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectCat('${cat.id}')}"
      data-id="${cat.id}"
      aria-label="${esc(cat.nome)}, R$ ${fmtN(preco)} por dia">
      ${sel ? '<div class="cat-selected-badge" aria-hidden="true">✓</div>' : ''}
      ${img}
      <div class="category-card-body">
        <h3>${esc(cat.nome)}</h3>
        <p class="cat-trans">${esc(cat.transmissao ?? '')}</p>
      </div>
      <div class="cat-price-col">
        <span class="price-label">Valor Diário</span>
        <span class="price">R$ ${fmtN(preco)}</span>
      </div>
    </div>`
  }).join('')
}

window.selectCat = function(id) {
  const cat = S.categorias.find(x => x.id === id)
  if (!cat) return

  const novoLim  = cat?.max_cadeirinhas ?? 2
  const totalCad = getTotalCad()
  let limMsg = null

  if (totalCad > novoLim) {
    // Reduz cadeirinhas ao novo limite, removendo o excesso do fim da lista
    let cadsRestantes = novoLim
    S.adicionais_sel = S.adicionais_sel.map(item => {
      const adicional = S.adicionais.find(a => a.id === item.id)
      if (!adicional?.is_cadeirinha) return item
      if (cadsRestantes <= 0) return null
      if (item.quantidade > cadsRestantes) {
        const novaQty = cadsRestantes
        cadsRestantes = 0
        return { ...item, quantidade: novaQty, subtotal: calcSubtotal(adicional, novaQty) }
      }
      cadsRestantes -= item.quantidade
      return item
    }).filter(Boolean)

    limMsg = novoLim === 0
      ? 'Este veículo não suporta cadeirinhas.'
      : `Para veículos de até ${cat?.max_pessoas ?? 5} ocupantes, o limite é de ${novoLim} cadeirinha${novoLim !== 1 ? 's' : ''} por veículo. As cadeirinhas excedentes foram removidas.`
  }

  S.catId = id
  document.querySelectorAll('.category-card').forEach(el => {
    const sel = el.dataset.id === id
    el.classList.toggle('selected', sel)
    el.setAttribute('aria-checked', sel ? 'true' : 'false')
    const badge = el.querySelector('.cat-selected-badge')
    if (sel && !badge) {
      el.insertAdjacentHTML('afterbegin', '<div class="cat-selected-badge" aria-hidden="true">✓ Selecionado</div>')
    } else if (!sel && badge) {
      badge.remove()
    }
  })

  // Troca vinda da sidebar (Step 2-3, ver render/summary.js): re-renderiza
  // o conteúdo do step atual para refletir a nova categoria (limite de
  // cadeirinhas no Step 3) — Step 1 já se atualiza sozinho via toggle de
  // classe nos cards, acima. Step 4 nunca chega aqui: a sidebar (e o
  // dropdown/upgrade dentro dela) fica oculta nessa etapa — ver
  // updateSummary(), que retorna cedo em S.step===4 — e um re-render do
  // Step 4 apagaria dados do formulário já digitados (nome/e-mail/etc. só
  // são lidos do DOM no envio, não sincronizados em S a cada tecla).
  if (S.step === 2) {
    renderStep2(document.getElementById('content'))
  } else if (S.step === 3) {
    renderStep3(document.getElementById('content'))
    if (limMsg) {
      const errEl = document.getElementById('step3-err')
      if (errEl) errEl.innerHTML = `<div class="step-error" style="margin-top:8px">⚠️ ${limMsg}</div>`
    }
  }

  if (limMsg && S.step !== 3) showToast(`⚠️ ${limMsg}`, 'warning')

  updateSummary()
  updateMobileBar()
  saveSession()
}
