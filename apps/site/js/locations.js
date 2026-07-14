// ── LOCAIS × HORÁRIO ────────────────────────────────────────
// Todo o domínio "qual local atende em qual horário" concentrado aqui —
// é onde os dois bugs de local×horário de 2026-07-14 aconteceram (ver
// docs/DECISION_LOG.md), então vale manter isolado e no futuro testável
// sem precisar de DOM.
import { S } from './state.js'
import { isSunday, esc } from './utils.js'
import { calcSubtotal } from './pricing-adapter.js'

function horaParaMinutos(t) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function locaisParaRetirada(data, hora) {
  const domingo = isSunday(data)
  const hMin    = horaParaMinutos(hora)
  return S.locais.filter(l => {
    if (!l.permite_retirada) return false
    if (domingo && !l.disponivel_domingo) return false
    if (l.hora_retirada_inicio && hora) {
      const ini = horaParaMinutos(l.hora_retirada_inicio)
      const fim = horaParaMinutos(l.hora_retirada_fim)
      if (ini <= fim) {
        if (hMin < ini || hMin > fim) return false          // janela normal (08:00–18:00)
      } else {
        if (hMin < ini && hMin > fim) return false          // janela cross-midnight (18:01–07:59)
      }
    }
    return true
  })
}

export function locaisParaDevolucao(data, hora) {
  const domingo = isSunday(data)
  const hMin    = horaParaMinutos(hora)
  return S.locais.filter(l => {
    if (!l.permite_devolucao) return false
    if (domingo && !l.disponivel_domingo) return false
    if (l.hora_devolucao_inicio && hora) {
      const ini = horaParaMinutos(l.hora_devolucao_inicio)
      const fim = horaParaMinutos(l.hora_devolucao_fim)
      if (ini <= fim) {
        if (hMin < ini || hMin > fim) return false          // janela normal (08:00–18:00)
      } else {
        if (hMin < ini && hMin > fim) return false          // janela cross-midnight (18:01–07:59)
      }
    }
    return true
  })
}

export function avisoRetirada(data, hora) {
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

export function avisoDevolucao(data, hora) {
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

// ── TAXA AUTOMÁTICA DE DEVOLUÇÃO NO AEROPORTO ──────────────
export function isAddAero(a) {
  const n = a.nome.toLowerCase()
  return n.includes('aeroporto') && (n.includes('devolu') || n.includes('devolução'))
}

export function localIsAero(nomeLocal) {
  return !!S.locais.find(l => l.nome === nomeLocal)?.is_aeroporto
}

export function syncAeroAdd() {
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

// ── REVALIDAÇÃO DE LOCAL x HORÁRIO (edição via sidebar) ────
// A edição de período pela sidebar (Step 2+) não tem os selects de local
// visíveis (só existem no Step 1). Se o cliente muda a hora/data para fora
// da janela de atendimento do local já escolhido, corrigimos automaticamente
// para o único local ainda válido (normalmente o aeroporto, 24h) e avisamos
// por pop-up — em vez de deixar a reserva seguir com uma combinação
// local+horário que o backend rejeitaria só no envio final.
export function janelaTexto(local, tipo) {
  const ini = tipo === 'retirada' ? local.hora_retirada_inicio : local.hora_devolucao_inicio
  const fim = tipo === 'retirada' ? local.hora_retirada_fim   : local.hora_devolucao_fim
  return (ini && fim) ? `das ${String(ini).slice(0, 5)} às ${String(fim).slice(0, 5)}` : 'em horário integral (24h)'
}

export function nomeCurto(nomeLocal) {
  return esc((nomeLocal || '').split('—')[0].trim())
}

export function revalidarLocaisPeriodo() {
  const avisos = []

  if (S.retLocal) {
    const antigo  = S.locais.find(l => l.nome === S.retLocal)
    const validos = locaisParaRetirada(S.retData, S.retHora)
    if (antigo && !validos.find(l => l.nome === S.retLocal)) {
      if (validos.length === 1) {
        S.retLocal = validos[0].nome
        avisos.push(`<p><strong>⚠️ Local de retirada atualizado.</strong></p>
          <p>${nomeCurto(antigo.nome)} atende retirada ${janelaTexto(antigo, 'retirada')}. Como o novo horário fica fora desse período, ajustamos a retirada para <strong>${nomeCurto(S.retLocal)}</strong>.</p>`)
      } else {
        S.retLocal = ''
        avisos.push(`<p><strong>⚠️ Local de retirada removido.</strong></p>
          <p>O horário escolhido não é atendido por ${nomeCurto(antigo.nome)}. Volte à Etapa 1 para selecionar um local de retirada disponível nesse horário.</p>`)
      }
    }
  }

  if (S.devLocal) {
    const antigo  = S.locais.find(l => l.nome === S.devLocal)
    const validos = locaisParaDevolucao(S.devData, S.devHora)
    if (antigo && !validos.find(l => l.nome === S.devLocal)) {
      if (validos.length === 1) {
        S.devLocal = validos[0].nome
        syncAeroAdd()
        const novo = S.locais.find(l => l.nome === S.devLocal)
        avisos.push(`<p><strong>⚠️ Local de devolução atualizado.</strong></p>
          <p>A devolução em ${nomeCurto(antigo.nome)} é atendida ${janelaTexto(antigo, 'devolução')}. Para o horário selecionado, a devolução passa a ser em <strong>${nomeCurto(S.devLocal)}</strong>${novo?.is_aeroporto ? ', que funciona 24 horas' : ''}. A taxa correspondente já foi ajustada no resumo.</p>`)
      } else {
        S.devLocal = ''
        syncAeroAdd()
        avisos.push(`<p><strong>⚠️ Local de devolução removido.</strong></p>
          <p>O horário escolhido não é atendido por ${nomeCurto(antigo.nome)}. Volte à Etapa 1 para selecionar um local de devolução disponível nesse horário.</p>`)
      }
    }
  }

  return avisos.length ? avisos.join('<hr class="modal-divider">') : null
}
