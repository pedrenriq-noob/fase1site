// pages/reservas.js
import { supabase, TENANT_ID, toast, abrirModal, esc, initSortable, logger } from '../admin.js'
import { SUPABASE_URL, SUPABASE_ANON } from '../supabase.js'
import { registrarAuditoria, confirmarComSenha } from './auditoria.js'
import { calcDias as calcDiasCanonico, calcDiasItem, calcSubtotal } from '../shared/pricing.js'
import { transicoesPossiveis } from '../shared/locacao-status.js'

// Simulação operacional (Especificação Motor de Disponibilidade, item 9):
// antes de confirmar uma solicitação, consulta o mesmo motor central de
// disponibilidade (check-disponibilidade) usado pelo site e pelo frota-ops
// — item 7 da especificação exige que toda consulta use o critério único.
async function simularDisponibilidade(categoriaSlug, dataRetirada, dataDevolucao) {
    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/check-disponibilidade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON },
            body: JSON.stringify({
                tenant_id: TENANT_ID,
                categoria_slug: categoriaSlug,
                data_saida: dataRetirada,
                data_retorno_prev: dataDevolucao,
            }),
        })
        if (!res.ok) return null
        return await res.json()
    } catch {
        return null // Falha na simulação não bloqueia — apenas deixa de avisar (mesma filosofia do criar-solicitacao)
    }
}

// Antes de mudar o status para 'confirmada', simula o impacto na
// disponibilidade e pede confirmação explícita do operador se detectar
// overbooking ou esgotamento da categoria. Retorna false se o operador
// cancelar a ação.
async function confirmarSimulacao(novoStatus, selEl) {
    if (novoStatus !== 'confirmada') return true

    const catSlug    = selEl.dataset.catSlug
    const retirada   = selEl.dataset.retirada
    const devolucao  = selEl.dataset.devolucao
    if (!catSlug || !retirada || !devolucao) return true // dados insuficientes para simular — não bloqueia

    const sim = await simularDisponibilidade(catSlug, retirada, devolucao)
    if (!sim || sim.fonte !== 'frota') return true // sem dado confiável — não bloqueia (aprovação manual prevalece)

    if (sim.overbooking) {
        return confirm(
            `⚠ Confirmar esta reserva vai gerar OVERBOOKING na categoria: ${sim.overbooking_qtd} ` +
            `reserva(s) a mais do que veículos disponíveis no período.\n\nConfirmar mesmo assim?`
        )
    }
    if (sim.disponivel === 0) {
        return confirm(
            `⚠ Não há veículos disponíveis nesta categoria para o período (frota já comprometida). ` +
            `Confirmar mesmo assim pode gerar overbooking.\n\nConfirmar mesmo assim?`
        )
    }
    return true
}

const STATUS_LABELS = {
    solicitada: 'Solicitada',
    em_analise: 'Em análise',
    confirmada: 'Confirmada',
    concluida:  'Concluída',
    cancelada:  'Cancelada',
}

const STATUS_COR = {
    solicitada: '#f59e0b',
    em_analise: '#3b82f6',
    confirmada: '#22c55e',
    concluida:  '#8b5cf6',
    cancelada:  '#ef4444',
}

const PAGE_SIZE = 50
let _paginaAtual = 0
let _totalReservas = 0

