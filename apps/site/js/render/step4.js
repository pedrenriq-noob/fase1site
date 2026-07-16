// ── STEP 4 — DADOS DO CLIENTE + ENVIO ──────────────────────
import { TENANT_ID, WHATSAPP } from '../../supabase.js'
import { S, clearSession } from '../state.js'
import { esc, fmtN, fmtDate, pad, maskCPF, maskWpp } from '../utils.js'
import { getPreco, calcBaseProtecao } from '../pricing-adapter.js'
import { nomeCurto } from '../locations.js'
import { validate } from '../validation.js'

export function renderStep4(c) {
  const cat = S.categorias.find(x => x.id === S.catId)
  const maxP = cat?.max_pessoas ?? 5

  c.innerHTML = `
  <div class="main-content">
    <button class="top-back" onclick="prevStep()">← Voltar</button>
    <h2>👤 Seus Dados</h2>

    <label class="estrangeiro-toggle" id="estrangeiro-label">
      <input type="checkbox" id="cli-estrangeiro" ${S.estrangeiro ? 'checked' : ''}>
      <span>🌍 Sou estrangeiro — não possuo CPF brasileiro</span>
    </label>

    <div class="form-row-2">
      <div class="form-group">
        <label for="cli-nome">Nome Completo *</label>
        <input id="cli-nome" type="text" value="${esc(S.nome)}" placeholder="Seu nome completo">
      </div>
      <div class="form-group" id="grupo-cpf" ${S.estrangeiro ? 'style="display:none"' : ''}>
        <label for="cli-cpf">CPF *</label>
        <input id="cli-cpf" type="text" value="${esc(S.cpf)}" placeholder="000.000.000-00" maxlength="14">
      </div>
      <div class="form-group" id="grupo-doc" ${S.estrangeiro ? '' : 'style="display:none"'}>
        <label for="cli-doc">Documento de Identificação *</label>
        <input id="cli-doc" type="text" value="${esc(S.cpf)}" placeholder="Passaporte, RNE, DNI...">
      </div>
    </div>

    <div class="form-row-2">
      <div class="form-group">
        <label for="cli-wpp">WhatsApp *</label>
        <input id="cli-wpp" type="tel" value="${esc(S.whatsapp)}" placeholder="(45) 9 9999-9999">
      </div>
      <div class="form-group">
        <label for="cli-email">E-mail *</label>
        <input id="cli-email" type="email" value="${esc(S.email)}" placeholder="seu@email.com">
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px">
      <div class="form-group">
        <label for="cli-companhia">Companhia Aérea</label>
        <select id="cli-companhia">
          <option value="">Sem voo / Não sei</option>
          <option value="GOL" ${S.companhia === 'GOL' ? 'selected' : ''}>GOL</option>
          <option value="AZUL" ${S.companhia === 'AZUL' ? 'selected' : ''}>AZUL</option>
          <option value="LATAM" ${S.companhia === 'LATAM' ? 'selected' : ''}>LATAM</option>
        </select>
      </div>
      <div class="form-group">
        <label for="cli-voo">Número do Voo</label>
        <input id="cli-voo" type="text" value="${esc(S.voo)}" placeholder="Ex: 1234">
      </div>
      <div class="form-group">
        <label for="cli-pouso">Previsão de Pouso</label>
        <select id="cli-pouso">
          <option value="">Sem transfer</option>
          ${pousoOpts(S.pouso)}
        </select>
      </div>
      <div class="form-group">
        <label for="cli-pessoas">Nº de Pessoas</label>
        <input id="cli-pessoas" type="number" min="1" max="${maxP}" value="${S.pessoas}">
      </div>
    </div>

    <div class="form-group">
      <label for="cli-obs">Observações</label>
      <textarea id="cli-obs" rows="2" placeholder="Informações adicionais...">${esc(S.obs)}</textarea>
    </div>

    <div class="terms-box">
      <h4>📋 INFORMAÇÕES IMPORTANTES</h4>
      <label class="terms-label">
        <input type="checkbox" id="cli-termos" ${S.termos ? 'checked' : ''}>
        <span>✅ Declaro ter <strong>mais de 21 anos</strong> e CNH válida há mais de 2 anos.<br>
        ✅ Para travessia de fronteira, é obrigatória a apresentação da <strong>CNH física</strong> no momento da retirada.</span>
      </label>
    </div>

    <div class="step4-resumo">
      <h4>📋 Resumo da Solicitação</h4>
      ${generateResumoHTML()}
    </div>

    <div id="step4-err"></div>
    <div class="button-group">
      <button class="btn btn-secondary" onclick="prevStep()">← Voltar</button>
      <button class="btn btn-primary" id="btn-submit" onclick="submitReservation()">Enviar Solicitação 🚀</button>
    </div>
  </div>`

  // Toggle estrangeiro
  const estrangeiroEl = document.getElementById('cli-estrangeiro')
  const grupoCpf      = document.getElementById('grupo-cpf')
  const grupoDoc      = document.getElementById('grupo-doc')
  estrangeiroEl.addEventListener('change', () => {
    S.estrangeiro = estrangeiroEl.checked
    grupoCpf.style.display = S.estrangeiro ? 'none' : ''
    grupoDoc.style.display = S.estrangeiro ? '' : 'none'
    if (!S.estrangeiro) {
      // Volta ao CPF: limpa o campo doc e restaura campo cpf
      document.getElementById('cli-doc').value = ''
    } else {
      // Vai para estrangeiro: limpa CPF
      document.getElementById('cli-cpf').value = ''
      S.cpf = ''
    }
  })

  // Máscaras
  const cpfEl = document.getElementById('cli-cpf')
  cpfEl.addEventListener('input', () => { cpfEl.value = maskCPF(cpfEl.value) })

  const wppEl = document.getElementById('cli-wpp')
  wppEl.addEventListener('input', () => { wppEl.value = maskWpp(wppEl.value) })
}

