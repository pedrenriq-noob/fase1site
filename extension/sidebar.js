'use strict'

const SUPABASE_URL  = 'https://lxfnqzuzohudqwibgdic.supabase.co'
const SUPABASE_ANON = 'sb_publishable_lZYtlQFkZCgUE-ppawmXHA_CPo0tPUF'
const TENANT_ID     = 'a1b2c3d4-0000-0000-0000-000000000001'

const fmtN    = v  => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
const pad     = n  => String(n).padStart(2, '0')
const esc     = s  => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const chevron = `<svg class="chevron" width="11" height="7" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`

let DATA   = { cats: [], prots: [], adds: [], sazon: [] }
let S      = { catId: null, protId: null, protChosen: false, addSel: {}, extras: [],
               retData: '', retHora: '', devData: '', devHora: '', prime: false }
let openPanel = null
let openHora  = null

// Mensagem padrão editável pelo atendente
const MSG_DEFAULT = `Reserve agora e *pague só na retirada* do carro. Se precisar cancelar, *não tem taxa*.
O pagamento pode ser feito em:
💵 Dinheiro (somente reais)
📲 Pix
💳 Débito
💳 Crédito em até 4x sem juros

Pra avançar, me envia a foto da sua CNH e o comprovante de residência que já deixo sua reserva confirmada!`

