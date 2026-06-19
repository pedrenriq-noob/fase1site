import { supabase, TENANT_ID, WHATSAPP } from './supabase.js'

// ── STATE ──────────────────────────────────────────────────
const S = {
  step: 1,
  // datas / horários / locais
  retData: '', retHora: '',
  devData: '', devHora: '',
  retLocal: '', devLocal: '',
  dias: 0,
  // dados carregados do Supabase
  categorias: [], protecoes: [], adicionais: [], sazonalidade: [], locais: [],
  // seleções
  catId: null,
  protId: null,
  adicionais_sel: [],   // [{id, nome, preco, quantidade, tipo_preco, subtotal, auto}]
  // cliente
  nome: '', cpf: '', whatsapp: '', email: '',
  voo: '', companhia: '', pouso: '', pessoas: 1, obs: '',
  termos: false,
}

// ── BOOT ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  await loadData()
  renderStep()
})

async function loadData() {
  const [rC, rP, rA, rS, rL] = await Promise.all([
    supabase.from('categorias').select('*').eq('tenant_id', TENANT_ID).eq('ativo', true).order('ordem'),
    supabase.from('protecoes').select('*').eq('tenant_id', TENANT_ID).eq('ativo', true).order('ordem'),
    supabase.from('adicionais').select('*').eq('tenant_id', TENANT_ID).eq('ativo', true).order('ordem'),
    supabase.from('sazonalidade').select('*').eq('tenant_id', TENANT_ID).order('data_inicio'),
    supabase.from('locais').select('*').eq('tenant_id', TENANT_ID).eq('ativo', true).order('ordem'),
  ])
  if (rC.error || rP.error || rA.error || rS.error) {
    document.getElementById('content').innerHTML =
      `<div style="padding:40px;text-align:center;color:#ef4444">Erro ao carregar dados. Tente recarregar a página.</div>`
    return
  }
  S.categorias   = rC.data ?? []
  S.protecoes    = rP.data ?? []
  S.adicionais   = rA.data ?? []
  S.sazonalidade = rS.data ?? []
  // locais: se a tabela ainda não existe no banco, usa lista de fallback
  S.locais = (rL.data && rL.data.length > 0) ? rL.data : [
    { nome: 'Av. Brasil, 90 — Centro',                        permite_retirada: true, permite_devolucao: true, hora_retirada_inicio: '08:00', hora_retirada_fim: '18:00', hora_devolucao_inicio: '08:00', hora_devolucao_fim: '18:00', disponivel_domingo: false, is_aeroporto: false },
    { nome: 'Av. das Cataratas, 1419 — Vila Yolanda',         permite_retirada: true, permite_devolucao: true, hora_retirada_inicio: '08:00', hora_retirada_fim: '18:00', hora_devolucao_inicio: '08:00', hora_devolucao_fim: '18:00', disponivel_domingo: true,  is_aeroporto: false },
    { nome: 'Estacionamento Leva e Trás 24h — Aeroporto',     permite_retirada: true, permite_devolucao: true, hora_retirada_inicio: null,    hora_retirada_fim: null,    hora_devolucao_inicio: null,    hora_devolucao_fim: null,    disponivel_domingo: true,  is_aeroporto: true  },
  ]
}

// ── HELPERS DE LOCAIS ─────────────────────────────────────
function locaisParaRetirada(data, hora) {
  const domingo = isSunday(data)
  const hMin    = horaParaMinutos(hora)
  return S.locais.filter(l => {
    if (!l.permite_retirada) return false
    if (domingo && !l.disponivel_domingo) return false
    if (l.hora_retirada_inicio && hora) {
      const ini = horaParaMinutos(l.hora_retirada_inicio)
      const fim = horaParaMinutos(l.hora_retirada_fim)
      if (hMin < ini || hMin > fim) return false
    }
    return true
  })
}

function locaisParaDevolucao(data, hora) {
  const domingo = isSunday(data)
  const hMin    = horaParaMinutos(hora)
  return S.locais.filter(l => {
    if (!l.permite_devolucao) return false
    if (domingo && !l.disponivel_domingo) return false
    if (l.hora_devolucao_inicio && hora) {
      const ini = horaParaMinutos(l.hora_devolucao_inicio)
      const fim = horaParaMinutos(l.hora_devolucao_fim)
      if (hMin < ini || hMin > fim) return false
    }
    return true
  })
}

function horaParaMinutos(t) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function avisoRetirada(data, hora) {
  if (!data || !hora) return ''
  const disponiveis = locaisParaRetirada(data, hora)
  const todos = S.locais.filter(l => l.permite_retirada)
  if (disponiveis.length === 0) return '<p class="aviso">⚠️ Nenhum local disponível neste horário para retirada.</p>'
  if (disponiveis.length < todos.length) {
    const nomes = disponiveis.map(l => l.nome.split('—')[0].trim()).join(', ')
    return `<p class="aviso">⚠️ Neste horário, retirada disponível apenas em: ${nomes}.</p>`
  }
  return ''
}