export async function renderReservas() {
    _paginaAtual = 0
    const { data: reservas, error, count } = await supabase
        .from('solicitacoes')
        .select(`
            id, numero, status, cliente_nome, cliente_whatsapp, cliente_email,
            data_retirada, data_devolucao, valor_estimado, criado_em,
            categorias ( nome, slug )
        `, { count: 'exact' })
        .eq('tenant_id', TENANT_ID)
        .order('criado_em', { ascending: false })
        .range(0, PAGE_SIZE - 1)

    if (error) throw error
    _totalReservas = count ?? 0

    const linhas = (reservas ?? []).map(r => {
        const status = r.status
        const cor    = STATUS_COR[status] ?? '#64748b'
        const isFinal = status === 'concluida' || status === 'cancelada'

        const optsTransicao = transicoesPossiveis(status).map(s =>
            `<option value="${s}" ${s === status ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`
        ).join('')

        const numFmt = r.numero ? String(r.numero).padStart(4, '0') : '—'
        return `
        <tr>
            <td data-sort-val="${r.numero ?? 0}" style="font-weight:700;color:#FF6B00;letter-spacing:.5px">#${numFmt}</td>
            <td data-sort-val="${r.criado_em ?? ''}" style="font-size:12px;white-space:nowrap">${fmtData(r.criado_em)}</td>
            <td class="td-name">${esc(r.cliente_nome)}</td>
            <td style="font-size:12px">${esc(r.cliente_whatsapp)}</td>
            <td>${esc(r.categorias?.nome ?? '—')}</td>
            <td data-sort-val="${r.valor_estimado ?? 0}" class="td-price">${fmtMoney(r.valor_estimado)}</td>
            <td data-sort-val="${r.data_retirada ?? ''}" style="font-size:12px;white-space:nowrap">${fmtDataSimples(r.data_retirada)}</td>
            <td>
                ${isFinal
                    ? `<span class="status-badge status-${status}">${STATUS_LABELS[status]}</span>`
                    : `<select class="status-select" style="border-color:${cor};color:${cor}"
                              data-id="${r.id}" data-status="${status}"
                              data-cat-slug="${r.categorias?.slug ?? ''}"
                              data-retirada="${r.data_retirada ?? ''}" data-devolucao="${r.data_devolucao ?? ''}">
                           ${optsTransicao}
                       </select>`
                }
            </td>
            <td style="display:flex;gap:6px;align-items:center">
                <button class="btn-icon" data-action="detalhe" data-id="${r.id}">👁 Ver</button>
                <button class="btn-danger btn-sm" data-action="excluir" data-id="${r.id}" data-num="${numFmt}" title="Excluir reserva">🗑</button>
            </td>
        </tr>`
    }).join('')

    return `
    <div class="page-header">
        <h1>📋 Reservas</h1>
    </div>
    <div class="card">
        <div class="card-header">
            <div class="filter-bar">
                <input type="text" id="f-busca" placeholder="🔍 Nome ou e-mail...">
                <select id="f-status">
                    <option value="">Todos os status</option>
                    ${Object.entries(STATUS_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
                </select>
                <button class="btn-secondary btn-sm" id="btn-filtrar">Filtrar</button>
            </div>
        </div>
        <div class="table-wrap" id="reservas-tabela">
            ${reservas?.length ? `
            <table>
                <thead><tr>
                    <th data-sort="num">#</th><th data-sort="date">Enviado em</th><th data-sort="text">Cliente</th><th data-sort="text">WhatsApp</th><th data-sort="text">Veículo</th><th data-sort="num">Total</th><th data-sort="date">Retirada</th><th data-sort="text">Status</th><th></th>
                </tr></thead>
                <tbody>${linhas}</tbody>
            </table>` : `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <p>Nenhuma reserva ainda.</p>
            </div>`}
        </div>
        ${_totalReservas > PAGE_SIZE ? `
        <div id="paginacao-bar" style="padding:12px 16px;border-top:1px solid var(--border);display:flex;align-items:center;gap:12px">
            <span id="paginacao-info" style="font-size:13px;color:var(--muted)">Exibindo ${Math.min(PAGE_SIZE, _totalReservas)} de ${_totalReservas}</span>
            <button id="btn-carregar-mais" class="btn-secondary btn-sm">Carregar mais</button>
        </div>` : ''}
    </div>`
}

