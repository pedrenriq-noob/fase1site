'use strict'

// ── CONFIG ── (DT-01: extensão não suporta ES modules; centralizar quando houver build step)
// Para trocar de tenant, edite apenas os 3 valores abaixo.
const SUPABASE_URL   = 'https://lxfnqzuzohudqwibgdic.supabase.co'
const SUPABASE_ANON  = 'sb_publishable_lZYtlQFkZCgUE-ppawmXHA_CPo0tPUF'
const TENANT_ID      = 'a1b2c3d4-0000-0000-0000-000000000001'
const CHECK_DISP_URL = `${SUPABASE_URL}/functions/v1/check-disponibilidade`
// ─────────────────────────────────────────────────────────────

const NOME_WHATSAPP = {
  'Aut. Travessia + CV 3d': 'Aut. c/ Carta Verde 3 dias',
  'Aut. Travessia + CV 7d': 'Aut. c/ Carta Verde 7 dias',
}

const CAT_DESCRICAO = {
  'GRUPO B':              'Mobi, C3 ou similar — MANUAL',
  'GRUPO C':              'Onix, Argo, 208, Polo ou similar — MANUAL',
  'GRUPO D':              'Cronos ou similar — AUTOMÁTICO',
  'GRUPO D+':             'Cronos ou similar — AUTOMÁTICO',
  'GRUPO E':              'Onix Premier ou similar — AUTOMÁTICO',
  'GRUPO F':              'Tera, Pulse ou similar — AUTOMÁTICO',
  'GRUPO G':              '2008, Fastback ou similar — AUTOMÁTICO',
  'GRUPO H':              'Spin ou similar — AUTOMÁTICO',
  'GRUPO H (7 LUGARES)':  'Spin ou similar — AUTOMÁTICO',
  'GRUPO I':              'Virtus, Onix Plus ou similar — AUTOMÁTICO',
  'GRUPO J':              'Tiggo 5x ou similar — AUTOMÁTICO',
}

const fmtN    = v  => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
const pad     = n  => String(n).padStart(2, '0')
const esc     = s  => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const chevron = `<svg class="chevron" width="11" height="7" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`

function showToastExt(msg) {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9999;background:#fff3cd;color:#856404;border:1.5px solid #ffc107;border-radius:10px;padding:10px 18px;font-size:12px;max-width:300px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,.15)'
  el.textContent = msg
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 3500)
}

const _amanha = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) }

let DATA   = { cats: [], prots: [], adds: [], sazon: [] }
let S      = { catId: null, protId: null, protChosen: false, addSel: {}, extras: [],
               retData: _amanha(), retHora: '', devData: '', devHora: '', prime: false }
let openPanel = null
let openHora  = null

// ── Disponibilidade inline ────────────────────────────────
// dispStatus: 'idle' | 'loading' | 'ok' | 'error'
let disp = { status: 'idle', data: null, errorMsg: null }
let dispTimer = null
let dispSeq   = 0 // descarta respostas de consultas obsoletas (corrida entre fetches)

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
    cache: 'no-store',
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }
  })
  if (!r.ok) throw new Error(`${table} HTTP ${r.status}: ${await r.text().catch(() => '')}`)
  return r.json()
}