function avisoDevolucao(data, hora) {
  if (!data || !hora) return ''
  const disponiveis = locaisParaDevolucao(data, hora)
  const todos = S.locais.filter(l => l.permite_devolucao)
  if (disponiveis.length === 0) return '<p class="aviso">⚠️ Nenhum local disponível neste horário para devolução.</p>'
  if (disponiveis.length < todos.length) {
    const nomes = disponiveis.map(l => l.nome.split('—')[0].trim()).join(', ')
    return `<p class="aviso">⚠️ Neste horário, devolução disponível apenas em: ${nomes}.</p>`
  }
  return ''
}

// ── RENDER STEP ────────────────────────────────────────────
function renderStep() {
  const content  = document.getElementById('content')
  const app      = document.getElementById('app')
  const header   = document.getElementById('main-header')
  const stepsBar = document.getElementById('steps-bar')
  const summary  = document.getElementById('summary')

  const isLanding = S.step === 0
  app?.classList.toggle('mode-landing', isLanding)
  app?.classList.toggle('mode-flow',    !isLanding)
  header?.classList.toggle('header-dark', isLanding)

  if (stepsBar) stepsBar.style.display = isLanding ? 'none' : ''
  if (summary)  summary.style.display  = (isLanding || S.step === 4) ? 'none' : ''

  if (!isLanding) {
    const prog = document.getElementById('progress')
    if (prog) prog.style.width = `${(S.step / 4) * 100}%`
    document.querySelectorAll('.step').forEach((el, i) => {
      el.classList.toggle('active', i + 1 === S.step)
    })
  }

  if      (S.step === 0) renderLanding(content)
  else if (S.step === 1) renderStep1(content)
  else if (S.step === 2) renderStep2(content)
  else if (S.step === 3) renderStep3(content)
  else if (S.step === 4) renderStep4(content)

  if (!isLanding) updateSummary()
  window.scrollTo(0, 0)
}

