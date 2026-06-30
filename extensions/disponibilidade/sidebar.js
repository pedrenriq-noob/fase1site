'use strict'

// ── CONFIG ──────────────────────────────────────────────────────────────────
const SUPABASE_URL   = 'https://lxfnqzuzohudqwibgdic.supabase.co'
const SUPABASE_ANON  = 'sb_publishable_lZYtlQFkZCgUE-ppawmXHA_CPo0tPUF'
const TENANT_ID      = 'a1b2c3d4-0000-0000-0000-000000000001'
const CHECK_DISP_URL = `${SUPABASE_URL}/functions/v1/check-disponibilidade`
// ────────────────────────────────────────────────────────────────────────────

const pad   = n => String(n).padStart(2, '0')
const esc   = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const fmtDT = (date, hora) => {
  if (!date) return '—'
  const [, m, d] = date.split('-')
  return `${d}/${m} ${hora || ''}`
}

// ── Hora picker state ────────────────────────────────────────────────────────
const horaState = { retHora: '08:00', devHora: '08:00' }
let openPicker = null

function buildHoraOpts(id, minH, maxH, selected) {
  const dropdown = document.getElementById(`${id}-dropdown`)
  if (!dropdown) return
  let html = ''
  for (let h = minH; h <= maxH; h++) {
    for (let m = 0; m < 60; m += 30) {
      const v = `${pad(h)}:${pad(m)}`
      html += `<div class="hora-opt${v === selected ? ' selected' : ''}" data-value="${v}" data-field="${id}">${v}</div>`
    }
  }
  dropdown.innerHTML = html
  dropdown.querySelectorAll('.hora-opt').forEach(opt => {
    opt.addEventListener('click', () => selectHora(id, opt.dataset.value))
  })
}

function selectHora(id, value) {
  horaState[id] = value
  const btn = document.getElementById(`${id}-btn`)
  if (btn) {
    btn.querySelector('.hora-label').textContent = value
    btn.classList.remove('placeholder')
  }
  // Sync devHora com retHora se devHora não foi alterada manualmente
  if (id === 'retHora' && horaState.devHora === '08:00') {
    selectHora('devHora', value)
  }
  closePicker(id)
  // Atualiza selected no dropdown
  document.querySelectorAll(`#${id}-dropdown .hora-opt`).forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.value === value)
  })
}

function togglePicker(id) {
  const dropdown = document.getElementById(`${id}-dropdown`)
  const btn      = document.getElementById(`${id}-btn`)
  if (!dropdown || !btn) return

  const isOpen = dropdown.classList.contains('open')

  // Fecha qualquer outro picker aberto
  if (openPicker && openPicker !== id) closePicker(openPicker)

  if (isOpen) {
    closePicker(id)
  } else {
    dropdown.classList.add('open')
    btn.classList.add('open')
    openPicker = id
    // Scroll para o item selecionado
    const sel = dropdown.querySelector('.hora-opt.selected')
    if (sel) setTimeout(() => sel.scrollIntoView({ block: 'center' }), 30)
  }
}

function closePicker(id) {
  document.getElementById(`${id}-dropdown`)?.classList.remove('open')
  document.getElementById(`${id}-btn`)?.classList.remove('open')
  if (openPicker === id) openPicker = null
}

// ── Defaults ─────────────────────────────────────────────────────────────────
function defaultDates() {
  const d1 = new Date(); d1.setDate(d1.getDate() + 1)
  const d2 = new Date(); d2.setDate(d2.getDate() + 2)
  const fmt = d => d.toISOString().slice(0, 10)
  return { retData: fmt(d1), devData: fmt(d2) }
}

// ── Persiste última consulta ─────────────────────────────────────────────────
function saveState(s) {
  try { chrome.storage.local.set({ dispState: s }) } catch (_) {}
}
function loadState(cb) {
  try {
    chrome.storage.local.get('dispState', r => cb(r.dispState || null))
  } catch (_) { cb(null) }
}

// ── Supabase ─────────────────────────────────────────────────────────────────
async function fetchCategorias() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/categorias?tenant_id=eq.${TENANT_ID}&ativo=eq.true&order=slug&select=id,nome,slug`,
    {
      cache: 'no-store',
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }
    }
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function checkCategoria(slug, retData, retHora, devData, devHora) {
  const res = await fetch(CHECK_DISP_URL, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`
    },
    body: JSON.stringify({
      tenant_id:        TENANT_ID,
      categoria_slug:   slug,
      data_saida:       `${retData}T${retHora}:00`,
      data_retorno_prev:`${devData}T${devHora}:00`
    })
  })
  return res.json()
}

// ── Render ────────────────────────────────────────────────────────────────────
function badgeHtml(disponivel, total) {
  if (disponivel === null || disponivel === undefined) {
    return `<span class="badge badge-red">Sem dados</span>`
  }
  if (disponivel === 0) return `<span class="badge badge-red">Indisponível</span>`
  const cls    = disponivel <= 1 ? 'badge-yellow' : 'badge-green'
  const plural = disponivel === 1 ? 'disponível' : 'disponíveis'
  return `<span class="badge ${cls}">${disponivel} de ${total} ${plural}</span>`
}