export function bindReservas() {
    // Paginação
    document.getElementById('btn-carregar-mais')?.addEventListener('click', async () => {
        _paginaAtual++
        const from = _paginaAtual * PAGE_SIZE
        const to   = from + PAGE_SIZE - 1
        const { data, error } = await supabase
            .from('solicitacoes')
            .select(`id, numero, status, cliente_nome, cliente_whatsapp, cliente_email,
                data_retirada, data_devolucao, valor_estimado, criado_em, categorias(nome, slug)`)
            .eq('tenant_id', TENANT_ID)
            .order('criado_em', { ascending: false })
            .range(from, to)
        if (error || !data?.length) return
        const tbody = document.querySelector('#reservas-tabela tbody')
        if (!tbody) return
        data.forEach(r => {
            const status = r.status
            const cor    = STATUS_COR[status] ?? '#64748b'
            const isFinal = status === 'concluida' || status === 'cancelada'
            const numFmt  = r.numero ? String(r.numero).padStart(4, '0') : '—'
            const opts    = transicoesPossiveis(status).map(s =>
                `<option value="${s}" ${s === status ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`).join('')
            const tr = document.createElement('tr')
            tr.innerHTML = `
                <td data-sort-val="${esc(r.numero ?? 0)}" style="font-weight:700;color:#FF6B00;letter-spacing:.5px">#${esc(numFmt)}</td>
                <td data-sort-val="${esc(r.criado_em ?? '')}" style="font-size:12px;white-space:nowrap">${fmtData(r.criado_em)}</td>
                <td class="td-name">${esc(r.cliente_nome)}</td>
                <td style="font-size:12px">${esc(r.cliente_whatsapp)}</td>
                <td>${esc(r.categorias?.nome ?? '—')}</td>
                <td data-sort-val="${esc(r.valor_estimado ?? 0)}" class="td-price">${fmtMoney(r.valor_estimado)}</td>
                <td data-sort-val="${esc(r.data_retirada ?? '')}" style="font-size:12px;white-space:nowrap">${fmtDataSimples(r.data_retirada)}</td>
                <td>${isFinal
                    ? `<span class="status-badge status-${esc(status)}">${esc(STATUS_LABELS[status])}</span>`
                    : `<select class="status-select" style="border-color:${cor};color:${cor}" data-id="${esc(r.id)}" data-status="${esc(status)}" data-cat-slug="${esc(r.categorias?.slug ?? '')}" data-retirada="${esc(r.data_retirada ?? '')}" data-devolucao="${esc(r.data_devolucao ?? '')}">${opts}</select>`
                }</td>
                <td style="display:flex;gap:6px;align-items:center">
                    <button class="btn-icon" data-action="detalhe" data-id="${esc(r.id)}">👁 Ver</button>
                    <button class="btn-danger btn-sm" data-action="excluir" data-id="${esc(r.id)}" data-num="${esc(numFmt)}">🗑</button>
                </td>`
            tbody.appendChild(tr)
            // rebind eventos na nova linha
            tr.querySelector('[data-action="detalhe"]')?.addEventListener('click', () => verReserva(r.id))
            tr.querySelector('[data-action="excluir"]')?.addEventListener('click', () => excluirReserva(r.id, numFmt))
            tr.querySelector('.status-select')?.addEventListener('change', async (e) => {
                const novoStatus = e.target.value
                if (novoStatus === status) return
                if (!(await confirmarSimulacao(novoStatus, e.target))) { e.target.value = status; return }
                await trocarStatus(r.id, novoStatus, status, '')
                e.target.dataset.status = novoStatus
            })
        })
        const exibindo = Math.min((_paginaAtual + 1) * PAGE_SIZE, _totalReservas)
        const info = document.getElementById('paginacao-info')
        if (info) info.textContent = `Exibindo ${exibindo} de ${_totalReservas}`
        if (exibindo >= _totalReservas) {
            document.getElementById('btn-carregar-mais')?.remove()
        }
    })

    // Troca de status inline
    document.querySelectorAll('.status-select').forEach(sel => {
        sel.addEventListener('change', async () => {
            const id          = sel.dataset.id
            const novoStatus  = sel.value
            const statusAtual = sel.dataset.status

            if (novoStatus === statusAtual) return

            const executarTroca = async (motivo) => {
                const ok = await trocarStatus(id, novoStatus, statusAtual, motivo)
                if (ok) {
                    sel.dataset.status = novoStatus
                    const cor = STATUS_COR[novoStatus] ?? '#64748b'
                    sel.style.borderColor = cor
                    sel.style.color = cor
                } else {
                    sel.value = statusAtual
                }
            }

            if (novoStatus === 'cancelada') {
                const motivo = prompt('Motivo do cancelamento (obrigatório):')
                if (!motivo?.trim()) {
                    sel.value = statusAtual
                    toast('Informe o motivo do cancelamento.', 'error')
                    return
                }
                confirmarComSenha(
                    `Confirme o <strong>cancelamento</strong> da reserva.<br>Motivo: <em>${motivo.trim()}</em>`,
                    () => executarTroca(motivo.trim())
                )
            } else {
                if (!(await confirmarSimulacao(novoStatus, sel))) { sel.value = statusAtual; return }
                await executarTroca()
            }
        })
    })

    // Detalhes da reserva
    document.querySelectorAll('[data-action="detalhe"]').forEach(btn =>
        btn.addEventListener('click', () => verReserva(btn.dataset.id)))

    // Excluir reserva
    document.querySelectorAll('[data-action="excluir"]').forEach(btn =>
        btn.addEventListener('click', () => excluirReserva(btn.dataset.id, btn.dataset.num)))

    // Filtro de busca
    document.getElementById('btn-filtrar')?.addEventListener('click', filtrar)
    document.getElementById('f-busca')?.addEventListener('keydown', e => { if (e.key === 'Enter') filtrar() })

    // Sorting
    initSortable(document.querySelector('#reservas-tabela table'))
}

