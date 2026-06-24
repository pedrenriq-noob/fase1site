// pages/dashboard.js
import { supabase, TENANT_ID } from '../admin.js'

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
    // filtro === 'todos': de/ate ficam null

    carregarDashboard(de, ate)
}

async function carregarDashboard(de, ate) {
    const statsEl  = document.getElementById('dash-stats')
    const tabelaEl = document.getElementById('dash-tabela')
    if (!statsEl || !tabelaEl) return

    statsEl.innerHTML  = '<div class="loading-page" style="grid-column:1/-1">Carregando...</div>'
    tabelaEl.innerHTML = ''

    let q = supabase
        .from('solicitacoes')
        .select('status, valor_estimado, criado_em, cliente_nome, numero')
        .eq('tenant_id', TENANT_ID)
        .order('criado_em', { ascending: false })
        .limit(500)

    if (de)  q = q.gte('criado_em', de)
    if (ate) q = q.lte('criado_em', ate)

    const { data: reservas, error } = await q

    if (error) {
        statsEl.innerHTML = `<div class="alert alert-info" style="grid-column:1/-1">Erro ao carregar: ${error.message}</div>`
        return
    }

    const total       = reservas?.length ?? 0
    const confirmada  = reservas?.filter(r => r.status === 'confirmada').length  ?? 0
    const analise     = reservas?.filter(r => r.status === 'em_analise').length  ?? 0
    const cancelada   = reservas?.filter(r => r.status === 'cancelada').length   ?? 0
    const faturamento = reservas
        ?.filter(r => r.status !== 'cancelada')
        .reduce((s, r) => s + (parseFloat(r.valor_estimado) || 0), 0) ?? 0

    statsEl.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon">📋</div>
            <div class="stat-info">
                <div class="stat-value">${total}</div>
                <div class="stat-label">Total de Reservas</div>
            </div>
        </div>
        <div class="stat-card success">
            <div class="stat-icon">✅</div>
            <div class="stat-info">
                <div class="stat-value">${confirmada}</div>
                <div class="stat-label">Confirmadas</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">🔍</div>
            <div class="stat-info">
                <div class="stat-value">${analise}</div>
                <div class="stat-label">Em Análise</div>
            </div>
        </div>
        <div class="stat-card" style="border-left-color:#ef4444">
            <div class="stat-icon">❌</div>
            <div class="stat-info">
                <div class="stat-value">${cancelada}</div>
                <div class="stat-label">Canceladas</div>
            </div>
        </div>
        <div class="stat-card" style="border-left-color:#0f2b4f">
            <div class="stat-icon">💰</div>
            <div class="stat-info">
                <div class="stat-value" style="font-size:16px">${fmtMoney(faturamento)}</div>
                <div class="stat-label">Faturamento Estimado</div>
            </div>
        </div>`

    const linhas = (reservas?.slice(0, 10) ?? []).map(r => `
        <tr>
            <td>${new Date(r.criado_em).toLocaleDateString('pt-BR')}</td>
            <td>${r.numero ? `<strong>#${String(r.numero).padStart(4, '0')}</strong>` : '—'}</td>
            <td>${r.cliente_nome ?? '—'}</td>
            <td><span class="status-badge status-${r.status}">${labelStatus(r.status)}</span></td>
            <td class="td-price">${fmtMoney(r.valor_estimado)}</td>
        </tr>`).join('')

    tabelaEl.innerHTML = `
    <div class="card">
        <div class="card-header"><h3>Reservas Recentes</h3></div>
        <div class="table-wrap">
            <table>
                <thead><tr>
                    <th>Data</th><th>#</th><th>Cliente</th><th>Status</th><th>Valor Estimado</th>
                </tr></thead>
                <tbody>
                    ${linhas || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:24px">Nenhuma reserva neste período.</td></tr>'}
                </tbody>
            </table>
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
