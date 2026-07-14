// ── BARRA STICKY MOBILE ─────────────────────────────────────
import { S } from '../state.js'
import { getPreco } from '../pricing-adapter.js'
import { fmtN } from '../utils.js'

export function ensureMobileBar() {
  if (document.getElementById('mobile-bar')) return
  const bar = document.createElement('div')
  bar.id = 'mobile-bar'
  bar.className = 'mobile-sticky-bar'
  bar.setAttribute('aria-live', 'polite')
  bar.setAttribute('aria-label', 'Resumo da seleção')
  bar.innerHTML = `
    <div class="mobile-bar-info">
      <span class="mobile-bar-cat" id="mb-cat">Escolha um veículo</span>
      <span class="mobile-bar-price" id="mb-price"></span>
    </div>
    <button class="btn btn-primary mobile-bar-btn" onclick="nextStep()">Avançar →</button>`
  document.body.appendChild(bar)
}

export function updateMobileBar() {
  const catEl   = document.getElementById('mb-cat')
  const priceEl = document.getElementById('mb-price')
  if (!catEl || !priceEl) return

  const cat = S.categorias.find(x => x.id === S.catId)
  if (!cat) {
    catEl.textContent   = 'Escolha um veículo'
    priceEl.textContent = ''
    return
  }

  const prot     = S.protecoes.find(x => x.id === S.protId)
  const preco    = getPreco(cat)
  const dias     = S.dias || 1
  const baseCat  = preco * dias
  const baseProt = prot ? (prot.tipo_preco === 'per_day' ? prot.preco * dias : prot.preco) : 0
  const totalAdd = S.adicionais_sel.reduce((s, a) => s + a.subtotal, 0)
  const total    = baseCat + baseProt + totalAdd

  catEl.textContent   = cat.nome
  priceEl.textContent = `R$ ${fmtN(total)}`
}
