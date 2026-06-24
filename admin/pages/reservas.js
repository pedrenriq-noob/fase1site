// pages/reservas.js
import { supabase, TENANT_ID, toast, abrirModal } from '../admin.js'

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

export async function renderReservas() {
    const { data: reservas, error } = await supabase
        .from('solicitacoes')
        .select(`
            id, numero, status, cliente_nome, cliente_whatsapp, cliente_email,
            data_retirada, data_devolucao, valor_estimado, criado_em,
            categorias ( nome )
        `)
        .eq('tenant_id', TENANT_ID)
        .order('criado_em', { ascending: false })

    if (error) throw error

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
            <td style="font-weight:700;color:#FF6B00;letter-spacing:.5px">#${numFmt}</td>
            <td style="font-size:12px;white-space:nowrap">${fmtData(r.criado_em)}</td>
            <td class="td-name">${r.cliente_nome}</td>
            <td style="font-size:12px">${r.cliente_whatsapp}</td>
            <td>${r.categorias?.nome ?? '—'}</td>
            <td class="td-price">${fmtMoney(r.valor_estimado)}</td>
            <td style="font-size:12px;white-space:nowrap">${fmtDataSimples(r.data_retirada)}</td>
            <td>
                ${isFinal
                    ? `<span class="status-badge status-${status}">${STATUS_LABELS[status]}</span>`
                    : `<select class="status-select" style="border-color:${cor};color:${cor}"
                              data-id="${r.id}" data-status="${status}">
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
                    <th>#</th><th>Enviado em</th><th>Cliente</th><th>WhatsApp</th><th>Veículo</th><th>Total</th><th>Retirada</th><th>Status</th><th></th>
                </tr></thead>
                <tbody>${linhas}</tbody>
            </table>` : `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <p>Nenhuma reserva ainda.</p>
            </div>`}
        </div>
    </div>`
}

export function bindReservas() {
    // Troca de status inline
    document.querySelectorAll('.status-select').forEach(sel => {
        sel.addEventListener('change', async () => {
            const id         = sel.dataset.id
            const novoStatus = sel.value
            const statusAtual = sel.dataset.status

            if (novoStatus === statusAtual) return

            if (novoStatus === 'cancelada') {
                const motivo = prompt('Motivo do cancelamento (obrigatório):')
                if (!motivo?.trim()) {
                    sel.value = statusAtual
                    toast('Informe o motivo do cancelamento.', 'error')
                    return
                }
                await trocarStatus(id, novoStatus, motivo.trim())
            } else {
                await trocarStatus(id, novoStatus)
            }

            sel.dataset.status = novoStatus
            const cor = STATUS_COR[novoStatus] ?? '#64748b'
            sel.style.borderColor = cor
            sel.style.color = cor
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

async function verReserva(id) {
    const [{ data: r }, { data: itens }] = await Promise.all([
        supabase
            .from('solicitacoes')
            .select(`*, numero, categorias(nome, preco_diaria), protecoes(nome, preco, tipo_preco)`)
            .eq('id', id)
            .single(),
        supabase
            .from('solicitacao_itens')
            .select(`quantidade, preco_unitario, tipo_preco, adicionais(nome)`)
            .eq('solicitacao_id', id),
    ])

    if (!r) { toast('Reserva não encontrada.', 'error'); return }

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
      // Proteção
      if (r.protecoes) {
        const precoProt  = parseFloat(r.protecoes.preco || 0)
        const totalProt  = r.protecoes.tipo_preco === 'per_day' ? precoProt * dias : precoProt
        const sufixoProt = r.protecoes.tipo_preco === 'per_day' ? '/dia' : ''
        rows.push(`<tr style="${trStyle}">
          <td style="${tdL}">${r.protecoes.nome}</td>
          <td style="${tdR}">${fmt(precoProt)}${sufixoProt}</td>
          <td style="${tdR}">${fmt(totalProt)}</td>
        </tr>`)
      }
      // Adicionais
      ;(itens ?? []).forEach(i => {
        const unitario = parseFloat(i.preco_unitario || 0)
        const qty      = i.quantidade || 1
        const total    = i.tipo_preco === 'per_day' ? unitario * qty * dias : unitario * qty
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
            <div><strong>Cliente</strong><br>${r.cliente_nome}</div>
            <div><strong>CPF</strong><br>${r.cliente_cpf ?? '—'}</div>
            <div><strong>WhatsApp</strong><br>${r.cliente_whatsapp}</div>
            <div><strong>E-mail</strong><br>${r.cliente_email ?? '—'}</div>
            <div><strong>Retirada</strong><br>${fmtDt(r.data_retirada)}</div>
            <div><strong>Devolução</strong><br>${fmtDt(r.data_devolucao)}</div>
            <div><strong>Local Retirada</strong><br>${r.local_retirada ?? '—'}</div>
            <div><strong>Local Devolução</strong><br>${r.local_devolucao ?? '—'}</div>
            <div><strong>Voo</strong><br>${r.numero_voo ?? '—'}</div>
            <div><strong>Pessoas</strong><br>${r.pessoas ?? '—'}</div>
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
        ${r.motivo_cancelamento ? `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:10px;font-size:13px"><strong>Motivo cancelamento:</strong> ${r.motivo_cancelamento}</div>` : ''}
    </div>`

    const numFmt = r.numero ? String(r.numero).padStart(4, '0') : '—'
    abrirModal(`📋 #${numFmt} — ${r.cliente_nome}`, corpo, null)
    document.getElementById('modal-save-btn').style.display = 'none'
    document.getElementById('modal-cancel-btn').textContent = 'Fechar'
}

async function excluirReserva(id, num) {
    if (!confirm(`Excluir reserva #${num}?\nEsta ação não pode ser desfeita.`)) return

    const { error } = await supabase
        .from('solicitacoes')
        .delete()
        .eq('id', id)
        .eq('tenant_id', TENANT_ID)

    if (error) { toast(error.message, 'error'); return }

    toast(`Reserva #${num} excluída.`, 'success')

    const row = document.querySelector(`[data-action="excluir"][data-id="${id}"]`)?.closest('tr')
    row?.remove()
}

async function trocarStatus(id, status, motivo = null) {
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

    toast(`Status atualizado: ${STATUS_LABELS[status]}`, 'success')
    return true
}

function transicoesPossiveis(status) {
    const mapa = {
        solicitada: ['solicitada', 'em_analise', 'cancelada'],
        em_analise: ['em_analise', 'confirmada', 'cancelada'],
        confirmada: ['confirmada', 'concluida',  'cancelada'],
        concluida:  ['concluida'],
        cancelada:  ['cancelada'],
    }
    return mapa[status] ?? [status]
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

// Mesma fórmula do site/script.js para consistência de preços
function calcDias(ret, dev) {
    const diffH = (new Date(dev) - new Date(ret)) / 3600000
    if (diffH <= 0) return 1
    const full  = Math.floor(diffH / 24)
    const resto = diffH % 24
    if (resto <= 1)     return Math.max(1, full)
    if (resto > 4)      return full + 1
    return full + Math.floor(resto * 2) / 8
}