// ── LANDING PAGE ───────────────────────────────────────────
function renderLanding(c) {
  const locRet  = S.locais.filter(l => l.permite_retirada)
  const optsLoc = locRet.map(l =>
    `<option value="${esc(l.nome)}"${l.nome === S.retLocal ? ' selected' : ''}>${esc(l.nome)}</option>`
  ).join('')

  const cats = S.categorias.slice(0, 5)
  const strip = cats.map(cat => {
    const desc  = (cat.descricao ?? '').split(/\s*[-–(]/)[0].trim()
    const label = desc.length > 18 ? desc.slice(0, 18) + '…' : (desc || cat.nome)
    const preco = Math.round(cat.preco_diaria)
    return `
    <div class="cat-strip-item" onclick="iniciarReserva()">
      <div class="cat-strip-label">${esc(cat.nome)}</div>
      <div class="cat-strip-name">${esc(label)}</div>
      <div class="cat-strip-price">R$ ${preco.toLocaleString('pt-BR')} <span>/dia</span></div>
    </div>`
  }).join('')

  c.innerHTML = `
  <section class="hero">
    <div class="hero-left">
      <div class="hero-eyebrow">FOZ DO IGUAÇU · FRONTEIRA</div>
      <h1 class="hero-title">Alugue seu carro<br>na Tríplice Fronteira</h1>
      <p class="hero-sub">Retirada no aeroporto ou centro.<br>Frota moderna, processo simples.</p>
      <div class="hero-tags">
        <span class="hero-tag">Aeroporto IGU</span>
        <span class="hero-tag">Fronteira PY/AR</span>
        <span class="hero-tag">Carta Verde</span>
      </div>
    </div>
    <div class="hero-card">
      <h3 class="hero-card-title">Reserve seu veículo</h3>
      <div class="form-group">
        <label>E-MAIL</label>
        <input type="email" id="land-email" value="${esc(S.email)}" placeholder="seu@email.com">
      </div>
      <div class="land-dates">
        <div class="form-group">
          <label>RETIRADA</label>
          <input type="date" id="land-ret" min="${minDate()}" value="${S.retData}">
        </div>
        <div class="form-group">
          <label>DEVOLUÇÃO</label>
          <input type="date" id="land-dev" value="${S.devData}">
        </div>
      </div>
      <div class="form-group">
        <label>LOCAL DE RETIRADA</label>
        <select id="land-local">
          <option value="">Selecione o local...</option>
          ${optsLoc}
        </select>
      </div>
      <div id="land-err"></div>
      <button class="btn-land-cta" onclick="iniciarReserva()">Ver veículos disponíveis →</button>
    </div>
  </section>
  ${cats.length ? `
  <section class="cat-strip">${strip}</section>
  <div class="feature-strip">
    <span>✓ Frota sempre revisada</span>
    <span>✓ Carta Verde disponível</span>
    <span>✓ Translado do aeroporto</span>
    <span>✓ Atendimento em PT/ES</span>
  </div>` : ''}
  `

  // Sincroniza min do campo devolução com retirada
  const retEl = document.getElementById('land-ret')
  const devEl = document.getElementById('land-dev')
  if (retEl && devEl) {
    if (retEl.value) devEl.min = retEl.value
    retEl.addEventListener('change', () => {
      devEl.min = retEl.value
      if (devEl.value && devEl.value < retEl.value) devEl.value = ''
    })
  }
}

window.iniciarReserva = function() {
  const email = document.getElementById('land-email')?.value.trim() || ''
  const ret   = document.getElementById('land-ret')?.value  || ''
  const dev   = document.getElementById('land-dev')?.value  || ''
  const local = document.getElementById('land-local')?.value || ''
  const errEl = document.getElementById('land-err')
  const err = (msg) => { if (errEl) errEl.innerHTML = `<div class="step-error">${msg}</div>`; return false }

  if (!ret)      return err('Informe a data de retirada.')
  if (!dev)      return err('Informe a data de devolução.')
  if (dev < ret) return err('A data de devolução deve ser após a retirada.')

  if (email) S.email = email
  S.retData  = ret
  S.devData  = dev
  S.retLocal = local
  calcDias()
  S.step = 1
  renderStep()
}

// ── STEP 1 — PERÍODO + CATEGORIA ──────────────────────────
function renderStep1(c) {
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
        <div class="date-time-group">
          <input type="date" id="retData" min="${minDate()}" value="${S.retData}">
          <select id="retHora">${timeOpts(8, 23, S.retHora)}</select>
        </div>
        ${avisoRetirada(S.retData, S.retHora)}
      </div>
      <div class="period-group">
        <label>Devolução *</label>
        <div class="date-time-group">
          <input type="date" id="devData" min="${S.retData || minDate()}" value="${S.devData}">
          <select id="devHora">${timeOpts(0, 23, S.devHora)}</select>
        </div>
        ${avisoDevolucao(S.devData, S.devHora)}
      </div>
    </div>

    <div class="location-row">
      <div>
        <label>Local de Retirada *</label>
        <select id="retLocal">
          <option value="">Selecione...</option>
          ${locRet.map(l => `<option${l.nome === S.retLocal ? ' selected' : ''}>${esc(l.nome)}</option>`).join('')}
        </select>
      </div>
      <div>
        <label>Local de Devolução *</label>
        <select id="devLocal">
          <option value="">Selecione...</option>
          ${locDev.map(l => `<option${l.nome === S.devLocal ? ' selected' : ''}>${esc(l.nome)}</option>`).join('')}
        </select>
      </div>
    </div>

    <h2 style="margin-top:4px">🚘 Escolha a Categoria</h2>
    <div class="category-grid" id="catGrid">${renderCatCards()}</div>

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
    document.getElementById('devData').min = e.target.value
    if (S.devData && S.devData < S.retData) { S.devData = '' }
    calcDias(); renderStep1(c)
  })
  document.getElementById('retHora').addEventListener('change', e => { S.retHora = e.target.value; calcDias(); renderStep1(c) })
  document.getElementById('devData').addEventListener('change', e => { S.devData = e.target.value; calcDias(); renderStep1(c) })
  document.getElementById('devHora').addEventListener('change', e => { S.devHora = e.target.value; calcDias(); renderStep1(c) })
  document.getElementById('retLocal').addEventListener('change', e => { S.retLocal = e.target.value })
  document.getElementById('devLocal').addEventListener('change', e => { S.devLocal = e.target.value; syncAeroAdd(); updateSummary() })
}

function renderCatCards() {
  if (!S.categorias.length) return '<p style="color:var(--muted);font-size:14px;padding:12px 0">Carregando categorias...</p>'
  return S.categorias.map(cat => {
    const preco    = getPreco(cat)
    const esgotado = cat.quantidade_frota != null && cat.quantidade_frota <= 0
    const sel      = S.catId === cat.id
    const img      = cat.imagem_url
      ? `<img src="${esc(cat.imagem_url)}" alt="${esc(cat.nome)}" class="category-img" onerror="this.style.display='none'">`
      : ''
    return `<div class="category-card${sel ? ' selected' : ''}${esgotado ? ' esgotado' : ''}" onclick="${esgotado ? '' : `selectCat('${cat.id}')`}" data-id="${cat.id}">
      ${img}
      <div class="category-card-body">
        <h3>${esc(cat.nome)}</h3>
        <p>${esc(cat.transmissao ?? '')}</p>
        <p>${esc(cat.descricao ?? '')}</p>
        <p class="price">R$ ${fmtN(preco)}/dia${esgotado ? ' — <em>Indisponível</em>' : ''}</p>
      </div>
    </div>`
  }).join('')
}

