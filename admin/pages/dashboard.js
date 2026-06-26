// pages/dashboard.js
import { supabase, TENANT_ID, esc, initSortable } from '../admin.js'
import { verReserva } from './reservas.js'

export async function renderDashboard() {
    return `
    <div class="page-header">
        <h1>📊 Dashboard</h1>
    </div>

    <div class="card" style="margin-bottom:20px">
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px">
            <strong style="font-size:13px;color:var(--muted);white-space:nowrap">Período:</strong>
            <div style="display:flex;flex-wrap:wrap;gap:8px" id="dash-filtros-rapidos">
                <button class="dash-filtro-btn active" data-filtro="mes">Mês atual</button>
                <button class="dash-filtro-btn" data-filtro="7">Últimos 7 dias</button>
                <button class="dash-filtro-btn" data-filtro="15">Últimos 15 dias</button>
                <button class="dash-filtro-btn" data-filtro="30">Últimos 30 dias</button>
                <button class="dash-filtro-btn" data-filtro="todos">Todos</button>
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin-left:auto">
                <input type="date" id="dash-de" style="padding:6px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:12px;color:var(--text);outline:none">
                <span style="color:var(--muted);font-size:12px">até</span>
                <input type="date" id="dash-ate" style="padding:6px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:12px;color:var(--text);outline:none">
                <button id="dash-filtro-custom" class="btn-secondary" style="font-size:12px;padding:6px 12px">Filtrar</button>
            </div>
        </div>
    </div>

    <div id="dash-stats" class="stats-grid">
        <div class="loading-page" style="grid-column:1/-1">Carregando...</div>
    </div>
    <div id="dash-segmentos"></div>
    <div id="dash-tabela"></div>`
}

export function bindDashboard() {
    aplicarFiltroRapido('mes')

    document.querySelectorAll('.dash-filtro-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dash-filtro-btn').forEach(b => b.classList.remove('active'))
            btn.classList.add('active')
            document.getElementById('dash-de').value  = ''
            document.getElementById('dash-ate').value = ''
            aplicarFiltroRapido(btn.dataset.filtro)
        })
    })

    document.getElementById('dash-filtro-custom')?.addEventListener('click', () => {
        const de  = document.getElementById('dash-de').value
        const ate = document.getElementById('dash-ate').value
        if (!de && !ate) return
        document.querySelectorAll('.dash-filtro-btn').forEach(b => b.classList.remove('active'))
        carregarDashboard(de || null, ate ? ate + 'T23:59:59' : null)
    })
}

function aplicarFiltroRapido(filtro) {
    const hoje = new Date()
    let de = null, ate = null

    if (filtro === 'mes') {
        de  = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()
        ate = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59).toISOString()
    } else if (filtro === '7' || filtro === '15' || filtro === '30') {
        const dias = parseInt(filtro)
        const inicio = new Date(hoje)
        inicio.setDate(hoje.getDate() - dias + 1)
        inicio.setHours(0, 0, 0, 0)
        de  = inicio.toISOString()
        ate = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString()
    }

    carregarDashboard(de, ate)
}