function filtrar() {
    const busca  = document.getElementById('f-busca').value.toLowerCase()
    const status = document.getElementById('f-status').value

    document.querySelectorAll('#reservas-tabela tbody tr').forEach(tr => {
        const nome   = tr.cells[2]?.textContent.toLowerCase() ?? ''
        const wpp    = tr.cells[3]?.textContent.toLowerCase() ?? ''
        const stEl   = tr.querySelector('.status-badge, .status-select')
        const stVal  = stEl?.dataset?.status ?? stEl?.textContent?.trim() ?? ''

        const matchBusca  = !busca  || nome.includes(busca) || wpp.includes(busca)
        const matchStatus = !status || stVal === status || stEl?.value === status

        tr.style.display = matchBusca && matchStatus ? '' : 'none'
    })
}

export async function verReserva(id) {
    const [{ data: r, error: rErr }, { data: itens, error: itErr }] = await Promise.all([
        supabase
            .from('solicitacoes')
            .select(`*, numero, categorias(nome, preco_diaria), protecoes(nome, preco, tipo_preco, regra_hora_extra)`)
            .eq('id', id)
            .single(),
        supabase
            .from('solicitacao_itens')
            .select(`quantidade, preco_unitario, tipo_preco, adicionais(nome, regra_hora_extra)`)
            .eq('solicitacao_id', id),
    ])

    if (rErr || !r) { toast('Reserva não encontrada.', 'error'); return }
    if (itErr) logger.warn('[verReserva] erro ao buscar itens:', itErr.message)

    const fmt = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    const fmtDt = s => s ? new Date(s).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

    // Calcula dias — mesma fórmula do site (script.js:calcDias)
    const dias = calcDias(r.data_retirada, r.data_devolucao)

    // Monta linhas da tabela de valores
    const trStyle = 'border-bottom:1px solid var(--border)'
    const tdL = 'padding:7px 4px;font-size:13px'
    const tdR = 'padding:7px 4px;font-size:13px;text-align:right'

    const linhasProd = (() => {
      const rows = []
      // Categoria
      if (r.categorias) {
        const precoDia = parseFloat(r.categorias.preco_diaria || 0)
        const totalCat = precoDia * dias
        rows.push(`<tr style="${trStyle}">
          <td style="${tdL}">${r.categorias.nome} <span style="color:#94a3b8;font-size:11px">(${dias} diária${dias !== 1 ? 's' : ''})</span></td>
          <td style="${tdR}">${fmt(precoDia)}/dia</td>
          <td style="${tdR}">${fmt(totalCat)}</td>
        </tr>`)
      }
      // Proteção — usa a diária própria dela (regra_hora_extra), não a
      // diária global da categoria. Ver docs/DECISION_LOG.md 2026-07-14.
      if (r.protecoes) {
        const precoProt  = parseFloat(r.protecoes.preco || 0)
        const diasProt   = calcDiasItem(r.data_retirada, r.data_devolucao, r.protecoes.regra_hora_extra)
        const totalProt  = calcSubtotal(r.protecoes.tipo_preco, precoProt, 1, diasProt)
        const sufixoProt = r.protecoes.tipo_preco === 'per_day' ? '/dia' : ''
        rows.push(`<tr style="${trStyle}">
          <td style="${tdL}">${r.protecoes.nome}</td>
          <td style="${tdR}">${fmt(precoProt)}${sufixoProt}</td>
          <td style="${tdR}">${fmt(totalProt)}</td>
        </tr>`)
      }
      // Adicionais — mesma lógica por-item da proteção acima.
      ;(itens ?? []).forEach(i => {
        const unitario = parseFloat(i.preco_unitario || 0)
        const qty      = i.quantidade || 1
        const diasItem = calcDiasItem(r.data_retirada, r.data_devolucao, i.adicionais?.regra_hora_extra)
        const total    = calcSubtotal(i.tipo_preco, unitario, qty, diasItem)
        rows.push(`<tr style="${trStyle}">
          <td style="${tdL}">${i.adicionais?.nome ?? '—'}${qty > 1 ? ` (${qty}×)` : ''}</td>
          <td style="${tdR}">${fmt(unitario)}${i.tipo_preco === 'per_day' ? '/dia' : ''}</td>
          <td style="${tdR}">${fmt(total)}</td>
        </tr>`)
      })
      return rows.join('')
    })()

    const corpo = `
    <div style="display:grid;gap:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px">
            <div><strong>Cliente</strong><br>${esc(r.cliente_nome)}</div>
            <div><strong>CPF</strong><br>${esc(r.cliente_cpf ?? '—')}</div>
            <div><strong>WhatsApp</strong><br>${esc(r.cliente_whatsapp)}</div>
            <div><strong>E-mail</strong><br>${esc(r.cliente_email ?? '—')}</div>
            <div><strong>Retirada</strong><br>${fmtDt(r.data_retirada)}</div>
            <div><strong>Devolução</strong><br>${fmtDt(r.data_devolucao)}</div>
            <div><strong>Local Retirada</strong><br>${esc(r.local_retirada ?? '—')}</div>
            <div><strong>Local Devolução</strong><br>${esc(r.local_devolucao ?? '—')}</div>
            <div><strong>Voo</strong><br>${esc(r.numero_voo ?? '—')}</div>
            <div><strong>Pessoas</strong><br>${esc(String(r.pessoas ?? '—'))}</div>
        </div>
        <div style="border-top:1px solid var(--border);padding-top:12px">
            <strong style="font-size:13px;display:block;margin-bottom:8px">Produtos e Valores</strong>
            <table style="width:100%;border-collapse:collapse">
                <thead>
                    <tr style="background:#f8fafc">
                        <th style="text-align:left;padding:8px 4px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.5px">Produto</th>
                        <th style="text-align:right;padding:8px 4px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.5px">Valor Unit.</th>
                        <th style="text-align:right;padding:8px 4px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.5px">Total</th>
                    </tr>
                </thead>
                <tbody>${linhasProd || '<tr><td colspan="3" style="color:#94a3b8;text-align:center;padding:12px">Sem itens</td></tr>'}</tbody>
            </table>
        </div>
        <div style="border-top:1px solid var(--border);padding-top:12px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:13px;color:var(--muted)">Enviado em ${fmtDt(r.criado_em)}</span>
            <strong style="font-size:18px">${fmt(r.valor_estimado)}</strong>
        </div>
        ${r.motivo_cancelamento ? `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:10px;font-size:13px"><strong>Motivo cancelamento:</strong> ${esc(r.motivo_cancelamento)}</div>` : ''}
    </div>`

    const numFmt = r.numero ? String(r.numero).padStart(4, '0') : '—'
    abrirModal(`📋 #${numFmt} — ${esc(r.cliente_nome)}`, corpo, null)
    document.getElementById('modal-save-btn').style.display = 'none'
    document.getElementById('modal-cancel-btn').textContent = 'Fechar'

    // Botão imprimir
    const footer = document.querySelector('.modal-footer')
    if (footer && !footer.querySelector('#btn-imprimir')) {
        const btnPrint = document.createElement('button')
        btnPrint.id = 'btn-imprimir'
        btnPrint.className = 'btn-secondary'
        btnPrint.textContent = '🖨 Imprimir'
        btnPrint.addEventListener('click', () => imprimirReserva(r, itens, numFmt, dias, fmt, fmtDt))
        footer.insertBefore(btnPrint, footer.firstChild)
    }
}