window.selectCat = function(id) {
  S.catId = id
  document.querySelectorAll('.category-card').forEach(el => {
    el.classList.toggle('selected', el.dataset.id === id)
  })
  updateSummary()
}

// ── STEP 2 — PROTEÇÕES ────────────────────────────────────
function renderStep2(c) {
  c.innerHTML = `
  <div class="main-content">
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

// ── STEP 3 — ADICIONAIS ───────────────────────────────────
function renderStep3(c) {
  const cat         = S.categorias.find(x => x.id === S.catId)
  const limCad      = cat?.max_cadeirinhas ?? 2
  const totalCad    = getTotalCad()

  c.innerHTML = `
  <div class="main-content">
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
    alert(`Limite de ${limCad} cadeirinhas para este veículo.`); return
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

// ── STEP 4 — DADOS DO CLIENTE ─────────────────────────────
function renderStep4(c) {
  const cat = S.categorias.find(x => x.id === S.catId)
  const maxP = cat?.max_pessoas ?? 5

  c.innerHTML = `
  <div class="main-content">
    <h2>👤 Seus Dados</h2>

    <div class="form-row-2">
      <div class="form-group">
        <label>Nome Completo *</label>
        <input id="cli-nome" type="text" value="${esc(S.nome)}" placeholder="Seu nome completo">
      </div>
      <div class="form-group">
        <label>CPF *</label>
        <input id="cli-cpf" type="text" value="${esc(S.cpf)}" placeholder="000.000.000-00" maxlength="14">
      </div>
    </div>

    <div class="form-row-2">
      <div class="form-group">
        <label>WhatsApp *</label>
        <input id="cli-wpp" type="tel" value="${esc(S.whatsapp)}" placeholder="(45) 9 9999-9999">
      </div>
      <div class="form-group">
        <label>E-mail *</label>
        <input id="cli-email" type="email" value="${esc(S.email)}" placeholder="seu@email.com">
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px">
      <div class="form-group">
        <label>Companhia Aérea</label>
        <select id="cli-companhia">
          <option value="">Sem voo / Não sei</option>
          <option value="GOL" ${S.companhia === 'GOL' ? 'selected' : ''}>GOL</option>
          <option value="AZUL" ${S.companhia === 'AZUL' ? 'selected' : ''}>AZUL</option>
          <option value="LATAM" ${S.companhia === 'LATAM' ? 'selected' : ''}>LATAM</option>
        </select>
      </div>
      <div class="form-group">
        <label>Número do Voo</label>
        <input id="cli-voo" type="text" value="${esc(S.voo)}" placeholder="Ex: 1234">
      </div>
      <div class="form-group">
        <label>Previsão de Pouso</label>
        <select id="cli-pouso">
          <option value="">Sem transfer</option>
          ${pousoOpts(S.pouso)}
        </select>
      </div>
      <div class="form-group">
        <label>Nº de Pessoas</label>
        <input id="cli-pessoas" type="number" min="1" max="${maxP}" value="${S.pessoas}">
      </div>
    </div>

    <div class="form-group">
      <label>Observações</label>
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

  // Máscaras
  const cpfEl = document.getElementById('cli-cpf')
  cpfEl.addEventListener('input', () => { cpfEl.value = maskCPF(cpfEl.value) })

  const wppEl = document.getElementById('cli-wpp')
  wppEl.addEventListener('input', () => { wppEl.value = maskWpp(wppEl.value) })
}

function generateResumoHTML() {
  const cat  = S.categorias.find(x => x.id === S.catId)
  const prot = S.protecoes.find(x => x.id === S.protId)
  if (!cat) return '<p style="color:var(--muted)">—</p>'

  const preco   = getPreco(cat)
  const dias    = S.dias || 1
  const diasFmt = Number.isInteger(dias) ? dias : dias.toFixed(1).replace('.', ',')
  const baseCat = preco * dias
  const baseProt = prot ? (prot.tipo_preco === 'per_day' ? prot.preco * dias : prot.preco) : 0
  const totalAdd = S.adicionais_sel.reduce((s, a) => s + a.subtotal, 0)
  const total    = baseCat + baseProt + totalAdd

  const addRows = S.adicionais_sel.map(a =>
    `<div class="resumo-row"><span>${esc(a.nome)}${a.quantidade > 1 ? ` (${a.quantidade}×)` : ''}</span><span>R$ ${fmtN(a.subtotal)}</span></div>`
  ).join('')

  return `
    <div class="resumo-row"><span>Período</span><span>${fmtDate(S.retData)} – ${fmtDate(S.devData)}</span></div>
    <div class="resumo-row"><span>Categoria</span><span>${esc(cat.nome)}</span></div>
    <div class="resumo-row"><span>Diárias</span><span>${diasFmt} × R$ ${fmtN(preco)}</span></div>
    ${prot ? `<div class="resumo-row"><span>Proteção — ${esc(prot.nome)}</span><span>R$ ${fmtN(baseProt)}</span></div>` : ''}
    ${addRows}
    <div class="resumo-total-row"><span>TOTAL:</span><span>R$ ${fmtN(total)}</span></div>`
}

// ── SIDEBAR RESUMO ─────────────────────────────────────────
function updateSummary() {
  const el = document.getElementById('summaryContent')
  if (!el || S.step === 4) return

  const cat  = S.categorias.find(x => x.id === S.catId)
  const prot = S.protecoes.find(x => x.id === S.protId)

  const backBtn = S.step >= 1 ? `<button class="btn btn-secondary" onclick="prevStep()" style="min-width:70px">← Voltar</button>` : ''
  const nextBtn = `<button class="btn btn-primary" onclick="nextStep()" style="flex:1">Avançar →</button>`
  const btns    = `<div style="display:flex;gap:8px;margin-top:14px">${backBtn}${nextBtn}</div>`

  if (!cat) {
    el.innerHTML = `<p style="color:var(--muted);font-size:13px;margin-bottom:16px">Preencha o período e escolha um veículo.</p>${btns}`
    return
  }

  const preco   = getPreco(cat)
  const dias    = S.dias || 1
  const baseCat = preco * dias
  const baseProt = prot ? (prot.tipo_preco === 'per_day' ? prot.preco * dias : prot.preco) : 0
  const totalAdd = S.adicionais_sel.reduce((s, a) => s + a.subtotal, 0)
  const total    = baseCat + baseProt + totalAdd

  const diasFmt = Number.isInteger(dias) ? dias : dias.toFixed(1).replace('.', ',')

  const img = cat.imagem_url
    ? `<img src="${esc(cat.imagem_url)}" style="width:100%;height:90px;object-fit:cover;border-radius:8px;margin-bottom:12px;display:block" onerror="this.style.display='none'">`
    : ''

  const catOpts = S.categorias.map(c =>
    `<option value="${c.id}"${c.id === S.catId ? ' selected' : ''}>${esc(c.nome)} — R$ ${fmtN(getPreco(c))}</option>`
  ).join('')

  let items = `
    <div class="summary-item"><span style="font-weight:600">${esc(cat.nome)}</span><span>R$ ${fmtN(baseCat)}</span></div>
    <div style="font-size:11px;color:var(--muted);padding:0 0 6px">${diasFmt} diárias × R$ ${fmtN(preco)}</div>`

  if (prot) items += `<div class="summary-item"><span>🛡 ${esc(prot.nome)}</span><span>R$ ${fmtN(baseProt)}</span></div>`

  S.adicionais_sel.forEach(a => {
    items += `<div class="summary-item"><span>➕ ${esc(a.nome)}${a.quantidade > 1 ? ` (${a.quantidade}×)` : ''}</span><span>R$ ${fmtN(a.subtotal)}</span></div>`
  })

  el.innerHTML = `
    ${img}
    <div style="margin-bottom:10px">
      <label style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;display:block">Veículo</label>
      <select onchange="selectCat(this.value)" style="width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:12px;font-family:Inter,sans-serif;color:var(--text);background:white;outline:none">
        ${catOpts}
      </select>
    </div>
    ${S.retData && S.devData ? `<div style="font-size:11px;color:var(--muted);margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border)">📅 ${fmtDate(S.retData)} → ${fmtDate(S.devData)}</div>` : ''}
    ${items}
    <div class="summary-total">R$ ${fmtN(total)}</div>
    ${btns}`
}

// ── MODAL SEM PROTEÇÃO ─────────────────────────────────────
function mostrarModalSemProtecao() {
  const overlay = document.createElement('div')
  overlay.id = 'modal-sem-prot'
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;
    display:flex;align-items:center;justify-content:center;padding:16px`

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;max-width:460px;width:100%;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.25)">
      <div style="font-size:32px;text-align:center;margin-bottom:12px">⚠️</div>
      <h3 style="text-align:center;font-size:18px;color:#1a2332;margin-bottom:16px">Locação Sem Proteção</h3>
      <p style="font-size:14px;color:#374151;line-height:1.65;margin-bottom:12px">
        Ao optar por não contratar nenhuma proteção, você assume <strong>100% da responsabilidade</strong>
        por danos ao veículo e a terceiros.
      </p>
      <p style="font-size:14px;color:#374151;line-height:1.65;margin-bottom:20px">
        Nesta modalidade, a <strong>caução exigida é de R$ 25.000,00</strong>, bloqueada no limite
        do seu cartão de crédito até a devolução do veículo.
      </p>
      <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin-bottom:24px;background:#fef9ec;border:1.5px solid #fbbf24;border-radius:10px;padding:12px">
        <input type="checkbox" id="chk-sem-prot" style="margin-top:2px;width:16px;height:16px;flex-shrink:0;cursor:pointer">
        <span style="font-size:13px;color:#374151;line-height:1.5">
          Declaro que li e estou de acordo com estas condições.<br>
          <strong>Estou de acordo e desejo continuar sem proteção.</strong>
        </span>
      </label>
      <div style="display:flex;gap:10px">
        <button id="btn-modal-cancelar" style="flex:1;padding:12px;border:1.5px solid #e2e8f0;background:#fff;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;color:#374151">
          Escolher uma proteção
        </button>
        <button id="btn-modal-confirmar" style="flex:1;padding:12px;background:#FF6B00;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;color:#fff;opacity:.4;pointer-events:none">
          Continuar sem proteção
        </button>
      </div>
    </div>`

  document.body.appendChild(overlay)

  const chk     = document.getElementById('chk-sem-prot')
  const btnConf = document.getElementById('btn-modal-confirmar')
  const btnCanc = document.getElementById('btn-modal-cancelar')

  chk.addEventListener('change', () => {
    btnConf.style.opacity        = chk.checked ? '1'    : '.4'
    btnConf.style.pointerEvents  = chk.checked ? 'auto' : 'none'
  })

  btnCanc.addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })

  btnConf.addEventListener('click', () => {
    overlay.remove()
    S.protId = null
    S.step++
    renderStep()
  })
}

// ── NAVIGATION ─────────────────────────────────────────────
window.nextStep = function() {
  if (!validate()) return
  if (S.step < 4) { S.step++; renderStep() }
}

window.prevStep = function() {
  if (S.step > 1) { S.step--; renderStep() }
  // step 1 é a primeira tela, não volta mais
}

function validate() {
  const errEl = document.getElementById(`step${S.step}-err`)
  const err = (msg) => { if (errEl) { errEl.innerHTML = `<div class="step-error">${msg}</div>`; errEl.scrollIntoView({behavior:'smooth',block:'nearest'}) }; return false }

  if (S.step === 1) {
    S.retData  = document.getElementById('retData')?.value  || S.retData
    S.retHora  = document.getElementById('retHora')?.value  || S.retHora
    S.devData  = document.getElementById('devData')?.value  || S.devData
    S.devHora  = document.getElementById('devHora')?.value  || S.devHora
    S.retLocal = document.getElementById('retLocal')?.value || S.retLocal
    S.devLocal = document.getElementById('devLocal')?.value || S.devLocal

    if (!S.retData)  return err('Informe a data de retirada.')
    if (!S.retHora)  return err('Informe o horário de retirada.')
    if (!S.devData)  return err('Informe a data de devolução.')
    if (!S.devHora)  return err('Informe o horário de devolução.')
    if (!S.retLocal) return err('Selecione o local de retirada.')
    if (!S.devLocal) return err('Selecione o local de devolução.')
    calcDias()
    if (S.dias <= 0) return err('O horário de devolução deve ser posterior ao de retirada.')
    if (!S.catId)    return err('Selecione uma categoria de veículo.')
  }

  if (S.step === 2 && !S.protId) {
    mostrarModalSemProtecao()
    return false
  }

  if (S.step === 4) {
    S.nome     = document.getElementById('cli-nome')?.value.trim()   || ''
    S.cpf      = document.getElementById('cli-cpf')?.value.trim()    || ''
    S.whatsapp = document.getElementById('cli-wpp')?.value.trim()    || ''
    S.email    = document.getElementById('cli-email')?.value.trim()  || ''
    S.companhia = document.getElementById('cli-companhia')?.value     || ''
    S.voo      = document.getElementById('cli-voo')?.value.trim()    || ''
    S.pouso    = document.getElementById('cli-pouso')?.value         || ''
    S.pessoas  = Number(document.getElementById('cli-pessoas')?.value) || 1
    S.obs      = document.getElementById('cli-obs')?.value.trim()    || ''
    S.termos   = document.getElementById('cli-termos')?.checked      || false

    if (!S.nome)                return err('Informe seu nome completo.')
    if (!validarCPF(S.cpf))     return err('CPF inválido. Verifique os números digitados.')
    if (S.whatsapp.replace(/\D/g,'').length < 10) return err('Informe um WhatsApp válido.')
    if (!S.email.includes('@')) return err('Informe um e-mail válido.')
    const cat = S.categorias.find(x => x.id === S.catId)
    if (S.pessoas > (cat?.max_pessoas ?? 5)) return err(`Este veículo comporta no máximo ${cat?.max_pessoas ?? 5} pessoas.`)
    if (!S.termos) return err('Você deve declarar estar ciente das informações importantes.')
  }

  return true
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

  try {
    const cat  = S.categorias.find(x => x.id === S.catId)
    const prot = S.protecoes.find(x => x.id === S.protId)
    if (!cat) throw new Error('Categoria não encontrada. Recarregue a página e tente novamente.')
    const preco = getPreco(cat)
    const dias  = S.dias || 1
    const baseCat  = preco * dias
    const baseProt = prot ? (prot.tipo_preco === 'per_day' ? prot.preco * dias : prot.preco) : 0
    const totalAdd = S.adicionais_sel.reduce((s, a) => s + a.subtotal, 0)
    const total    = baseCat + baseProt + totalAdd

    const obsCompleto = [
      S.obs || null,
      S.companhia ? `Cia: ${S.companhia}` : null,
      S.voo       ? `Voo: ${S.voo}`       : null,
      S.pouso     ? `Pouso: ${S.pouso}`   : null,
      `Pessoas: ${S.pessoas}`,
    ].filter(Boolean).join(' | ') || null

    const { data: sol, error: solErr } = await supabase
      .from('solicitacoes')
      .insert({
        tenant_id:        TENANT_ID,
        categoria_id:     S.catId,
        protecao_id:      S.protId,
        cliente_nome:     S.nome,
        cliente_email:    S.email,
        cliente_whatsapp: S.whatsapp.replace(/\D/g, ''),
        cliente_cpf:      S.cpf.replace(/\D/g, ''),
        data_retirada:    `${S.retData}T${S.retHora}:00`,
        data_devolucao:   `${S.devData}T${S.devHora}:00`,
        local_retirada:   S.retLocal,
        local_devolucao:  S.devLocal,
        valor_estimado:   total,
        pessoas:          S.pessoas,
        numero_voo:       S.voo   || null,
        horario_pouso:    S.pouso || null,
        status:           'solicitada',
        observacoes:      obsCompleto,
      })
      .select('id').single()

    if (solErr) throw new Error(solErr.message)

    if (S.adicionais_sel.length > 0) {
      const { error: itErr } = await supabase.from('solicitacao_itens').insert(
        S.adicionais_sel.map(a => ({
          solicitacao_id: sol.id,
          adicional_id:   a.id,
          quantidade:     a.quantidade,
          preco_unitario: a.preco,
          tipo_preco:     a.tipo_preco,
        }))
      )
      if (itErr) throw new Error(itErr.message)
    }

    // WhatsApp message
    const waMsg = buildWhatsMsg(cat, prot, total, dias)
    showSuccess(waMsg, total)

  } catch (e) {
    if (errEl) errEl.innerHTML = `<div class="step-error">Erro ao enviar: ${e.message}</div>`
    if (btn) { btn.disabled = false; btn.textContent = 'Enviar Solicitação 🚀' }
  }
}

function buildWhatsMsg(cat, prot, total, dias) {
  const R   = v => 'R$ ' + fmtN(v)
  const SEP = '━━━━━━━━━━━━━━━━━━'
  const preco = getPreco(cat)

  let itens = `• ${cat.nome} – ${dias}×: *${R(preco * dias)}*`
  if (prot) itens += `\n• ${prot.nome}: *${R(prot.tipo_preco === 'per_day' ? prot.preco * dias : prot.preco)}*`
  S.adicionais_sel.forEach(a => {
    itens += `\n• ${a.nome}${a.quantidade > 1 ? ` (${a.quantidade}×)` : ''}: *${R(a.subtotal)}*`
  })

  const vooLabel = [S.companhia, S.voo].filter(Boolean).join(' ') || '—'
  const linhaVoo = S.voo || S.pouso || S.companhia
    ? `✈️ ${vooLabel} | Pouso: ${S.pouso || '—'}\n👥 ${S.pessoas} pessoa${S.pessoas > 1 ? 's' : ''}`
    : `👥 ${S.pessoas} pessoa${S.pessoas > 1 ? 's' : ''}`

  return encodeURIComponent(
`📋 *IGUFOZ – NOVA RESERVA*

👤 *${S.nome}*
CPF: ${maskCPF(S.cpf)}
📱 ${maskWpp(S.whatsapp)} | ✉️ ${S.email}

${linhaVoo}

${SEP}

📍 *Retirada:* ${fmtDate(S.retData)} – ${S.retHora}
${S.retLocal}

📍 *Devolução:* ${fmtDate(S.devData)} – ${S.devHora}
${S.devLocal}

${SEP}

💰 *Valores:*
${itens}

💳 *Total: ${R(total)}*

📝 ${S.obs || 'Sem observações'}`)
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
         Nossa equipe entrará em contato em breve para confirmar sua reserva de <strong>R$ ${fmtN(total)}</strong>.</p>
      <a href="https://wa.me/${WHATSAPP}?text=${waMsg}" target="_blank" class="btn-whats">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Falar no WhatsApp
      </a>
      <br><br>
      <button class="btn btn-secondary" onclick="location.reload()">Nova Reserva</button>
    </div>
  </div>`
}