function pousoOpts(sel) {
  let s = ''
  for (let h = 7; h <= 19; h++)
    for (let m = 0; m < 60; m += 10) {
      if (h === 7 && m < 30) continue
      if (h === 19 && m > 30) break
      const v = pad(h) + ':' + pad(m)
      s += `<option${v === sel ? ' selected' : ''}>${v}</option>`
    }
  return s
}

function generateResumoHTML() {
  const cat  = S.categorias.find(x => x.id === S.catId)
  const prot = S.protecoes.find(x => x.id === S.protId)
  if (!cat) return '<p style="color:var(--muted)">—</p>'

  const preco   = getPreco(cat)
  const dias    = S.dias || 1
  const diasFmt = Number.isInteger(dias) ? dias : dias.toFixed(1).replace('.', ',')
  const baseCat = preco * dias
  const baseProt = calcBaseProtecao(prot)
  const totalAdd = S.adicionais_sel.reduce((s, a) => s + a.subtotal, 0)
  const total    = baseCat + baseProt + totalAdd

  const addRows = S.adicionais_sel.map(a =>
    `<div class="resumo-row"><span>${esc(a.nome)}${a.quantidade > 1 ? ` (${a.quantidade}×)` : ''}</span><span>R$ ${fmtN(a.subtotal)}</span></div>`
  ).join('')

  return `
    <div class="resumo-row"><span>Período</span><span>${fmtDate(S.retData)} – ${fmtDate(S.devData)}</span></div>
    <div class="resumo-row"><span>Retirada</span><span>${esc(S.retHora)} — ${nomeCurto(S.retLocal)}</span></div>
    <div class="resumo-row"><span>Devolução</span><span>${esc(S.devHora)} — ${nomeCurto(S.devLocal)}</span></div>
    <div class="resumo-row"><span>Categoria</span><span>${esc(cat.nome)}</span></div>
    <div class="resumo-row"><span>Diárias</span><span>${diasFmt} × R$ ${fmtN(preco)}</span></div>
    ${prot ? `<div class="resumo-row"><span>Proteção — ${esc(prot.nome)}</span><span>R$ ${fmtN(baseProt)}</span></div>` : ''}
    ${addRows}
    <div class="resumo-total-row"><span>TOTAL:</span><span>R$ ${fmtN(total)}</span></div>`
}