function imprimirReserva(r, itens, numFmt, dias, fmt, fmtDt) {
    const trStyle = 'border-bottom:1px solid #e2e8f0'
    const tdL = 'padding:7px 6px;font-size:13px'
    const tdR = 'padding:7px 6px;font-size:13px;text-align:right'

    const linhasProd = (() => {
        const rows = []
        if (r.categorias) {
            const precoDia = parseFloat(r.categorias.preco_diaria || 0)
            rows.push(`<tr style="${trStyle}"><td style="${tdL}">${r.categorias.nome} (${dias} diária${dias !== 1 ? 's' : ''})</td><td style="${tdR}">${fmt(precoDia)}/dia</td><td style="${tdR}">${fmt(precoDia * dias)}</td></tr>`)
        }
        if (r.protecoes) {
            const preco = parseFloat(r.protecoes.preco || 0)
            const diasProt = calcDiasItem(r.data_retirada, r.data_devolucao, r.protecoes.regra_hora_extra)
            const total = r.protecoes.tipo_preco === 'per_day' ? preco * diasProt : preco
            rows.push(`<tr style="${trStyle}"><td style="${tdL}">${r.protecoes.nome}</td><td style="${tdR}">${fmt(preco)}${r.protecoes.tipo_preco === 'per_day' ? '/dia' : ''}</td><td style="${tdR}">${fmt(total)}</td></tr>`)
        }
        ;(itens ?? []).forEach(i => {
            const u = parseFloat(i.preco_unitario || 0)
            const q = i.quantidade || 1
            const diasItem = calcDiasItem(r.data_retirada, r.data_devolucao, i.adicionais?.regra_hora_extra)
            const t = i.tipo_preco === 'per_day' ? u * q * diasItem : u * q
            rows.push(`<tr style="${trStyle}"><td style="${tdL}">${i.adicionais?.nome ?? '—'}${q > 1 ? ` (${q}×)` : ''}</td><td style="${tdR}">${fmt(u)}${i.tipo_preco === 'per_day' ? '/dia' : ''}</td><td style="${tdR}">${fmt(t)}</td></tr>`)
        })
        return rows.join('')
    })()

    const status = { solicitada:'Solicitada', em_analise:'Em análise', confirmada:'Confirmada', concluida:'Concluída', cancelada:'Cancelada' }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Reserva #${esc(numFmt)} — Igufoz</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family: Arial, sans-serif; font-size:13px; color:#0b1b32; padding:32px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; padding-bottom:16px; border-bottom:2px solid #ff6a00; }
  .brand { font-size:22px; font-weight:900; color:#ff6a00; letter-spacing:-.02em; }
  .brand small { display:block; font-size:11px; font-weight:400; color:#61708a; margin-top:2px; }
  .num { font-size:28px; font-weight:900; color:#08264a; letter-spacing:-.03em; }
  .num small { display:block; font-size:11px; font-weight:400; color:#61708a; }
  .status-pill { display:inline-block; padding:3px 12px; border-radius:20px; font-size:11px; font-weight:700; background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; margin-top:4px; }
  section { margin-bottom:20px; }
  h2 { font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:#61708a; margin-bottom:10px; font-weight:700; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .field strong { display:block; font-size:11px; color:#61708a; margin-bottom:2px; }
  .field span { font-size:13px; color:#0b1b32; font-weight:500; }
  table { width:100%; border-collapse:collapse; }
  thead th { background:#f3f7fb; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#61708a; padding:8px 6px; text-align:left; border-bottom:1px solid #d9e3ef; }
  thead th:not(:first-child) { text-align:right; }
  tfoot td { border-top:2px solid #08264a; padding:10px 6px; font-weight:700; font-size:14px; }
  tfoot td:last-child { text-align:right; color:#ff6a00; }
  .footer { margin-top:32px; padding-top:14px; border-top:1px solid #d9e3ef; font-size:11px; color:#61708a; display:flex; justify-content:space-between; }
  @media print { body { padding:16px; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="brand">IGUFOZ<small>Aluguel de Carros — Foz do Iguaçu</small></div>
    <div class="status-pill">${status[r.status] ?? r.status}</div>
  </div>
  <div style="text-align:right">
    <div class="num">#${numFmt}<small>Reserva</small></div>
    <div style="font-size:11px;color:#61708a;margin-top:4px">Enviado em ${fmtDt(r.criado_em)}</div>
  </div>
</div>

<section>
  <h2>Dados do Cliente</h2>
  <div class="grid">
    <div class="field"><strong>Nome</strong><span>${esc(r.cliente_nome)}</span></div>
    <div class="field"><strong>CPF</strong><span>${esc(r.cliente_cpf ?? '—')}</span></div>
    <div class="field"><strong>WhatsApp</strong><span>${esc(r.cliente_whatsapp)}</span></div>
    <div class="field"><strong>E-mail</strong><span>${esc(r.cliente_email ?? '—')}</span></div>
  </div>
</section>

<section>
  <h2>Período</h2>
  <div class="grid">
    <div class="field"><strong>Retirada</strong><span>${fmtDt(r.data_retirada)}</span></div>
    <div class="field"><strong>Devolução</strong><span>${fmtDt(r.data_devolucao)}</span></div>
    <div class="field"><strong>Local Retirada</strong><span>${esc(r.local_retirada ?? '—')}</span></div>
    <div class="field"><strong>Local Devolução</strong><span>${esc(r.local_devolucao ?? '—')}</span></div>
    ${r.numero_voo ? `<div class="field"><strong>Voo</strong><span>${esc(r.numero_voo)}</span></div>` : ''}
    ${r.horario_pouso ? `<div class="field"><strong>Pouso</strong><span>${esc(r.horario_pouso)}</span></div>` : ''}
    ${r.companhia_aerea ? `<div class="field"><strong>Companhia</strong><span>${esc(r.companhia_aerea)}</span></div>` : ''}
    <div class="field"><strong>Pessoas</strong><span>${r.pessoas ?? 1}</span></div>
  </div>
</section>

<section>
  <h2>Produtos e Valores</h2>
  <table>
    <thead><tr><th>Produto</th><th>Valor Unit.</th><th>Total</th></tr></thead>
    <tbody>${linhasProd || '<tr><td colspan="3" style="color:#94a3b8;padding:10px 6px">Sem itens</td></tr>'}</tbody>
    <tfoot><tr><td colspan="2">Total Estimado</td><td>${fmt(r.valor_estimado)}</td></tr></tfoot>
  </table>
</section>

${r.observacoes ? `<section><h2>Observações</h2><p style="font-size:13px;line-height:1.6">${esc(r.observacoes)}</p></section>` : ''}
${r.motivo_cancelamento ? `<section><h2>Motivo Cancelamento</h2><p style="font-size:13px;color:#b91c1c">${esc(r.motivo_cancelamento)}</p></section>` : ''}

<div class="footer">
  <span>Igufoz Locadora · (45) 9 8818-2995 · Foz do Iguaçu – PR</span>
  <span>Documento gerado em ${new Date().toLocaleString('pt-BR')}</span>
</div>
</body>
</html>`

    const win = window.open('', '_blank', 'width=800,height=900')
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 400)
}

async function excluirReserva(id, num) {
    confirmarComSenha(
        `Você está prestes a <strong>excluir permanentemente</strong> a reserva <strong>#${num}</strong>.<br>Esta ação não pode ser desfeita.`,
        async () => {
            const { data: antes } = await supabase
                .from('solicitacoes').select('*').eq('id', id).single()

            const { data: excluidas, error } = await supabase
                .from('solicitacoes')
                .delete()
                .eq('id', id)
                .eq('tenant_id', TENANT_ID)
                .select('id')

            if (error) { toast(error.message, 'error'); return }

            // RLS sem policy de DELETE correspondente não gera erro — só
            // afeta 0 linhas. Sem essa checagem, a UI mostrava "excluída"
            // mesmo quando nada foi de fato apagado no banco (a reserva
            // "reaparecia" ao recarregar a página).
            if (!excluidas?.length) {
                toast('Não foi possível excluir: permissão negada ou reserva já removida.', 'error')
                return
            }

            await registrarAuditoria('excluir', 'reserva', id, `Reserva #${num} excluída`, antes, null)
            toast(`Reserva #${num} excluída.`, 'success')
            const row = document.querySelector(`[data-action="excluir"][data-id="${id}"]`)?.closest('tr')
            row?.remove()
        }
    )
}

async function trocarStatus(id, status, statusAnterior, motivo = null) {
    const payload = { status }
    if (motivo) payload.motivo_cancelamento = motivo

    const { error } = await supabase
        .from('solicitacoes')
        .update(payload)
        .eq('id', id)
        .eq('tenant_id', TENANT_ID)

    if (error) {
        toast(error.message, 'error')
        return false
    }

    await registrarAuditoria(
        'status', 'reserva', id,
        `Status alterado: ${STATUS_LABELS[statusAnterior]} → ${STATUS_LABELS[status]}`,
        { status: statusAnterior },
        { status, motivo_cancelamento: motivo ?? undefined }
    )

    toast(`Status atualizado: ${STATUS_LABELS[status]}`, 'success')
    return true
}

function fmtMoney(v) {
    return 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtData(str) {
    if (!str) return '—'
    return new Date(str).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDataSimples(str) {
    if (!str) return '—'
    return new Date(str).toLocaleDateString('pt-BR')
}

// Diárias vêm do módulo canônico ../shared/pricing.js (cópia byte-idêntica
// da fonte em supabase/functions/_shared/pricing.js, garantida por
// tests/pricing-parity.test.js). Wrapper: para exibição, período inválido
// mostra 1 diária em vez de 0.
function calcDias(ret, dev) {
    return calcDiasCanonico(ret, dev) || 1
}