// ── AIRPORT ADDON SYNC ─────────────────────────────────────
function syncAeroAdd() {
  const localObj = S.locais.find(l => l.nome === S.devLocal)
  const isAero   = !!localObj?.is_aeroporto
  const a        = S.adicionais.find(x => isAddAero(x))
  if (!a) return
  const idx = S.adicionais_sel.findIndex(x => x.id === a.id)
  if (isAero && idx === -1) {
    S.adicionais_sel.push({ id: a.id, nome: a.nome, preco: a.preco, quantidade: 1, tipo_preco: a.tipo_preco, subtotal: calcSubtotal(a, 1), auto: true })
  } else if (!isAero && idx !== -1 && S.adicionais_sel[idx].auto) {
    S.adicionais_sel.splice(idx, 1)
  }
}

function isAddAero(a) {
  const n = a.nome.toLowerCase()
  return n.includes('aeroporto') && (n.includes('devolu') || n.includes('devolução'))
}

function localIsAero(nomeLocal) {
  return !!S.locais.find(l => l.nome === nomeLocal)?.is_aeroporto
}

// ── PRICE HELPERS ──────────────────────────────────────────
function getPreco(cat) {
  const data = S.retData
  if (data) {
    for (const p of S.sazonalidade) {
      if (data >= p.data_inicio && data <= p.data_fim) {
        const pr = (p.precos ?? {})[cat.slug]
        if (pr != null) return Number(pr)
      }
    }
  }
  return cat.preco_diaria
}

