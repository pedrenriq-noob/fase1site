// ── STEP 2 — PROTEÇÕES ────────────────────────────────────
import { S } from '../state.js'
import { esc, fmtN } from '../utils.js'
import { updateSummary } from './summary.js'

export function renderStep2(c) {
  c.innerHTML = `
  <div class="main-content">
    <button class="top-back" onclick="prevStep()">← Voltar</button>
    <h2>🛡 Escolha a Proteção</h2>
    <p style="margin-bottom:16px;color:var(--muted);font-size:13px">Selecione uma opção — ou avance sem proteção (caução de R$ 25.000,00)</p>
    <div id="protList">
      ${S.protecoes.map(p => {
        const sel   = S.protId === p.id
        const preco = p.tipo_preco === 'per_day' ? `R$ ${fmtN(p.preco)}/dia` : `R$ ${fmtN(p.preco)}`
        return `<div class="protection-card${sel ? ' selected' : ''}" onclick="selectProt('${p.id}')">
          <h3>${esc(p.nome)}</h3>
          ${p.descricao ? `<p>${esc(p.descricao)}</p>` : ''}
          ${p.franquia  ? `<p style="font-size:11px;color:var(--muted)">Franquia: ${esc(p.franquia)}</p>` : ''}
          <p class="price" style="display:inline-block;background:#fff3ea;padding:4px 10px;border-radius:20px;color:var(--orange);font-weight:700;margin-top:6px">${preco}</p>
        </div>`
      }).join('')}
    </div>
    <div id="step2-err"></div>
    <div class="button-group">
      <button class="btn btn-secondary" onclick="prevStep()">← Voltar</button>
      <button class="btn btn-primary" onclick="nextStep()">Avançar →</button>
    </div>
  </div>`
}

window.selectProt = function(id) {
  S.protId = id
  document.querySelectorAll('.protection-card').forEach(el => {
    const elId = el.getAttribute('onclick')?.match(/'([^']+)'/)?.[1]
    el.classList.toggle('selected', elId === id)
  })
  updateSummary()
}