// ── SUBMIT ─────────────────────────────────────────────────
window.submitReservation = async function() {
  if (!validate()) return

  const retDT = new Date(`${S.retData}T${S.retHora}:00`)
  if ((retDT - Date.now()) / 3600000 < 24) {
    if (!confirm('⚠️ Reserva com menos de 24h de antecedência.\nEntre em contato direto pelo WhatsApp.\n\nDeseja continuar?')) return
  }

  const btn = document.getElementById('btn-submit')
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Enviando...' }

  const errEl = document.getElementById('step4-err')
  if (errEl) errEl.innerHTML = ''

  // Timeout defensivo: sem isso, uma rede instável ou o servidor sem
  // responder deixava o botão em "Enviando..." indefinidamente, sem
  // nenhum feedback e sem forma de tentar de novo.
  const abortCtrl = new AbortController()
  const timeoutId = setTimeout(() => abortCtrl.abort(), 20000)

  try {
    const cat  = S.categorias.find(x => x.id === S.catId)
    const prot = S.protecoes.find(x => x.id === S.protId)
    if (!cat) throw new Error('Categoria não encontrada. Recarregue a página e tente novamente.')

    // Envia para Edge Function — preços são recalculados e validados server-side
    const res = await fetch('https://lxfnqzuzohudqwibgdic.supabase.co/functions/v1/criar-solicitacao', {
      method: 'POST',
      signal: abortCtrl.signal,
      headers: { 'Content-Type': 'application/json', 'apikey': 'sb_publishable_lZYtlQFkZCgUE-ppawmXHA_CPo0tPUF' },
      body: JSON.stringify({
        tenant_id:        TENANT_ID,
        categoria_id:     S.catId,
        protecao_id:      S.protId      || null,
        cliente_nome:     S.nome,
        cliente_email:    S.email,
        cliente_whatsapp: S.whatsapp.replace(/\D/g, ''),
        cliente_cpf:      S.estrangeiro ? null : (S.cpf.replace(/\D/g, '') || null),
        cliente_doc:      S.estrangeiro ? S.cpf : null,
        estrangeiro:      S.estrangeiro,
        companhia_aerea:  S.companhia   || null,
        data_retirada:    `${S.retData}T${S.retHora}:00`,
        data_devolucao:   `${S.devData}T${S.devHora}:00`,
        local_retirada:   S.retLocal,
        local_devolucao:  S.devLocal,
        pessoas:          S.pessoas,
        numero_voo:       S.voo         || null,
        horario_pouso:    S.pouso       || null,
        observacoes:      S.obs         || null,
        itens: S.adicionais_sel.map(a => ({
          adicional_id: a.id,
          quantidade:   a.quantidade,
        })),
      }),
    })

    clearTimeout(timeoutId)

    let resultado
    try {
      resultado = await res.json()
    } catch (_) {
      throw new Error('O servidor demorou para responder. Tente novamente em instantes ou fale com a gente pelo WhatsApp.')
    }
    if (!res.ok) throw new Error(resultado.error?.message ?? `Erro ${res.status}`)

    const total = resultado.valor_estimado
    const dias  = S.dias || 1

    clearSession()

    // WhatsApp message
    const waMsg = buildWhatsMsg(cat, prot, total, dias)
    showSuccess(waMsg, total)

  } catch (e) {
    clearTimeout(timeoutId)
    // "Failed to fetch"/TypeError = sem conexão; AbortError = timeout — nenhum
    // dos dois é uma mensagem que faz sentido para o cliente final, por isso
    // trocamos por um texto cordial. Erros vindos do servidor (validate() local
    // ou a Edge Function) já chegam em português e ficam como estão.
    const semConexao = e.name === 'AbortError' || e instanceof TypeError
    const msg = semConexao
      ? 'Não foi possível conectar. Verifique sua internet e tente novamente — se o problema continuar, fale com a gente pelo WhatsApp.'
      : e.message
    if (errEl) {
      errEl.innerHTML = `<div class="step-error">${esc(msg)}</div>`
      errEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Enviar Solicitação 🚀' }
  }
}

function buildWhatsMsg(cat, prot, total, dias) {
  const R   = v => 'R$ ' + fmtN(v)
  const SEP = '━━━━━━━━━━━━━━━━━━'
  const preco = getPreco(cat)

  let itens = `• ${cat.nome} – ${dias}×: *${R(preco * dias)}*`
  if (prot) itens += `\n• ${prot.nome}: *${R(calcBaseProtecao(prot))}*`
  S.adicionais_sel.forEach(a => {
    itens += `\n• ${a.nome}${a.quantidade > 1 ? ` (${a.quantidade}×)` : ''}: *${R(a.subtotal)}*`
  })

  const vooLabel = [S.companhia, S.voo].filter(Boolean).join(' ') || '—'
  const linhaVoo = S.voo || S.pouso || S.companhia
    ? `✈️ ${vooLabel} | Pouso: ${S.pouso || '—'}\n👥 ${S.pessoas} pessoa${S.pessoas > 1 ? 's' : ''}`
    : `👥 ${S.pessoas} pessoa${S.pessoas > 1 ? 's' : ''}`

  return encodeURIComponent(
`\u{1F4CB} *IGUFOZ – NOVA RESERVA*

\u{1F464} *${S.nome}*
CPF: ${S.cpf.replace(/\D/g,'').replace(/(\d{3})\d{3}(\d{3})(\d{2})/, '$1.***.***-$3')}
\u{1F4F1} ${maskWpp(S.whatsapp)} | ✉ ${S.email}

${linhaVoo}

${SEP}

\u{1F4CD} *Retirada:* ${fmtDate(S.retData)} – ${S.retHora}
${S.retLocal}

\u{1F4CD} *Devolução:* ${fmtDate(S.devData)} – ${S.devHora}
${S.devLocal}

${SEP}

\u{1F4B0} *Valores:*
${itens}

\u{1F4B3} *Total: ${R(total)}*

\u{1F4DD} ${S.obs || 'Sem observações'}`)
}

function showSuccess(waMsg, total) {
  const c        = document.getElementById('content')
  const summary  = document.getElementById('summary')
  const stepsBar = document.getElementById('steps-bar')
  if (summary)  summary.style.display  = 'none'
  if (stepsBar) stepsBar.style.display = 'none'

  document.querySelectorAll('.step').forEach(el => el.classList.remove('active'))
  const prog = document.getElementById('progress')
  if (prog) prog.style.width = '100%'

  c.innerHTML = `
  <div class="main-content">
    <div class="success-wrap">
      <div class="success-icon">✅</div>
      <h2>Solicitação Enviada!</h2>
      <p>Olá, ${esc(S.nome.split(' ')[0])}! Sua solicitação foi recebida.<br>
         Nossa equipe entrará em contato em breve para confirmar sua reserva.</p>
      <p style="font-size:14px;color:var(--muted);margin-bottom:12px">Para agilizar seu atendimento, você pode enviar sua solicitação direto para o nosso WhatsApp:</p>
      <a href="https://wa.me/${WHATSAPP}?text=${waMsg}" target="_blank" class="btn-whats">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Falar no WhatsApp
      </a>
      <br><br>
      <button class="btn btn-secondary" onclick="location.reload()">Nova Reserva</button>
    </div>
  </div>`
}