function calcSubtotal(a, qty) {
  return a.tipo_preco === 'per_day' ? a.preco * qty * (S.dias || 1) : a.preco * qty
}

function calcDias() {
  if (!S.retData || !S.devData) { S.dias = 0; return }
  const ret = new Date(`${S.retData}T${S.retHora || '08:00'}`)
  const dev = new Date(`${S.devData}T${S.devHora || '08:00'}`)
  const diffH = (dev - ret) / 3600000
  if (diffH <= 0) { S.dias = 0; return }
  const full  = Math.floor(diffH / 24)
  const resto = diffH % 24
  if (resto <= 1)     S.dias = full
  else if (resto > 4) S.dias = full + 1
  else                S.dias = full + Math.floor(resto * 2) / 8
  // Recalcular subtotais dos adicionais já selecionados
  S.adicionais_sel.forEach(sel => {
    const a = S.adicionais.find(x => x.id === sel.id)
    if (a) sel.subtotal = calcSubtotal(a, sel.quantidade)
  })
}

function getTotalCad() {
  return S.adicionais_sel
    .filter(x => (S.adicionais.find(a => a.id === x.id)?.is_cadeirinha))
    .reduce((s, x) => s + x.quantidade, 0)
}

// ── CPF VALIDATION ─────────────────────────────────────────
function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '')
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
  let add = 0
  for (let i = 0; i < 9; i++) add += parseInt(cpf[i]) * (10 - i)
  let rev = 11 - (add % 11); if (rev >= 10) rev = 0
  if (rev !== parseInt(cpf[9])) return false
  add = 0
  for (let i = 0; i < 10; i++) add += parseInt(cpf[i]) * (11 - i)
  rev = 11 - (add % 11); if (rev >= 10) rev = 0
  return rev === parseInt(cpf[10])
}