// ── Supabase ──────────────────────────────────────────────
async function sbFetch(table, select, extra = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}&tenant_id=eq.${TENANT_ID}&ativo=eq.true${extra}`
  const r = await fetch(url, {
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }
  })
  if (!r.ok) throw new Error(`${table} HTTP ${r.status}: ${await r.text().catch(() => '')}`)
  return r.json()
}

async function loadData() {
  const loading = document.getElementById('loading')
  loading.className = 'state-msg'
  loading.textContent = 'Carregando dados…'
  try {
    const [cats, prots, adds, sazon] = await Promise.all([
      sbFetch('categorias',   'id,nome,slug,preco_diaria', '&order=ordem.asc'),
      sbFetch('protecoes',    'id,nome,preco,tipo_preco',  '&order=ordem.asc'),
      sbFetch('adicionais',   'id,nome,preco,tipo_preco,permite_quantidade',  '&order=ordem.asc'),
      sbFetch('sazonalidade', 'data_inicio,data_fim,precos', '').catch(() => []),
    ])
    DATA = { cats, prots, adds, sazon }
    renderForm()
  } catch (e) {
    console.error('[Igufoz]', e)
    loading.innerHTML = `<p class="err-msg">⚠️ Erro ao carregar.<br><small>${esc(e.message)}</small></p>
      <button class="retry-btn" id="retryBtn">Tentar novamente</button>`
    document.getElementById('retryBtn')?.addEventListener('click', loadData)
  }
}

// ── Hora picker HTML ──────────────────────────────────────
function horaPickerHTML(id, from, to, sel) {
  let opts = ''
  for (let h = from; h <= to; h++)
    for (let m = 0; m < 60; m += 30) {
      const v = pad(h) + ':' + pad(m)
      opts += `<div class="hora-opt${v === sel ? ' selected' : ''}" data-hora-pick="${id}" data-hora-val="${v}">${v}</div>`
    }
  const label = sel || 'Hora'
  return `<div class="hora-picker">
    <button type="button" class="hora-btn${sel ? '' : ' placeholder'}${openHora === id ? ' open' : ''}" data-hora-id="${id}">
      <span>${esc(label)}</span>${chevron}
    </button>
    <div class="hora-dropdown${openHora === id ? ' open' : ''}" id="hora-dd-${id}">${opts}</div>
  </div>`
}

// ── Collapsible selector HTML ─────────────────────────────
function colSelHTML(id, labelText, bodyHTML) {
  const isOpen = openPanel === id
  return `<div class="col-sel">
    <button type="button" class="col-btn${isOpen ? ' open' : ''}" data-panel="${id}">
      <span class="col-btn-label${labelText ? '' : ' placeholder'}">${esc(labelText || 'Selecione…')}</span>${chevron}
    </button>
    <div class="col-panel${isOpen ? ' open' : ''}" id="panel-${id}">${bodyHTML}</div>
  </div>`
}

// ── Category options HTML ─────────────────────────────────
function catOptionsHTML() {
  return DATA.cats.map(c => {
    const preco = getPreco(c)
    const sazon = preco !== c.preco_diaria
    return `<div class="col-opt${S.catId === c.id ? ' selected' : ''}" data-cat-id="${esc(c.id)}">
      <div class="col-opt-radio"></div>
      <div class="col-opt-body">
        <div class="col-opt-name">${esc(c.nome)}</div>
        <div class="col-opt-price">R$ ${fmtN(preco)}/dia${sazon ? ' 🔶' : ''}</div>
      </div>
    </div>`
  }).join('')
}

// ── Protection options HTML ───────────────────────────────
function protOptionsHTML() {
  const noneSelected = `<div class="col-opt${!S.protId ? ' selected' : ''}" data-prot-id="">
    <div class="col-opt-radio"></div>
    <div class="col-opt-body"><div class="col-opt-name">Sem proteção</div></div>
  </div>`
  return noneSelected + DATA.prots.map(p => `
    <div class="col-opt${S.protId === p.id ? ' selected' : ''}" data-prot-id="${esc(p.id)}"
         data-prot-preco="${p.preco}" data-prot-tipo="${esc(p.tipo_preco)}">
      <div class="col-opt-radio"></div>
      <div class="col-opt-body">
        <div class="col-opt-name">${esc(p.nome)}</div>
        <div class="col-opt-price">R$ ${fmtN(p.preco)}${p.tipo_preco === 'per_day' ? '/dia' : ''}</div>
      </div>
    </div>`).join('')
}

// ── Adicionais options HTML ───────────────────────────────
function addOptionsHTML() {
  return DATA.adds.map(a => {
    const qty = S.addSel[a.id] ?? 0
    const checked = qty > 0
    return `<div class="add-opt${checked ? ' checked' : ''}" data-add-id="${esc(a.id)}"
         data-add-preco="${a.preco}" data-add-tipo="${esc(a.tipo_preco)}">
      <div class="add-chk"><span class="add-chk-mark">✓</span></div>
      <div class="add-opt-body">
        <div class="add-opt-name">${esc(a.nome)}</div>
        <div class="add-opt-price">R$ ${fmtN(a.preco)}${a.tipo_preco === 'per_day' ? '/dia' : ''}</div>
      </div>
      ${checked && a.permite_quantidade ? `<input type="number" class="add-qty" data-qty-id="${esc(a.id)}" value="${qty}" min="1" max="10">` : ''}
    </div>`
  }).join('')
}

// ── Current selection labels ──────────────────────────────
function catLabel() {
  const c = DATA.cats.find(x => x.id === S.catId)
  return c ? `${c.nome} — R$ ${fmtN(getPreco(c))}/dia` : ''
}

function protLabel() {
  if (!S.protChosen) return ''           // nunca escolhido → mostra placeholder
  if (!S.protId) return 'Sem proteção'
  const p = DATA.prots.find(x => x.id === S.protId)
  return p ? p.nome : ''
}

function addLabel() {
  const sel = Object.keys(S.addSel).filter(id => S.addSel[id] > 0)
  if (!sel.length) return ''
  if (sel.length === 1) {
    const a = DATA.adds.find(x => x.id === sel[0])
    return a ? a.nome : ''
  }
  return `${sel.length} itens selecionados`
}

// ── Render extras ─────────────────────────────────────────
function renderExtras() {
  const list = document.getElementById('extrasList')
  if (!list) return
  list.innerHTML = S.extras.map((ex, i) => `
    <div class="extra-row">
      <input type="text" class="extra-desc" placeholder="Descrição" value="${esc(ex.desc)}" data-idx="${i}" data-field="desc">
      <input type="number" class="extra-preco" placeholder="R$" value="${ex.preco || ''}" data-idx="${i}" data-field="preco" min="0" step="0.01">
      <button class="rm-btn" data-rm-idx="${i}" title="Remover">×</button>
    </div>`).join('')
}

// ── Render full form ──────────────────────────────────────
function renderForm() {
  document.getElementById('body').innerHTML = `
    <!-- Período -->
    <section>
      <div class="sec-label">📅 Período</div>
      <div class="period-grid">
        <div class="period-cell">
          <label for="retData">Retirada — data</label>
          <input type="date" id="retData" value="${esc(S.retData)}">
        </div>
        <div class="period-cell">
          <label>Retirada — hora</label>
          ${horaPickerHTML('retHora', 8, 23, S.retHora)}
        </div>
        <div class="period-cell">
          <label for="devData">Devolução — data</label>
          <input type="date" id="devData" value="${esc(S.devData)}">
        </div>
        <div class="period-cell">
          <label>Devolução — hora</label>
          ${horaPickerHTML('devHora', 0, 23, S.devHora)}
        </div>
      </div>
    </section>

    <hr class="divider">

    <!-- Categoria -->
    <section>
      <div class="sec-label">🚘 Categoria</div>
      ${colSelHTML('cat', catLabel(), catOptionsHTML())}
    </section>

    <hr class="divider">

    <!-- Proteção -->
    <section>
      <div class="sec-label">🛡 Proteção</div>
      ${colSelHTML('prot', protLabel(), protOptionsHTML())}
    </section>

    <hr class="divider">

    <!-- Adicionais -->
    <section>
      <div class="sec-label">➕ Adicionais</div>
      ${colSelHTML('add', addLabel(), addOptionsHTML())}
    </section>

    <hr class="divider">

    <!-- Extras -->
    <section>
      <div class="sec-label">✏️ Itens extras</div>
      <div class="extras-list" id="extrasList"></div>
      <button class="add-extra-btn" id="addExtraBtn">+ Adicionar item extra</button>
    </section>

    <hr class="divider">

    ${isPrimeCat() ? `
    <!-- Prime Gourmet (apenas Grupo C) -->
    <section>
      <label id="primeLabel" style="display:flex;align-items:center;gap:9px;cursor:pointer;padding:4px 0${!isPrimePeriodo() ? ';opacity:.45;pointer-events:none' : ''}">
        <div id="primeChk" style="width:18px;height:18px;border-radius:5px;border:2px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:border-color .15s,background .15s">
          <span id="primeMark" style="display:none;color:#fff;font-size:11px;font-weight:700">✓</span>
        </div>
        <div>
          <span style="font-size:13px;font-weight:600;color:var(--text)">⭐ PRIME GOURMET</span>
          ${!isPrimePeriodo() ? '<div style="font-size:10px;color:var(--red);margin-top:1px">Indisponível no período selecionado</div>' : ''}
        </div>
      </label>
    </section>
    <hr class="divider">` : ''}

    <!-- Mensagem padrão -->
    <section>
      <div class="sec-label">💬 Mensagem da cotação</div>
      <textarea id="msgCotacao" rows="3" placeholder="Mensagem que aparece no final da cotação…"
        style="width:100%;padding:7px 9px;border:1.5px solid var(--border);border-radius:var(--radius);font-family:inherit;font-size:12px;color:var(--text);background:#fff;outline:none;resize:vertical;transition:border-color .18s"
      >${esc(document.getElementById('msgCotacao')?.value ?? MSG_DEFAULT)}</textarea>
    </section>
  `

  renderExtras()
  document.getElementById('footer').style.display = ''
  wireEvents()
  calc()
}

function updatePrimeVisual() {
  const chk  = document.getElementById('primeChk')
  const mark = document.getElementById('primeMark')
  if (chk)  { chk.style.background = S.prime ? 'var(--orange)' : ''; chk.style.borderColor = S.prime ? 'var(--orange)' : 'var(--border)' }
  if (mark) mark.style.display = S.prime ? 'block' : 'none'
}

// ── Wire all events (called after each render) ────────────
function wireEvents() {
  document.getElementById('retData')?.addEventListener('input', e => {
    S.retData = e.target.value
    // Se painel de categoria estiver aberto, atualiza preços (sazonalidade)
    if (openPanel === 'cat') {
      const panel = document.getElementById('panel-cat')
      if (panel) panel.innerHTML = catOptionsHTML()
    }
    // Se for Grupo C, re-renderiza pra atualizar disponibilidade do prime
    if (isPrimeCat()) { renderForm(); return }
    calc()
  })
  document.getElementById('devData')?.addEventListener('input', e => {
    S.devData = e.target.value
    // Se for Grupo C, re-renderiza pra atualizar disponibilidade do prime
    if (isPrimeCat()) { renderForm(); return }
    calc()
  })

  // Hora picker buttons — delegated on body
  // (handled in global delegation below)

  // Add extra button
  document.getElementById('addExtraBtn')?.addEventListener('click', () => {
    S.extras.push({ desc: '', preco: 0 })
    renderExtras()
    wireExtras()
  })

  // Prime Gourmet toggle
  document.getElementById('primeLabel')?.addEventListener('click', () => {
    if (!isPrimeValido()) return
    S.prime = !S.prime
    updatePrimeVisual()
    calc()
  })
  // Restaura estado visual do prime após re-render
  if (S.prime && isPrimeValido()) updatePrimeVisual()
  else if (!isPrimeValido() && S.prime) { S.prime = false }

  wireExtras()
}

function wireExtras() {
  const list = document.getElementById('extrasList')
  if (!list) return

  list.querySelectorAll('.extra-desc, .extra-preco').forEach(el => {
    el.addEventListener('input', () => {
      const i = parseInt(el.dataset.idx)
      if (el.dataset.field === 'desc')  S.extras[i].desc  = el.value
      if (el.dataset.field === 'preco') S.extras[i].preco = parseFloat(el.value) || 0
      calc()
    })
  })
  list.querySelectorAll('.rm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      S.extras.splice(parseInt(btn.dataset.rmIdx), 1)
      renderExtras()
      wireExtras()
      calc()
    })
  })
}

// ── Global event delegation ───────────────────────────────
document.addEventListener('click', e => {
  // ── Hora picker toggle
  const horaBtn = e.target.closest('[data-hora-id]')
  if (horaBtn) {
    e.stopPropagation()
    const id = horaBtn.dataset.horaId
    openHora = openHora === id ? null : id
    openPanel = null
    refreshPickers()
    return
  }

  // ── Hora option select
  const horaOpt = e.target.closest('[data-hora-pick]')
  if (horaOpt) {
    e.stopPropagation()
    const id  = horaOpt.dataset.horaPick
    const val = horaOpt.dataset.horaVal
    openHora  = null
    updateHora(id, val)
    return
  }

  // ── Collapsible panel toggle
  const panelBtn = e.target.closest('[data-panel]')
  if (panelBtn) {
    e.stopPropagation()
    const id  = panelBtn.dataset.panel
    openPanel = openPanel === id ? null : id
    openHora  = null
    refreshPanels()
    return
  }

  // ── Category option
  const catOpt = e.target.closest('[data-cat-id]')
  if (catOpt && catOpt.closest('#panel-cat')) {
    S.catId   = catOpt.dataset.catId || null
    openPanel = null
    renderForm()
    return
  }

  // ── Protection option
  const protOpt = e.target.closest('[data-prot-id]')
  if (protOpt && protOpt.closest('#panel-prot')) {
    S.protId      = protOpt.dataset.protId || null
    S.protChosen  = true
    openPanel     = null
    renderForm()
    return
  }

  // ── Additional checkbox (but NOT the qty input inside)
  const addOpt = e.target.closest('[data-add-id]')
  if (addOpt && addOpt.closest('#panel-add') && !e.target.classList.contains('add-qty')) {
    const id = addOpt.dataset.addId
    if (S.addSel[id] > 0) {
      delete S.addSel[id]
    } else {
      S.addSel[id] = 1
    }
    // Re-render only the adicionais panel content (avoid closing it)
    const panel = document.getElementById('panel-add')
    if (panel) panel.innerHTML = addOptionsHTML()
    wireAddQty()
    updateAddLabel()
    calc()
    return
  }

  // ── Close all on outside click
  if (!e.target.closest('.hora-picker') && !e.target.closest('.col-sel')) {
    openHora  = null
    openPanel = null
    refreshPickers()
    refreshPanels()
  }
})

// ── Qty inputs inside add panel ───────────────────────────
function wireAddQty() {
  document.querySelectorAll('.add-qty').forEach(inp => {
    inp.addEventListener('click', e => e.stopPropagation())
    inp.addEventListener('input', () => {
      const id = inp.dataset.qtyId
      S.addSel[id] = Math.max(1, parseInt(inp.value) || 1)
      calc()
    })
  })
}

function updateAddLabel() {
  const btn = document.querySelector('[data-panel="add"] .col-btn-label')
  if (!btn) return
  const label = addLabel()
  btn.textContent = label || 'Selecione…'
  btn.className   = `col-btn-label${label ? '' : ' placeholder'}`
}

// ── Refresh open/close state without full re-render ───────
function refreshPickers() {
  document.querySelectorAll('.hora-btn').forEach(btn => {
    const id = btn.dataset.horaId
    btn.classList.toggle('open', openHora === id)
    const dd = document.getElementById(`hora-dd-${id}`)
    if (dd) dd.classList.toggle('open', openHora === id)
    if (openHora === id) {
      // scroll selected into view
      const sel = dd?.querySelector('.hora-opt.selected')
      sel?.scrollIntoView({ block: 'nearest' })
    }
  })
}

function refreshPanels() {
  document.querySelectorAll('[data-panel]').forEach(btn => {
    const id = btn.dataset.panel
    btn.classList.toggle('open', openPanel === id)
    const panel = document.getElementById(`panel-${id}`)
    if (panel) panel.classList.toggle('open', openPanel === id)
  })
}

// ── Update hora picker display ────────────────────────────
function updateHora(id, val) {
  if (id === 'retHora') S.retHora = val
  if (id === 'devHora') S.devHora = val
  const btn = document.querySelector(`[data-hora-id="${id}"]`)
  if (btn) {
    btn.querySelector('span').textContent = val
    btn.classList.remove('placeholder', 'open')
  }
  const dd = document.getElementById(`hora-dd-${id}`)
  if (dd) {
    dd.classList.remove('open')
    dd.querySelectorAll('.hora-opt').forEach(o => {
      o.classList.toggle('selected', o.dataset.horaVal === val)
    })
  }
  calc()
}

// ── Prime Gourmet validations ─────────────────────────────
const PRIME_DESCONTO = 169

function isPrimeCat() {
  const cat = DATA.cats.find(c => c.id === S.catId)
  return cat?.slug === 'grupo_c'
}

// Retorna true se a data (ISO string 'YYYY-MM-DD') cair em período bloqueado para o prime
function isDataBloqueada(iso) {
  if (!iso) return false
  const d   = new Date(iso + 'T12:00:00')
  const mes = d.getMonth() + 1
  const dia = d.getDate()
  if (mes === 7)                  return true   // jul
  if (mes === 12 && dia >= 15)    return true   // 15/12–31/12
  if (mes === 1)                  return true   // jan
  return false
}

function isPrimePeriodo() {
  return !isDataBloqueada(S.retData) && !isDataBloqueada(S.devData)
}

function isPrimeValido() {
  return isPrimeCat() && isPrimePeriodo()
}

// ── Calculate total ───────────────────────────────────────
function getHoraText(id) {
  if (id === 'retHora' && S.retHora) return S.retHora
  if (id === 'devHora' && S.devHora) return S.devHora
  const t = document.querySelector(`[data-hora-id="${id}"] span`)?.textContent
  return (t && t !== 'Hora') ? t : '08:00'
}

function getRetData() { return S.retData || document.getElementById('retData')?.value || '' }

// Mesma lógica de hora extra do site:
// ≤1h resto → sem cobrança extra
// 1h–4h     → fração proporcional (incrementos 1/8)
// >4h       → diária completa extra
function getDias() {
  const rd = getRetData()
  const dd = document.getElementById('devData')?.value
  if (!rd || !dd) return 0
  const rHora = getHoraText('retHora')
  const dHora = getHoraText('devHora')
  const diffH = (new Date(`${dd}T${dHora}`) - new Date(`${rd}T${rHora}`)) / 3600000
  if (diffH <= 0) return 0
  const full  = Math.floor(diffH / 24)
  const resto = diffH % 24
  if (resto <= 1)     return full
  if (resto > 4)      return full + 1
  return full + Math.floor(resto * 2) / 8
}

// Aplica sazonalidade se a data de retirada cair no período
function getPreco(cat) {
  const rd = getRetData()
  if (rd) {
    for (const p of DATA.sazon) {
      if (rd >= p.data_inicio && rd <= p.data_fim) {
        const pr = (p.precos ?? {})[cat.slug]
        if (pr != null) return Number(pr)
      }
    }
  }
  return cat.preco_diaria
}

function calc() {
  const dias    = getDias()
  const diasFmt = Number.isInteger(dias) ? dias : dias.toFixed(1).replace('.', ',')

  const cat     = DATA.cats.find(c => c.id === S.catId)
  const precoD  = cat ? getPreco(cat) : 0
  const baseCat = precoD * (dias || 1)

  const prot     = DATA.prots.find(p => p.id === S.protId)
  const baseProt = prot
    ? (prot.tipo_preco === 'per_day' ? prot.preco * (dias || 1) : prot.preco)
    : 0

  let baseAdds = 0
  Object.entries(S.addSel).forEach(([id, qty]) => {
    if (!qty) return
    const a = DATA.adds.find(x => x.id === id)
    if (!a) return
    baseAdds += a.tipo_preco === 'per_day' ? a.preco * qty * (dias || 1) : a.preco * qty
  })

  const baseExtras = S.extras.reduce((s, e) => s + (e.preco || 0), 0)
  const total      = baseCat + baseProt + baseAdds + baseExtras

  // Se prime passou a ser inválido (ex.: mudou categoria/data), desmarca
  if (S.prime && !isPrimeValido()) {
    S.prime = false
    updatePrimeVisual()
  }
  const primeAtivo  = S.prime && isPrimeValido()
  const primeTotal  = primeAtivo ? Math.max(0, total - PRIME_DESCONTO) : null

  const badge     = document.getElementById('diasBadge')
  const val       = document.getElementById('totalVal')
  const primeRow  = document.getElementById('primeRow')
  const primeEl   = document.getElementById('primeVal')
  const lblEl     = document.getElementById('totalLabel')

  if (badge)   badge.textContent  = dias > 0 ? `${diasFmt} diária${dias !== 1 ? 's' : ''}` : ''
  if (val)     val.textContent    = `R$ ${fmtN(total)}`
  if (primeRow) primeRow.style.display  = primeAtivo ? '' : 'none'
  if (primeEl)  primeEl.textContent     = primeAtivo ? `R$ ${fmtN(primeTotal)}` : ''
  if (lblEl)    lblEl.textContent       = primeAtivo ? 'Total sem prime' : 'Total estimado'

  return { dias, diasFmt, baseCat, baseProt, baseAdds, baseExtras, total, primeTotal }
}

// ── Copy cotação ──────────────────────────────────────────
function copyCotacao() {
  const rd = document.getElementById('retData')?.value
  const dd = document.getElementById('devData')?.value
  const rh = document.querySelector('[data-hora-id="retHora"] span')?.textContent || '08:00'
  const dh = document.querySelector('[data-hora-id="devHora"] span')?.textContent || '08:00'

  const cat  = DATA.cats.find(c => c.id === S.catId)
  const prot = DATA.prots.find(p => p.id === S.protId)
  const { dias, diasFmt, baseProt, total } = calc()

  let linhasAdds = ''
  Object.entries(S.addSel).forEach(([id, qty]) => {
    if (!qty) return
    const a = DATA.adds.find(x => x.id === id)
    if (!a) return
    const sub = a.tipo_preco === 'per_day' ? a.preco * qty * (dias || 1) : a.preco * qty
    linhasAdds += `  ➕ ${a.nome}${qty > 1 ? ` (${qty}×)` : ''}: R$ ${fmtN(sub)}\n`
  })
  S.extras.forEach(e => {
    if (e.desc || e.preco) linhasAdds += `  ✏️ ${e.desc || 'Item extra'}: R$ ${fmtN(e.preco)}\n`
  })

  const msgExtra = document.getElementById('msgCotacao')?.value?.trim() || ''
  const precoD   = cat ? getPreco(cat) : 0

  const primeAtivo = S.prime && isPrimeValido()
  const primeTotalCopy = primeAtivo ? Math.max(0, total - PRIME_DESCONTO) : null

  const txt = [
    '🚗 *COTAÇÃO IGUFOZ*',
    '',
    `📅 Retirada:  ${fmtDate(rd)} às ${rh}`,
    `📅 Devolução: ${fmtDate(dd)} às ${dh}`,
    `⏱ Período:   ${diasFmt} diária${dias !== 1 ? 's' : ''}`,
    '',
    cat  ? `🚘 ${cat.nome} — R$ ${fmtN(precoD)}/dia` : null,
    prot && baseProt > 0 ? `🛡 ${prot.nome}` : null,
    linhasAdds ? `\n*Adicionais:*\n${linhasAdds.trimEnd()}` : null,
    '',
    primeAtivo ? `💰 Total: R$ ${fmtN(total)}` : `💰 *Total estimado: R$ ${fmtN(total)}*`,
    primeAtivo ? `⭐ *Com prime: R$ ${fmtN(primeTotalCopy)}*` : null,
    '',
    '_Valores sujeitos a confirmação._',
    msgExtra ? `\n${msgExtra}` : null,
  ].filter(l => l !== null).join('\n')

  const confirm = () => {
    const btn = document.getElementById('copyBtn')
    btn.textContent = '✅ Copiado!'
    btn.classList.add('copied')
    setTimeout(() => { btn.textContent = '📋 Copiar cotação'; btn.classList.remove('copied') }, 2500)
  }

  // Delega o clipboard ao content script (evita bloqueio de Permissions-Policy no iframe)
  window.parent.postMessage({ igufozCopy: txt }, '*')
}

// ── Reset ─────────────────────────────────────────────────
function resetForm() {
  S         = { catId: null, protId: null, protChosen: false, addSel: {}, extras: [],
                retData: '', retHora: '', devData: '', devHora: '', prime: false }
  openPanel = null
  openHora  = null
  renderForm()
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('resetBtn')?.addEventListener('click', resetForm)
  document.getElementById('copyBtn')?.addEventListener('click', copyCotacao)
  loadData()
})

// Resposta do content script após relay de clipboard
window.addEventListener('message', e => {
  if (e.data?.igufozCopied == null) return
  if (e.data.igufozCopied) {
    const btn = document.getElementById('copyBtn')
    if (!btn) return
    btn.textContent = '✅ Copiado!'
    btn.classList.add('copied')
    setTimeout(() => { btn.textContent = '📋 Copiar cotação'; btn.classList.remove('copied') }, 2500)
  }
})
