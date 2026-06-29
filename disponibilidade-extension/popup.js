'use strict'

// ── CONFIG ──────────────────────────────────────────────────────────────────
const SUPABASE_URL   = 'https://lxfnqzuzohudqwibgdic.supabase.co'
const SUPABASE_ANON  = 'sb_publishable_lZYtlQFkZCgUE-ppawmXHA_CPo0tPUF'
const TENANT_ID      = 'a1b2c3d4-0000-0000-0000-000000000001'
const CHECK_DISP_URL = `${SUPABASE_URL}/functions/v1/check-disponibilidade`
// ────────────────────────────────────────────────────────────────────────────

const pad     = n  => String(n).padStart(2, '0')
const esc     = s  => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const fmtDT   = (date, hora) => {
  if (!date) return '—'
  const [y, m, d] = date.split('-')
  return `${d}/${m} ${hora || ''}`
}

// ── Defaults: amanhã 08:00 → depois de amanhã 08:00 ─────────────────────────
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

// ── Fetch categorias ─────────────────────────────────────────────────────────
async function fetchCategorias() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/categorias?tenant_id=eq.${TENANT_ID}&ativo=eq.true&order=slug&select=id,nome,slug`,
    { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Consulta disponibilidade por categoria ───────────────────────────────────
async function checkCategoria(slug, retData, retHora, devData, devHora) {
  const res = await fetch(CHECK_DISP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`
    },
    body: JSON.stringify({
      tenant_id:     TENANT_ID,
      categoria_slug: slug,
      data_retirada: `${retData}T${retHora}:00`,
      data_devolucao:`${devData}T${devHora}:00`
    })
  })
  return res.json()
}

// ── Badge ────────────────────────────────────────────────────────────────────
function badgeHtml(disponivel, total) {
  if (disponivel === 0) {
    return `<span class="badge badge-red">Indisponível</span>`
  }
  const cls = disponivel <= 1 ? 'badge-yellow' : 'badge-green'
  const plural = disponivel === 1 ? 'disponível' : 'disponíveis'
  return `<span class="badge ${cls}">${disponivel} de ${total} ${plural}</span>`
}

// ── Render categoria card ─────────────────────────────────────────────────────
function renderCatCard(cat, disp) {
  const { disponivel = 0, total = 0, detalhes = [] } = disp || {}

  const veiculosHtml = detalhes.length
    ? detalhes.map(v => `
        <div class="veiculo-row">
          <div class="veiculo-dot ${v.disponivel ? 'disp' : 'indisp'}"></div>
          <span class="veiculo-placa">${esc(v.placa)}</span>
          <span class="veiculo-modelo">${esc(v.modelo || '')}</span>
          <span class="veiculo-motivo">${esc(v.motivo || '')}</span>
        </div>`).join('')
    : `<div class="veiculo-row"><span class="veiculo-motivo" style="color:#aaa">Sem veículos cadastrados nesta categoria.</span></div>`

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
      <div class="cat-detail">
        ${veiculosHtml}
      </div>
    </div>`
}

window.toggleCard = function(header) {
  header.closest('.cat-card').classList.toggle('open')
}

// ── Show/hide helpers ─────────────────────────────────────────────────────────
const $ = id => document.getElementById(id)

function showOnly(id) {
  ['results', 'loading', 'empty'].forEach(x => {
    const el = $(x)
    if (el) el.hidden = (x !== id)
  })
}

// ── Main consulta ─────────────────────────────────────────────────────────────
async function consultar(retData, retHora, devData, devHora) {
  $('form-err').hidden = true
  $('btn-consultar').disabled = true
  showOnly('loading')

  try {
    const cats = await fetchCategorias()
    if (!cats.length) { showOnly('empty'); return }

    // Consulta todas as categorias em paralelo
    const results = await Promise.all(
      cats.map(cat =>
        checkCategoria(cat.slug, retData, retHora, devData, devHora)
          .then(d => ({ cat, disp: d }))
          .catch(() => ({ cat, disp: null }))
      )
    )

    // Summary
    const totalDisp = results.filter(r => (r.disp?.disponivel ?? 0) > 0).length
    const totalCats = results.length

    $('results-period').textContent =
      `${fmtDT(retData, retHora)} → ${fmtDT(devData, devHora)}`
    $('results-summary').textContent =
      `${totalDisp} de ${totalCats} grupos com vagas`

    // Auto-abre categorias disponíveis (as 3 primeiras com vagas)
    let autoOpen = 0
    $('cat-list').innerHTML = results.map(({ cat, disp }) => renderCatCard(cat, disp)).join('')
    $('cat-list').querySelectorAll('.cat-card').forEach((card, i) => {
      const slug = card.dataset.slug
      const r = results[i]
      if (r?.disp?.disponivel > 0 && autoOpen < 3) {
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

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const { retData: defRet, devData: defDev } = defaultDates()

  loadState(saved => {
    $('retData').value = saved?.retData || defRet
    $('retHora').value = saved?.retHora || '08:00'
    $('devData').value = saved?.devData || defDev
    $('devHora').value = saved?.devHora || '08:00'
  })

  // Sync devolução date com retirada
  $('retData').addEventListener('change', e => {
    if (!$('devData').value || $('devData').value < e.target.value) {
      $('devData').value = e.target.value
    }
    $('devData').min = e.target.value
  })

  $('form').addEventListener('submit', e => {
    e.preventDefault()
    const retData = $('retData').value
    const retHora = $('retHora').value
    const devData = $('devData').value
    const devHora = $('devHora').value

    const ret = new Date(`${retData}T${retHora}`)
    const dev = new Date(`${devData}T${devHora}`)
    const errEl = $('form-err')

    if (dev <= ret) {
      errEl.textContent = 'A devolução deve ser após a retirada.'
      errEl.hidden = false
      return
    }
    errEl.hidden = true
    consultar(retData, retHora, devData, devHora)
  })
})
