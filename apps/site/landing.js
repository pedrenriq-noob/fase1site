import { supabase, TENANT_ID } from './supabase.js'

// ── Locais de retirada (formulário de busca rápida) ───────
const sel = document.getElementById('qs-local')
supabase.from('locais').select('nome').eq('tenant_id', TENANT_ID).eq('ativo', true)
  .eq('permite_retirada', true).order('ordem')
  .then(({ data }) => {
    sel.innerHTML = (data && data.length)
      ? data.map(l => `<option value="${l.nome}">${l.nome}</option>`).join('')
      : '<option value="">Nenhum local disponível</option>'
  })
  .catch(() => {
    sel.innerHTML = '<option value="">Av. Brasil, 90 — Centro</option><option value="Av. das Cataratas, 1419 — Vila Yolanda">Av. das Cataratas, 1419 — Vila Yolanda</option>'
  })

// ── Frota com preços ao vivo ────────────────────────────────
const CAT_META = {
  grupo_b:           { title: 'Hatch compacto manual',     desc: 'Mobi, C3 ou similar. Econômico, ágil e ideal para circular pela cidade.',                           tags: ['Manual','5 ocupantes','Multimídia'],              highlight: true  },
  grupo_c:           { title: 'Hatch médio manual',         desc: 'Onix, Argo, 208, Polo ou similar. Mais espaço sem abrir mão da economia.',                         tags: ['Manual','5 ocupantes','Ar-condicionado'],          highlight: false },
  grupo_d:           { title: 'Sedan automático',           desc: 'Cronos ou similar. Condução suave para passeios, compras e deslocamentos longos.',                  tags: ['Automático','5 ocupantes','Direção hidráulica'],   highlight: false },
  'grupo_d+':        { title: 'Sedan automático',           desc: 'Cronos ou similar. Condução suave para passeios, compras e deslocamentos longos.',                  tags: ['Automático','5 ocupantes','Direção hidráulica'],   highlight: false },
  grupo_e:           { title: 'Hatch automático completo',  desc: 'Onix Premier ou similar. Design moderno, conforto e tecnologia embarcada.',                        tags: ['Automático','5 ocupantes','Multimídia'],           highlight: false },
  grupo_f:           { title: 'SUV mini automático',        desc: 'Tera, Pulse ou similar. Robusto e confortável para explorar a tríplice fronteira.',                 tags: ['Automático','5 ocupantes','Carta Verde opcional'], highlight: false },
  grupo_g:           { title: 'SUV médio automático',       desc: '2008, Fastback ou similar. Versatilidade, espaço e desempenho para qualquer roteiro.',             tags: ['Automático','5 ocupantes','SUV'],                  highlight: false },
  grupo_h:           { title: '7 lugares automático',       desc: 'Spin ou similar. Mais espaço para grupos, família grande e bagagens.',                              tags: ['Automático','7 ocupantes','Grupo familiar'],       highlight: false },
  grupo_h_7_lugares: { title: '7 lugares automático',       desc: 'Spin ou similar. Mais espaço para grupos, família grande e bagagens.',                              tags: ['Automático','7 ocupantes','Grupo familiar'],       highlight: false },
  grupo_i:           { title: 'Sedan médio automático',     desc: 'Virtus, Onix Plus ou similar. Mais porta-malas e conforto para família.',                          tags: ['Automático','5 ocupantes','Mais bagagem'],         highlight: false },
  grupo_j:           { title: 'SUV premium automático',     desc: 'Tiggo 5x ou similar. Acabamento refinado para quem busca uma experiência superior.',               tags: ['Automático','5 ocupantes','Premium'],              highlight: false },
}

const fmtMoney = v => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function reservarCat(slug) {
  try { sessionStorage.setItem('qs_cat', slug) } catch (_) {}
  window.location.href = 'reserva.html'
}
window._reservarCat = reservarCat

supabase.from('categorias').select('nome,slug,preco_diaria')
  .eq('tenant_id', TENANT_ID).eq('ativo', true).order('ordem')
  .then(({ data }) => {
    if (!data || !data.length) return
    const grid = document.getElementById('fleet-grid')
    grid.innerHTML = data.map(c => {
      const meta  = CAT_META[c.slug] ?? { title: c.nome, desc: '', tags: [], highlight: false }
      const img   = `assets/slug-${c.slug.replace(/_/g, '-')}.jpeg`
      return `<article class="fleet-card${meta.highlight ? ' is-highlight' : ''}">
        <img class="fleet-photo" src="${img}" alt="Veículo ${c.nome} da IguFoz" onerror="this.style.display='none'">
        <div class="fleet-card-top">
          <span>${c.nome}</span>
          <strong>${fmtMoney(c.preco_diaria)}/dia</strong>
        </div>
        <h3>${meta.title}</h3>
        <p>${meta.desc}</p>
        <div class="fleet-tags">${meta.tags.map(t => `<span>${t}</span>`).join('')}</div>
        <button class="btn btn-primary fleet-btn" onclick="window._reservarCat('${c.slug}')">Reservar agora</button>
      </article>`
    }).join('')
  })
  .catch(() => { /* grid mantém placeholder de carregando */ })

// ── Formulário de busca rápida (pré-preenchimento + redirecionamento) ──
;(function () {
  const retEl = document.getElementById('qs-ret')
  const devEl = document.getElementById('qs-dev')
  const amanha = new Date(); amanha.setDate(amanha.getDate() + 1)
  const amanhaISO = amanha.toISOString().slice(0, 10)
  retEl.min = amanhaISO
  retEl.value = amanhaISO
  devEl.min = amanhaISO
  devEl.value = amanhaISO
  retEl.addEventListener('change', function () {
    devEl.min = retEl.value
    if (!devEl.value || devEl.value < retEl.value) devEl.value = retEl.value
  })
})()

document.getElementById('quickSearchForm').addEventListener('submit', function (e) {
  e.preventDefault()
  const ret = document.getElementById('qs-ret').value
  const dev = document.getElementById('qs-dev').value
  const local = document.getElementById('qs-local').value
  if (ret) sessionStorage.setItem('qs_retData', ret)
  if (dev) sessionStorage.setItem('qs_devData', dev)
  if (local) sessionStorage.setItem('qs_local', local)
  window.location.href = 'reserva.html'
})
