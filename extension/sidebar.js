'use strict'

const SUPABASE_URL  = 'https://lxfnqzuzohudqwibgdic.supabase.co'
const SUPABASE_ANON = 'sb_publishable_lZYtlQFkZCgUE-ppawmXHA_CPo0tPUF'
const TENANT_ID     = 'a1b2c3d4-0000-0000-0000-000000000001'

const fmtN    = v  => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
const esc     = s  => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')

let DATA   = { cats: [], prots: [], adds: [] }
let extras = []

// ── Supabase REST ─────────────────────────────────────────
async function sbFetch(table, select, extraParams = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}&tenant_id=eq.${TENANT_ID}&ativo=eq.true${extraParams}`
  const r = await fetch(url, {
    headers: {
      apikey:          SUPABASE_ANON,
      Authorization:   `Bearer ${SUPABASE_ANON}`,
      'Content-Type':  'application/json',
    }
  })
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    throw new Error(`${table} HTTP ${r.status}: ${body}`)
  }
  return r.json()
}

// ── Load ──────────────────────────────────────────────────
async function loadData() {
  const loading = document.getElementById('loading')
  loading.className = 'state-msg'
  loading.textContent = 'Carregando dados…'
  try {
    const [cats, prots, adds] = await Promise.all([
      sbFetch('categorias', 'id,nome,preco_diaria,preco_final', '&order=ordem.asc'),
      sbFetch('protecoes',  'id,nome,preco,tipo_preco',         '&order=ordem.asc'),
      sbFetch('adicionais', 'id,nome,preco,tipo_preco',         '&order=ordem.asc'),
    ])
    DATA = { cats, prots, adds }
    renderForm()
  } catch (e) {
    console.error('[Igufoz]', e)
    loading.className = 'state-msg'
    loading.innerHTML = `
      <p class="err-msg">⚠️ Erro ao carregar dados.<br>
      <small>${esc(e.message)}</small></p>
      <button class="retry-btn" id="retryBtn">Tentar novamente</button>`
    document.getElementById('retryBtn')?.addEventListener('click', loadData)
  }
}

// ── Render form ───────────────────────────────────────────
function renderForm() {
  const body = document.getElementById('body')

  const catOptions = DATA.cats.map(c => {
    const preco = c.preco_final || c.preco_diaria
    return `<option value="${esc(c.id)}" data-preco="${preco}">${esc(c.nome)} — R$ ${fmtN(preco)}/dia</option>`
  }).join('')

  const protOptions = DATA.prots.map(p =>
    `<option value="${esc(p.id)}" data-preco="${p.preco}" data-tipo="${esc(p.tipo_preco)}">${esc(p.nome)} — R$ ${fmtN(p.preco)}${p.tipo_preco === 'per_day' ? '/dia' : ''}</option>`
  ).join('')

  const addItems = DATA.adds.map(a => `
    <div class="add-item">
      <input type="checkbox" id="add_${esc(a.id)}" data-preco="${a.preco}" data-tipo="${esc(a.tipo_preco)}">
      <label class="add-item-label" for="add_${esc(a.id)}">
        ${esc(a.nome)}
        <small>R$ ${fmtN(a.preco)}${a.tipo_preco === 'per_day' ? '/dia' : ''}</small>
      </label>
      <input type="number" class="add-item-qty" id="qty_${esc(a.id)}" value="1" min="1" max="10" style="display:none">
    </div>`).join('')

  body.innerHTML = `
    <section>
      <div class="sec-label">📅 Período</div>
      <div class="period-grid">
        <div class="period-cell">
          <label for="retData">Retirada — data</label>
          <input type="date" id="retData">
        </div>
        <div class="period-cell">
          <label for="retHora">Retirada — hora</label>
          <input type="time" id="retHora" value="08:00" step="1800">
        </div>
        <div class="period-cell">
          <label for="devData">Devolução — data</label>
          <input type="date" id="devData">
        </div>
        <div class="period-cell">
          <label for="devHora">Devolução — hora</label>
          <input type="time" id="devHora" value="08:00" step="1800">
        </div>
      </div>
    </section>

    <hr class="divider">

    <section>
      <div class="sec-label">🚘 Categoria</div>
      <select id="catSel" class="scroll-select" size="5">
        <option value="">— Selecione —</option>
        ${catOptions}
      </select>
    </section>

    <hr class="divider">

    <section>
      <div class="sec-label">🛡 Proteção</div>
      <select id="protSel" class="scroll-select" size="4">
        <option value="">— Sem proteção —</option>
        ${protOptions}
      </select>
    </section>

    <hr class="divider">

    <section>
      <div class="sec-label">➕ Adicionais</div>
      <div class="add-list" id="addList">${addItems}</div>
    </section>

    <hr class="divider">

    <section>
      <div class="sec-label">✏️ Itens extras</div>
      <div class="extras-list" id="extrasList"></div>
      <button class="add-extra-btn" id="addExtraBtn">+ Adicionar item extra</button>
    </section>
  `

  // Period inputs
  ;['retData', 'retHora', 'devData', 'devHora'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calc)
  })

  // Selects
  document.getElementById('catSel')?.addEventListener('change', calc)
  document.getElementById('protSel')?.addEventListener('change', calc)

  // Adicionais checkboxes + qty
  DATA.adds.forEach(a => {
    const chk = document.getElementById(`add_${a.id}`)
    const qty = document.getElementById(`qty_${a.id}`)
    chk?.addEventListener('change', () => {
      if (qty) qty.style.display = chk.checked ? 'block' : 'none'
      calc()
    })
    qty?.addEventListener('input', calc)
  })

  // Add extra button
  document.getElementById('addExtraBtn')?.addEventListener('click', addExtra)

  // Extras list — event delegation for rm buttons and inputs
  document.getElementById('extrasList')?.addEventListener('click', e => {
    const btn = e.target.closest('.rm-btn')
    if (!btn) return
    const idx = parseInt(btn.dataset.idx)
    removeExtra(idx)
  })
  document.getElementById('extrasList')?.addEventListener('input', e => {
    const el = e.target
    const idx = parseInt(el.dataset.idx)
    if (isNaN(idx)) return
    if (el.dataset.field === 'desc')  extras[idx].desc  = el.value
    if (el.dataset.field === 'preco') extras[idx].preco = parseFloat(el.value) || 0
    calc()
  })

  renderExtras()
  document.getElementById('footer').style.display = ''
  calc()
}

// ── Extras ────────────────────────────────────────────────
function renderExtras() {
  const list = document.getElementById('extrasList')
  if (!list) return
  list.innerHTML = extras.map((ex, i) => `
    <div class="extra-row">
      <input type="text"   placeholder="Descrição" value="${esc(ex.desc)}"  data-idx="${i}" data-field="desc">
      <input type="number" placeholder="R$"        value="${ex.preco || ''}" data-idx="${i}" data-field="preco" min="0" step="0.01">
      <button class="rm-btn" data-idx="${i}" title="Remover">×</button>
    </div>`).join('')
}

function addExtra() {
  extras.push({ desc: '', preco: 0 })
  renderExtras()
}

function removeExtra(i) {
  extras.splice(i, 1)
  renderExtras()
  calc()
}

// ── Cálculo ───────────────────────────────────────────────
function getDias() {
  const rd = document.getElementById('retData')?.value
  const rh = document.getElementById('retHora')?.value || '08:00'
  const dd = document.getElementById('devData')?.value
  const dh = document.getElementById('devHora')?.value || '08:00'
  if (!rd || !dd) return 0
  const diff = (new Date(`${dd}T${dh}`) - new Date(`${rd}T${rh}`)) / 36e5 / 24
  return Math.max(0, Math.round(diff * 10) / 10)
}

function calc() {
  const dias    = getDias()
  const diasFmt = Number.isInteger(dias) ? dias : dias.toFixed(1).replace('.', ',')

  const catSel  = document.getElementById('catSel')
  const catOpt  = catSel?.options[catSel.selectedIndex]
  const precoD  = parseFloat(catOpt?.dataset.preco || 0)
  const baseCat = precoD * (dias || 1)

  const protSel  = document.getElementById('protSel')
  const protOpt  = protSel?.options[protSel.selectedIndex]
  const protPreco = parseFloat(protOpt?.dataset.preco || 0)
  const protTipo  = protOpt?.dataset.tipo || ''
  const baseProt  = protPreco ? (protTipo === 'per_day' ? protPreco * (dias || 1) : protPreco) : 0

  let baseAdds = 0
  DATA.adds.forEach(a => {
    const chk = document.getElementById(`add_${a.id}`)
    if (!chk?.checked) return
    const qty  = parseInt(document.getElementById(`qty_${a.id}`)?.value || 1)
    const unit = parseFloat(chk.dataset.preco || 0)
    baseAdds += chk.dataset.tipo === 'per_day' ? unit * qty * (dias || 1) : unit * qty
  })

  const baseExtras = extras.reduce((s, e) => s + (e.preco || 0), 0)
  const total      = baseCat + baseProt + baseAdds + baseExtras

  const badge = document.getElementById('diasBadge')
  const val   = document.getElementById('totalVal')
  if (badge) badge.textContent = dias > 0 ? `${diasFmt} diária${dias !== 1 ? 's' : ''}` : ''
  if (val)   val.textContent   = `R$ ${fmtN(total)}`

  return { dias, diasFmt, precoD, baseCat, baseProt, baseAdds, baseExtras, total }
}

// ── Copiar cotação ────────────────────────────────────────
function copyCotacao() {
  const rd = document.getElementById('retData')?.value
  const rh = document.getElementById('retHora')?.value || '08:00'
  const dd = document.getElementById('devData')?.value
  const dh = document.getElementById('devHora')?.value || '08:00'

  const catSel  = document.getElementById('catSel')
  const catNome = catSel?.options[catSel.selectedIndex]?.text || '—'
  const protSel = document.getElementById('protSel')
  const protNome = protSel?.options[protSel.selectedIndex]?.text || '—'

  const { dias, diasFmt, baseProt, total } = calc()

  let linhasAdds = ''
  DATA.adds.forEach(a => {
    const chk = document.getElementById(`add_${a.id}`)
    if (!chk?.checked) return
    const qty  = parseInt(document.getElementById(`qty_${a.id}`)?.value || 1)
    const unit = parseFloat(chk.dataset.preco || 0)
    const sub  = chk.dataset.tipo === 'per_day' ? unit * qty * (dias || 1) : unit * qty
    linhasAdds += `  ➕ ${a.nome}${qty > 1 ? ` (${qty}×)` : ''}: R$ ${fmtN(sub)}\n`
  })
  extras.forEach(e => {
    if (e.desc || e.preco) linhasAdds += `  ✏️ ${e.desc || 'Item extra'}: R$ ${fmtN(e.preco)}\n`
  })

  const txt = [
    '🚗 *COTAÇÃO IGUFOZ*',
    '',
    `📅 Retirada:  ${fmtDate(rd)} às ${rh}`,
    `📅 Devolução: ${fmtDate(dd)} às ${dh}`,
    `⏱ Período:   ${diasFmt} diária${dias !== 1 ? 's' : ''}`,
    '',
    `🚘 ${catNome}`,
    baseProt > 0 ? `🛡 ${protNome}` : null,
    linhasAdds ? `\n*Adicionais:*\n${linhasAdds.trimEnd()}` : null,
    '',
    `💰 *Total estimado: R$ ${fmtN(total)}*`,
    '',
    '_Valores sujeitos a confirmação._',
  ].filter(l => l !== null).join('\n')

  navigator.clipboard.writeText(txt).then(() => {
    const btn = document.getElementById('copyBtn')
    btn.textContent = '✅ Copiado!'
    btn.classList.add('copied')
    setTimeout(() => {
      btn.textContent = '📋 Copiar cotação'
      btn.classList.remove('copied')
    }, 2500)
  }).catch(() => {
    alert('Não foi possível copiar. Tente selecionar o texto manualmente.')
  })
}

// ── Reset ─────────────────────────────────────────────────
function resetForm() {
  extras = []
  renderForm()
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('resetBtn')?.addEventListener('click', resetForm)
  document.getElementById('copyBtn')?.addEventListener('click', copyCotacao)
  loadData()
})
