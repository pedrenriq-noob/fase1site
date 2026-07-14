// ── STEP 3 — ADICIONAIS ───────────────────────────────────
import { S } from '../state.js'
import { esc, fmtN } from '../utils.js'
import { calcSubtotal, getTotalCad } from '../pricing-adapter.js'
import { isAddAero, localIsAero } from '../locations.js'
import { showToast } from '../ui.js'
import { updateSummary } from './summary.js'

export function renderStep3(c) {
  const cat         = S.categorias.find(x => x.id === S.catId)
  const limCad      = cat?.max_cadeirinhas ?? 2
  const totalCad    = getTotalCad()

  c.innerHTML = `
  <div class="main-content">
    <button class="top-back" onclick="prevStep()">← Voltar</button>
    <h2>➕ Adicionais</h2>
    <p style="margin-bottom:16px;color:var(--muted);font-size:13px">Escolha itens adicionais (opcional)</p>
    <div>
      ${S.adicionais.map(a => {
        const sel = S.adicionais_sel.find(x => x.id === a.id)
        const qty = sel?.quantidade ?? 0
        const isCad   = a.is_cadeirinha
        const limAting = isCad && totalCad >= limCad
        if (isCad && limCad === 0) return ''
        const preco = a.tipo_preco === 'per_day' ? `R$ ${fmtN(a.preco)}/dia` : `R$ ${fmtN(a.preco)}`

        if (a.permite_quantidade) {
          return `<div class="additional-item">
            <div style="flex:1">
              <h4>${esc(a.nome)}</h4>
              ${a.descricao ? `<p>${esc(a.descricao)}</p>` : ''}
              <p class="add-price">${preco}</p>
              ${isCad ? `<p style="font-size:11px;color:var(--muted)">Limite: ${limCad} (${totalCad}/${limCad})</p>` : ''}
            </div>
            <div class="quantity-control">
              <button class="quantity-btn" onclick="addQty('${a.id}',-1)">−</button>
              <span class="quantity-display" id="qty_${a.id}">${qty}</span>
              <button class="quantity-btn" onclick="addQty('${a.id}',1)" ${limAting && qty === 0 ? 'disabled' : ''}>+</button>
            </div>
          </div>`
        } else {
          const isAeroAdd = isAddAero(a)
          const checked   = !!sel
          const autoSel = isAeroAdd && localIsAero(S.devLocal)
          return `<div class="additional-item${checked ? ' selected-add' : ''}" onclick="${autoSel ? '' : `toggleAdd('${a.id}')`}" style="${autoSel ? 'opacity:.75;cursor:default' : 'cursor:pointer'}">
            <div style="flex:1">
              <h4>${esc(a.nome)}</h4>
              ${a.descricao ? `<p>${esc(a.descricao)}</p>` : ''}
              <p class="add-price">${preco}</p>
              ${autoSel ? '<p style="font-size:11px;color:var(--muted)">Selecionado automaticamente</p>' : ''}
            </div>
            <div class="add-toggle${checked ? ' checked' : ''}">${checked ? '✓' : ''}</div>
          </div>`
        }
      }).join('')}
    </div>
    <div id="step3-err"></div>
    <div class="button-group">
      <button class="btn btn-secondary" onclick="prevStep()">← Voltar</button>
      <button class="btn btn-primary" onclick="nextStep()">Avançar →</button>
    </div>
  </div>`
}

window.addQty = function(id, delta) {
  const a       = S.adicionais.find(x => x.id === id)
  const cat     = S.categorias.find(x => x.id === S.catId)
  const limCad  = cat?.max_cadeirinhas ?? 2

  if (a.is_cadeirinha && delta > 0 && getTotalCad() >= limCad) {
    showToast(`Limite de ${limCad} cadeirinha${limCad !== 1 ? 's' : ''} para este veículo.`, 'warning'); return
  }

  const idx = S.adicionais_sel.findIndex(x => x.id === id)
  if (idx >= 0) {
    const newQ = S.adicionais_sel[idx].quantidade + delta
    if (newQ <= 0) S.adicionais_sel.splice(idx, 1)
    else {
      S.adicionais_sel[idx].quantidade = newQ
      S.adicionais_sel[idx].subtotal   = calcSubtotal(a, newQ)
    }
  } else if (delta > 0) {
    S.adicionais_sel.push({ id, nome: a.nome, preco: a.preco, quantidade: 1, tipo_preco: a.tipo_preco, subtotal: calcSubtotal(a, 1) })
  }
  renderStep3(document.getElementById('content'))
  updateSummary()
}

window.toggleAdd = function(id) {
  const a   = S.adicionais.find(x => x.id === id)
  const idx = S.adicionais_sel.findIndex(x => x.id === id)
  if (idx >= 0) S.adicionais_sel.splice(idx, 1)
  else S.adicionais_sel.push({ id, nome: a.nome, preco: a.preco, quantidade: 1, tipo_preco: a.tipo_preco, subtotal: calcSubtotal(a, 1) })
  renderStep3(document.getElementById('content'))
  updateSummary()
}