async function checkCategoriaDisp(slug, retData, retHora, devData, devHora) {
  const res = await fetch(CHECK_DISP_URL, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`
    },
    body: JSON.stringify({
      tenant_id:         TENANT_ID,
      categoria_slug:    slug,
      data_saida:        `${retData}T${retHora}:00`,
      data_retorno_prev: `${devData}T${devHora}:00`
    })
  })
  return res.json()
}

// Os 5 campos obrigatórios para a checagem de disponibilidade estão preenchidos?
function camposDispCompletos() {
  return !!(S.retData && S.retHora && S.devData && S.devHora && S.catId)
}

function dispBadgeHTML() {
  if (disp.status === 'idle')    return ''
  if (disp.status === 'loading') return `<div class="disp-badge disp-loading">⏳ Consultando disponibilidade…</div>`
  if (disp.status === 'error')   return `<div class="disp-badge disp-error">⚠️ Erro ao consultar disponibilidade${disp.errorMsg ? `: ${esc(disp.errorMsg)}` : ''}</div>`

  const { disponivel = null, total = 0, reservas_periodo = 0, fonte = 'sem_dados' } = disp.data || {}
  if (fonte === 'sem_dados' || total === 0) {
    return `<div class="disp-badge disp-warn">⚠️ Frota não cadastrada nesta categoria.</div>`
  }
  const livres = Math.max(0, disponivel ?? 0)
  if (livres === 0) {
    return `<div class="disp-badge disp-red">❌ Indisponível no período (${reservas_periodo} reserva${reservas_periodo !== 1 ? 's' : ''} no período, ${total} no total).</div>`
  }
  const cls = livres <= 1 ? 'disp-yellow' : 'disp-green'
  return `<div class="disp-badge ${cls}">✅ ${livres} de ${total} disponível${livres !== 1 ? 'is' : ''} no período.</div>`
}

function renderDispBadge() {
  const el = document.getElementById('dispBadge')
  if (el) el.innerHTML = dispBadgeHTML()
}

// Reavalia disponibilidade conforme estado atual do formulário.
// Chamada após qualquer mudança em categoria/data/hora (via calc()).
function updateDisponibilidade() {
  if (dispTimer) clearTimeout(dispTimer)

  if (!camposDispCompletos()) {
    // Campo obrigatório ausente/inválido: limpa qualquer resultado anterior
    if (disp.status !== 'idle') {
      disp = { status: 'idle', data: null, errorMsg: null }
      renderDispBadge()
    }
    return
  }

  const cat = DATA.cats.find(c => c.id === S.catId)
  if (!cat?.slug) return

  const { retData, retHora, devData, devHora } = S
  const seq = ++dispSeq
  disp = { status: 'loading', data: null, errorMsg: null }
  renderDispBadge()

  dispTimer = setTimeout(async () => {
    try {
      const json = await checkCategoriaDisp(cat.slug, retData, retHora, devData, devHora)
      if (seq !== dispSeq) return // resposta obsoleta, ignora
      if (json?.error) {
        disp = { status: 'error', data: null, errorMsg: json.error.message || json.error.code }
      } else {
        disp = { status: 'ok', data: json, errorMsg: null }
      }
    } catch (e) {
      if (seq !== dispSeq) return
      disp = { status: 'error', data: null, errorMsg: e.message }
    }
    renderDispBadge()
  }, 400)
}

async function loadData() {
  const loading = document.getElementById('loading')
  if (loading) {
    loading.className = 'state-msg'
    loading.textContent = 'Carregando dados…'
  }
  try {
    const [cats, prots, adds, catLimits, sazon] = await Promise.all([
      sbFetch('categorias',   'id,nome,slug,preco_diaria', '&order=ordem.asc'),
      sbFetch('protecoes',    'id,nome,preco,tipo_preco,regra_hora_extra',  '&order=ordem.asc'),
      sbFetch('adicionais',   'id,nome,preco,tipo_preco,permite_quantidade,is_cadeirinha,regra_hora_extra',  '&order=ordem.asc'),
      sbFetch('categorias',   'id,max_cadeirinhas', '').catch(() => []),
      sbFetch('sazonalidade', 'data_inicio,data_fim,precos', '').catch(() => []),
    ])
    DATA = { cats, prots, adds, catLimits, sazon }
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
          <input type="date" id="retData" value="${esc(S.retData)}" min="${new Date().toISOString().slice(0,10)}">
        </div>
        <div class="period-cell">
          <label>Retirada — hora</label>
          ${horaPickerHTML('retHora', 8, 18, S.retHora)}
        </div>
        <div class="period-cell">
          <label for="devData">Devolução — data</label>
          <input type="date" id="devData" value="${esc(S.devData)}" min="${new Date().toISOString().slice(0,10)}">
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
      <div id="dispBadge"></div>
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
    const devInput = document.getElementById('devData')
    if (devInput) {
      devInput.min = S.retData || new Date().toISOString().slice(0,10)
      if (!S.devData || S.devData < S.retData) {
        S.devData = S.retData
        devInput.value = S.retData
      }
    }
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
      // Verifica limite de cadeirinhas da categoria selecionada
      const add = DATA.adds.find(a => a.id === id)
      if (add?.is_cadeirinha) {
        const catLimit = DATA.catLimits?.find(c => c.id === S.catId)
        const maxCad = catLimit?.max_cadeirinhas ?? 2
        const cadAtual = Object.entries(S.addSel)
          .filter(([sid]) => DATA.adds.find(a => a.id === sid)?.is_cadeirinha)
          .reduce((sum, [sid]) => sum + (S.addSel[sid] || 0), 0)
        if (cadAtual >= maxCad) {
          showToastExt(`Esta categoria permite no máximo ${maxCad} cadeirinha(s)/assento(s).`)
          return
        }
      }
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
      const novoQty = Math.max(1, parseInt(inp.value) || 1)
      const add = DATA.adds.find(a => a.id === id)
      if (add?.is_cadeirinha) {
        const catLimit = DATA.catLimits?.find(c => c.id === S.catId)
        const maxCad = catLimit?.max_cadeirinhas ?? 2
        const outrasQtd = Object.entries(S.addSel)
          .filter(([sid]) => sid !== id && DATA.adds.find(a => a.id === sid)?.is_cadeirinha)
          .reduce((sum, [sid]) => sum + (S.addSel[sid] || 0), 0)
        const permitido = Math.max(1, maxCad - outrasQtd)
        S.addSel[id] = Math.min(novoQty, permitido)
        inp.value = S.addSel[id]
      } else {
        S.addSel[id] = novoQty
      }
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
  if (id === 'retHora') {
    S.retHora = val
    if (!S.devHora) {
      S.devHora = val
      const devBtn = document.querySelector('[data-hora-id="devHora"]')
      if (devBtn) {
        devBtn.querySelector('span').textContent = val
        devBtn.classList.remove('placeholder')
      }
      document.querySelectorAll('#hora-dd-devHora .hora-opt').forEach(o =>
        o.classList.toggle('selected', o.dataset.horaVal === val)
      )
    }
  }
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

// Diárias vêm do módulo canônico shared/pricing.js (unificado em 2026-07-02:
// a versão anterior não aplicava o mínimo de 1 diária para locações ≤1h,
// enquanto site/admin/edge function já aplicavam — na prática o preço
// cobrado já usava esse mínimo via `dias || 1` em cada ponto de cálculo,
// então a mudança só corrige o número exibido no badge, sem alterar valor).
function getDias() {
  const rd = getRetData()
  const dd = document.getElementById('devData')?.value
  if (!rd || !dd) return 0
  const rHora = getHoraText('retHora')
  const dHora = getHoraText('devHora')
  return calcDias(`${rd}T${rHora}`, `${dd}T${dHora}`)
}

// Diária de um item específico (proteção/adicional), segundo o
// regra_hora_extra configurado nele no painel admin — não a diária global
// da categoria (getDias()). Ver docs/DECISION_LOG.md 2026-07-14.
function getDiasItem(item) {
  const rd = getRetData()
  const dd = document.getElementById('devData')?.value
  if (!rd || !dd) return 0
  const rHora = getHoraText('retHora')
  const dHora = getHoraText('devHora')
  return calcDiasItem(`${rd}T${rHora}`, `${dd}T${dHora}`, item?.regra_hora_extra)
}

// Preço com sazonalidade vem do módulo canônico shared/pricing.js (variante
// classic-script de supabase/functions/_shared/pricing.js, verificada por
// tests/pricing-parity.test.js — carregado antes de sidebar.js no HTML).
function getPreco(cat) {
  return precoDiariaComSazonalidade(cat, getRetData(), DATA.sazon)
}

function calc() {
  updateDisponibilidade()

  const dias    = getDias()
  const diasFmt = Number.isInteger(dias) ? dias : dias.toFixed(1).replace('.', ',')

  const cat     = DATA.cats.find(c => c.id === S.catId)
  const precoD  = cat ? getPreco(cat) : 0
  const baseCat = calcSubtotal('per_day', precoD, 1, dias || 1)

  const prot     = DATA.prots.find(p => p.id === S.protId)
  const baseProt = prot ? calcSubtotal(prot.tipo_preco, prot.preco, 1, getDiasItem(prot) || 1) : 0

  let baseAdds = 0
  Object.entries(S.addSel).forEach(([id, qty]) => {
    if (!qty) return
    const a = DATA.adds.find(x => x.id === id)
    if (!a) return
    baseAdds += calcSubtotal(a.tipo_preco, a.preco, qty, getDiasItem(a) || 1)
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

  // Resumo de itens selecionados no footer
  const resumoEl = document.getElementById('resumo')
  if (resumoEl) {
    const linhas = []
    if (cat) {
      const sub = dias > 0 ? `${diasFmt} diária${dias !== 1 ? 's' : ''} × R$ ${fmtN(precoD)}` : `R$ ${fmtN(precoD)}/dia`
      linhas.push(`<div class="resumo-item">
        <div><div class="resumo-nome">${esc(cat.nome)}</div><div class="resumo-sub">${sub}</div></div>
        <span class="resumo-preco resumo-cat-preco">R$ ${fmtN(baseCat)}</span>
      </div>`)
    }
    if (prot && baseProt > 0) {
      const protSub = prot.tipo_preco === 'per_day' && dias > 0
        ? `${diasFmt} diária${dias !== 1 ? 's' : ''} × R$ ${fmtN(prot.preco)}`
        : ''
      linhas.push(`<div class="resumo-item">
        <div><div class="resumo-nome">○ ${esc(prot.nome)}</div>${protSub ? `<div class="resumo-sub">${protSub}</div>` : ''}</div>
        <span class="resumo-preco">R$ ${fmtN(baseProt)}</span>
      </div>`)
    }
    Object.entries(S.addSel).forEach(([id, qty]) => {
      if (!qty) return
      const a = DATA.adds.find(x => x.id === id)
      if (!a) return
      const sub = calcSubtotal(a.tipo_preco, a.preco, qty, getDiasItem(a) || 1)
      linhas.push(`<div class="resumo-item">
        <div class="resumo-nome">+ ${esc(a.nome)}${qty > 1 ? ` (${qty}×)` : ''}</div>
        <span class="resumo-preco">R$ ${fmtN(sub)}</span>
      </div>`)
    })
    S.extras.forEach(e => {
      if (!e.desc && !e.preco) return
      linhas.push(`<div class="resumo-item">
        <div class="resumo-nome">✏️ ${esc(e.desc || 'Item extra')}</div>
        <span class="resumo-preco">R$ ${fmtN(e.preco)}</span>
      </div>`)
    })
    resumoEl.innerHTML = linhas.join('')
  }

  if (badge)   badge.textContent  = ''
  if (val)     val.textContent    = `R$ ${fmtN(total)}`
  if (primeRow) primeRow.style.display  = primeAtivo ? '' : 'none'
  if (primeEl)  primeEl.textContent     = primeAtivo ? `R$ ${fmtN(primeTotal)}` : ''
  if (lblEl)    lblEl.textContent       = primeAtivo ? 'Total sem prime' : 'Total estimado'

  // Atualiza preços nos cards de categoria (sazonalidade muda conforme data selecionada)
  document.querySelectorAll('[data-cat-id]').forEach(el => {
    const c = DATA.cats.find(x => x.id === el.dataset.catId)
    if (!c) return
    const preco = getPreco(c)
    const sazon = preco !== c.preco_diaria
    const priceEl = el.querySelector('.col-opt-price')
    if (priceEl) priceEl.textContent = `R$ ${fmtN(preco)}/dia${sazon ? ' 🔶' : ''}`
  })
  // Atualiza label do botão da categoria se uma estiver selecionada
  const catLabelEl = document.querySelector('[data-panel="cat"] .col-btn-label')
  if (catLabelEl && S.catId) {
    const selCat = DATA.cats.find(x => x.id === S.catId)
    if (selCat) catLabelEl.textContent = `${selCat.nome} — R$ ${fmtN(getPreco(selCat))}/dia`
  }

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
    const sub = calcSubtotal(a.tipo_preco, a.preco, qty, getDiasItem(a) || 1)
    const nomeWpp = NOME_WHATSAPP[a.nome] ?? a.nome
    linhasAdds += `  ➕ ${nomeWpp}${qty > 1 ? ` (${qty}×)` : ''}: R$ ${fmtN(sub)}\n`
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
    cat  ? (CAT_DESCRICAO[cat.nome.trim().toUpperCase()] ?? null) : null,
    prot && baseProt > 0 ? `🛡 ${prot.nome}: R$ ${fmtN(baseProt)}` : null,
    linhasAdds ? `\n*Adicionais:*\n${linhasAdds.trimEnd()}` : null,
    '',
    primeAtivo ? `💰 Total: R$ ${fmtN(total)}` : `💰 *Total estimado: R$ ${fmtN(total)}*`,
    primeAtivo ? `⭐ *Com prime: R$ ${fmtN(primeTotalCopy)}*` : null,
    '',
    '_Valores válidos por 48 horas._',
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
                retData: _amanha(), retHora: '', devData: '', devHora: '', prime: false }
  openPanel = null
  openHora  = null
  if (dispTimer) clearTimeout(dispTimer)
  dispSeq++
  disp      = { status: 'idle', data: null, errorMsg: null }
  renderForm()
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('resetBtn')?.addEventListener('click', resetForm)
  document.getElementById('copyBtn')?.addEventListener('click', copyCotacao)
  loadData()
})

// Recarrega dados quando a aba é aberta (sinal do content.js)
window.addEventListener('message', e => {
  if (e.data?.igufozReload) { loadData(); return }
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