async function carregarDashboard(de, ate) {
    const statsEl  = document.getElementById('dash-stats')
    const segmEl   = document.getElementById('dash-segmentos')
    const tabelaEl = document.getElementById('dash-tabela')
    if (!statsEl || !segmEl || !tabelaEl) return

    statsEl.innerHTML  = '<div class="loading-page" style="grid-column:1/-1">Carregando...</div>'
    segmEl.innerHTML   = ''
    tabelaEl.innerHTML = ''

    // PERF-01 FIX: RPC server-side — substitui carga de 500 registros no cliente
    const { data, error } = await supabase.rpc('dashboard_dados', {
        p_tenant_id: TENANT_ID,
        p_de:  de  ?? null,
        p_ate: ate ?? null,
    })

    if (error) {
        statsEl.innerHTML = `<div class="alert alert-info" style="grid-column:1/-1">Erro ao carregar: ${esc(error.message)}</div>`
        return
    }

    const kpis     = data?.kpis     ?? {}
    const cats     = data?.cats     ?? []
    const prots    = data?.prots    ?? []
    const adds     = data?.adds     ?? []
    const recentes = data?.recentes ?? []

    // ── KPIs ────────────────────────────────────────────────────────────────
    statsEl.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon">📋</div>
            <div class="stat-info">
                <div class="stat-value">${kpis.total ?? 0}</div>
                <div class="stat-label">Total de Reservas</div>
            </div>
        </div>
        <div class="stat-card success">
            <div class="stat-icon">✅</div>
            <div class="stat-info">
                <div class="stat-value">${kpis.confirmada ?? 0}</div>
                <div class="stat-label">Confirmadas</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">🔍</div>
            <div class="stat-info">
                <div class="stat-value">${kpis.em_analise ?? 0}</div>
                <div class="stat-label">Em Análise</div>
            </div>
        </div>
        <div class="stat-card" style="border-left-color:#ef4444">
            <div class="stat-icon">❌</div>
            <div class="stat-info">
                <div class="stat-value">${kpis.cancelada ?? 0}</div>
                <div class="stat-label">Canceladas</div>
            </div>
        </div>
        <div class="stat-card" style="border-left-color:#0f2b4f">
            <div class="stat-icon">💰</div>
            <div class="stat-info">
                <div class="stat-value" style="font-size:16px">${fmtMoney(kpis.faturamento ?? 0)}</div>
                <div class="stat-label">Faturamento Estimado</div>
            </div>
        </div>`

    // ── Segmentos ────────────────────────────────────────────────────────────
    const totalAtivas = (kpis.total ?? 0) - (kpis.cancelada ?? 0) || 1

    segmEl.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:20px">

        <div class="card">
            <div class="card-header" style="padding-bottom:8px">
                <h3 style="font-size:14px">🚗 Reservas por Categoria</h3>
            </div>
            <div style="padding:0 0 4px">
                ${cats.length === 0
                    ? '<p style="color:var(--muted);font-size:13px;padding:12px 0">Nenhum dado no período.</p>'
                    : cats.map((c, i) => renderBarra(esc(c.nome), c.qty, totalAtivas, i)).join('')
                }
            </div>
        </div>

        <div class="card">
            <div class="card-header" style="padding-bottom:8px">
                <h3 style="font-size:14px">🛡️ Proteções Escolhidas</h3>
            </div>
            <div style="padding:0 0 4px">
                ${prots.length === 0
                    ? '<p style="color:var(--muted);font-size:13px;padding:12px 0">Nenhum dado no período.</p>'
                    : prots.map((p, i) => renderBarra(esc(p.nome), p.qty, totalAtivas, i)).join('')
                }
            </div>
        </div>

        <div class="card">
            <div class="card-header" style="padding-bottom:8px">
                <h3 style="font-size:14px">➕ Adicionais Mais Solicitados</h3>
            </div>
            <div style="padding:0 0 4px">
                ${adds.length === 0
                    ? '<p style="color:var(--muted);font-size:13px;padding:12px 0">Nenhum adicional no período.</p>'
                    : adds.map((a, i) => renderBarra(esc(a.nome), a.qty, Math.max(...adds.map(x => x.qty)), i, true)).join('')
                }
            </div>
        </div>

    </div>`

    // ── Tabela recentes ──────────────────────────────────────────────────────
    const linhas = recentes.map(r => `
        <tr>
            <td data-sort-val="${r.criado_em ?? ''}">${new Date(r.criado_em).toLocaleDateString('pt-BR')}</td>
            <td data-sort-val="${r.numero ?? 0}">${r.numero ? `<strong>#${String(r.numero).padStart(4, '0')}</strong>` : '—'}</td>
            <td>${esc(r.cliente_nome ?? '—')}</td>
            <td>${esc(r.cat_nome ?? '—')}</td>
            <td>${r.prot_nome ? esc(r.prot_nome) : '<span style="color:var(--muted)">—</span>'}</td>
            <td><span class="status-badge status-${r.status}">${labelStatus(r.status)}</span></td>
            <td data-sort-val="${r.valor_estimado ?? 0}" class="td-price">${fmtMoney(r.valor_estimado)}</td>
            <td><button class="btn-ver-dash" data-id="${r.id}" style="padding:4px 10px;font-size:12px;border:1px solid var(--border);background:#fff;border-radius:6px;cursor:pointer;color:var(--text);font-family:inherit">👁 Ver</button></td>
        </tr>`).join('')

    tabelaEl.innerHTML = `
    <div class="card">
        <div class="card-header"><h3>Reservas Recentes</h3></div>
        <div class="table-wrap">
            <table>
                <thead><tr>
                    <th data-sort="date">Data</th><th data-sort="num">#</th><th data-sort="text">Cliente</th><th data-sort="text">Categoria</th><th data-sort="text">Proteção</th><th data-sort="text">Status</th><th data-sort="num">Valor Estimado</th><th></th>
                </tr></thead>
                <tbody>
                    ${linhas || '<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:24px">Nenhuma reserva neste período.</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>`

    tabelaEl.querySelectorAll('.btn-ver-dash').forEach(btn =>
        btn.addEventListener('click', () => verReserva(btn.dataset.id))
    )

    initSortable(tabelaEl.querySelector('table'))
}

const CORES = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4']

function renderBarra(nome, qty, total, idx, absoluto = false) {
    const pct = Math.round((qty / total) * 100)
    const cor = CORES[idx % CORES.length]
    return `
    <div style="padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
            <span style="font-weight:600;color:var(--text)">${nome}</span>
            <span style="color:var(--muted)">${absoluto ? `${qty}×` : `${qty} (${pct}%)`}</span>
        </div>
        <div style="background:#f1f5f9;border-radius:99px;height:7px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${cor};border-radius:99px;transition:width .4s"></div>
        </div>
    </div>`
}

function fmtMoney(v) {
    return 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function labelStatus(s) {
    const map = { solicitada: 'Solicitada', em_analise: 'Em análise', confirmada: 'Confirmada', concluida: 'Concluída', cancelada: 'Cancelada' }
    return map[s] ?? s
}