function renderCatCard(cat, disp) {
  const { disponivel = null, total = 0, reservas_periodo = 0, fonte = 'sem_dados' } = disp || {}
  let detalheHtml
  if (fonte === 'sem_dados' || total === 0) {
    detalheHtml = `<div class="veiculo-row"><span class="veiculo-motivo" style="color:#aaa">Frota não cadastrada nesta categoria.</span></div>`
  } else {
    const livres = Math.max(0, (disponivel ?? 0))
    const ocupados = total - livres
    detalheHtml = `
      <div class="veiculo-row">
        <div class="veiculo-dot disp"></div>
        <span class="veiculo-modelo">${livres} veículo${livres !== 1 ? 's' : ''} disponível${livres !== 1 ? 'is' : ''}</span>
      </div>
      ${ocupados > 0 ? `<div class="veiculo-row">
        <div class="veiculo-dot indisp"></div>
        <span class="veiculo-modelo">${ocupados} reservado${ocupados !== 1 ? 's' : ''} no período</span>
        <span class="veiculo-motivo">(${reservas_periodo} reserva${reservas_periodo !== 1 ? 's' : ''})</span>
      </div>` : ''}
    `
  }

  return `
    <div class="cat-card" data-slug="${esc(cat.slug)}">
      <div class="cat-header" onclick="toggleCard(this)">
        <div>
          <div class="cat-name">${esc(cat.nome)}</div>
          <div class="cat-slug">${esc(cat.slug)}</div>
        </div>
        <div class="cat-right">
          ${badgeHtml(disponivel, total)}
          <svg class="chevron" width="11" height="7" viewBox="0 0 10 6" fill="none">
            <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
      <div class="cat-detail">${detalheHtml}</div>
    </div>`
}

window.toggleCard = function(header) {
  header.closest('.cat-card').classList.toggle('open')
}

// ── Show/hide ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id)

function showOnly(id) {
  ['results', 'loading', 'empty'].forEach(x => {
    const el = $(x)
    if (el) el.hidden = (x !== id)
  })
}

// ── Consulta ──────────────────────────────────────────────────────────────────
async function consultar(retData, retHora, devData, devHora) {
  $('form-err').hidden = true
  $('btn-consultar').disabled = true
  showOnly('loading')

  try {
    const cats = await fetchCategorias()
    if (!cats.length) { showOnly('empty'); return }

    const results = await Promise.all(
      cats.map(cat =>
        checkCategoria(cat.slug, retData, retHora, devData, devHora)
          .then(d => ({ cat, disp: d }))
          .catch(() => ({ cat, disp: null }))
      )
    )

    const totalDisp = results.filter(r => (r.disp?.disponivel ?? 0) > 0).length
    $('results-period').textContent  = `${fmtDT(retData, retHora)} → ${fmtDT(devData, devHora)}`
    $('results-summary').textContent = `${totalDisp} de ${results.length} grupos com vagas`

    $('cat-list').innerHTML = results.map(({ cat, disp }) => renderCatCard(cat, disp)).join('')

    let autoOpen = 0
    $('cat-list').querySelectorAll('.cat-card').forEach((card, i) => {
      if (results[i]?.disp?.disponivel > 0 && autoOpen < 3) {
        card.classList.add('open')
        autoOpen++
      }
    })

    showOnly('results')
    saveState({ retData, retHora, devData, devHora })

  } catch (err) {
    showOnly(null)
    const errEl = $('form-err')
    errEl.textContent = `Erro ao consultar: ${err.message}`
    errEl.hidden = false
  } finally {
    $('btn-consultar').disabled = false
  }
}

// ── Reload via postMessage (disparado pelo content.js ao abrir o sidebar) ────
window.addEventListener('message', e => {
  if (e.data?.igufozDispReload) {
    const retData = $('retData').value
    const devData = $('devData').value
    if (retData && devData) {
      consultar(retData, horaState.retHora, devData, horaState.devHora)
    }
  }
})

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const { retData: defRet, devData: defDev } = defaultDates()

  // Constrói os pickers (ret: 06–20, dev: 00–23, passo 30min)
  buildHoraOpts('retHora', 6, 20, horaState.retHora)
  buildHoraOpts('devHora', 0, 23, horaState.devHora)

  // Bind toggle buttons
  $('retHora-btn').addEventListener('click', () => togglePicker('retHora'))
  $('devHora-btn').addEventListener('click', () => togglePicker('devHora'))

  // Fecha picker ao clicar fora
  document.addEventListener('click', e => {
    if (openPicker && !e.target.closest('.hora-picker')) closePicker(openPicker)
  })

  loadState(saved => {
    $('retData').value = saved?.retData || defRet
    $('devData').value = saved?.devData || defDev
    if (saved?.retHora) selectHora('retHora', saved.retHora)
    if (saved?.devHora) selectHora('devHora', saved.devHora)
  })

  // Sync devolução date
  $('retData').addEventListener('change', e => {
    if (!$('devData').value || $('devData').value < e.target.value) {
      $('devData').value = e.target.value
    }
    $('devData').min = e.target.value
  })

  $('form').addEventListener('submit', e => {
    e.preventDefault()
    const retData = $('retData').value
    const devData = $('devData').value
    const retHora = horaState.retHora
    const devHora = horaState.devHora
    const errEl   = $('form-err')

    if (!retData || !devData) {
      errEl.textContent = 'Preencha as datas de retirada e devolução.'
      errEl.hidden = false
      return
    }
    if (new Date(`${devData}T${devHora}`) <= new Date(`${retData}T${retHora}`)) {
      errEl.textContent = 'A devolução deve ser após a retirada.'
      errEl.hidden = false
      return
    }
    errEl.hidden = true
    consultar(retData, retHora, devData, devHora)
  })
})