// ── UTILS ──────────────────────────────────────────────────
function isSunday(d) { return !!d && new Date(d + 'T12:00:00').getDay() === 0 }



function minDate() {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function timeOpts(from, to, sel) {
  let s = '<option value="">Hora</option>'
  for (let h = from; h <= to; h++)
    for (let m = 0; m < 60; m += 30) {
      const v = pad(h) + ':' + pad(m)
      s += `<option${v === sel ? ' selected' : ''}>${v}</option>`
    }
  return s
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

function pad(n) { return String(n).padStart(2, '0') }

function fmtN(n) {
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function esc(s) {
  if (!s) return ''
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function maskCPF(v) {
  v = v.replace(/\D/g, '').slice(0, 11)
  if (v.length > 9) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4')
  if (v.length > 6) return v.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3')
  if (v.length > 3) return v.replace(/(\d{3})(\d{0,3})/, '$1.$2')
  return v
}

function maskWpp(v) {
  v = v.replace(/\D/g, '').slice(0, 11)
  if (v.length > 10) return v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (v.length > 6)  return v.replace(/(\d{2})(\d{4,5})(\d{0,4})/, '($1) $2-$3')
  if (v.length > 2)  return v.replace(/(\d{2})(\d{0,5})/, '($1) $2')
  return v
}
