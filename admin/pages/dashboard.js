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
    const statsEl    = document.getElementById('dash-stats')
    const segmEl     = document.getElementById('dash-segmentos')
    const tabelaEl   = document.getElementById('dash-tabela')
    if (!statsEl || !segmEl || !tabelaEl) return

    statsEl.innerHTML  = '<div class="loading-page" style="grid-column:1/-1">Carregando...</div>'
    segmEl.innerHTML   = ''
    tabelaEl.innerHTML = ''

    // Busca reservas com joins para categorias, proteções e itens
    let q = supabase
        .from('solicitacoes')
        .select(`
            id, status, valor_estimado, criado_em, cliente_nome, numero,
            categorias(nome),
            protecoes(nome),
            solicitacao_itens(quantidade, adicionais(nome))
        `)
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

    const ativas = reservas?.filter(r => r.status !== 'cancelada') ?? []

    // ── KPIs financeiros ────────────────────────────────────────────────────
    const total       = reservas?.length ?? 0
    const confirmada  = reservas?.filter(r => r.status === 'confirmada').length ?? 0
    const analise     = reservas?.filter(r => r.status === 'em_analise').length ?? 0
    const cancelada   = reservas?.filter(r => r.status === 'cancelada').length ?? 0
    const faturamento = ativas.reduce((s, r) => s + (parseFloat(r.valor_estimado) || 0), 0)

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

    // ── Segmentações ────────────────────────────────────────────────────────

    // Categorias
    const catMap = new Map()
    for (const r of ativas) {
        const nome = r.categorias?.nome ?? 'Sem categoria'
        catMap.set(nome, (catMap.get(nome) ?? 0) + 1)
    }
    const catOrdenado = [...catMap.entries()].sort((a, b) => b[1] - a[1])

    // Proteções
    const protMap = new Map()
    for (const r of ativas) {
        const nome = r.protecoes?.nome ?? null
        if (nome) protMap.set(nome, (protMap.get(nome) ?? 0) + 1)
    }
    const semProtecao = ativas.filter(r => !r.protecoes?.nome).length
    if (semProtecao > 0) protMap.set('Sem proteção', semProtecao)
    const protOrdenado = [...protMap.entries()].sort((a, b) => b[1] - a[1])

    // Adicionais
    const addMap = new Map()
    for (const r of ativas) {
        for (const item of r.solicitacao_itens ?? []) {
            const nome = item.adicionais?.nome ?? 'Adicional'
            const qty  = item.quantidade ?? 1
            addMap.set(nome, (addMap.get(nome) ?? 0) + qty)
        }
    }
    const addOrdenado = [...addMap.entries()].sort((a, b) => b[1] - a[1])

    const totalAtivas = ativas.length || 1

    segmEl.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:20px">

        <!-- Categorias -->
        <div class="card">
            <div class="card-header" style="padding-bottom:8px">
                <h3 style="font-size:14px;display:flex;align-items:center;gap:8px">🚗 Reservas por Categoria</h3>
            </div>
            <div style="padding:0 0 4px">
                ${catOrdenado.length === 0
                    ? '<p style="color:var(--muted);font-size:13px;padding:12px 0">Nenhum dado no período.</p>'
                    : catOrdenado.map(([nome, qty], i) => renderBarraSegmento(nome, qty, totalAtivas, i)).join('')
                }
            </div>
        </div>

        <!-- Proteções -->
        <div class="card">
            <div class="card-header" style="padding-bottom:8px">
                <h3 style="font-size:14px;display:flex;align-items:center;gap:8px">🛡️ Proteções Escolhidas</h3>
            </div>
            <div style="padding:0 0 4px">
                ${protOrdenado.length === 0
                    ? '<p style="color:var(--muted);font-size:13px;padding:12px 0">Nenhum dado no período.</p>'
                    : protOrdenado.map(([nome, qty], i) => renderBarraSegmento(nome, qty, totalAtivas, i)).join('')
                }
            </div>
        </div>

        <!-- Adicionais -->
        <div class="card">
            <div class="card-header" style="padding-bottom:8px">
                <h3 style="font-size:14px;display:flex;align-items:center;gap:8px">➕ Adicionais Mais Solicitados</h3>
            </div>
            <div style="padding:0 0 4px">
                ${addOrdenado.length === 0
                    ? '<p style="color:var(--muted);font-size:13px;padding:12px 0">Nenhum adicional no período.</p>'
                    : addOrdenado.map(([nome, qty], i) => renderBarraSegmento(nome, qty, Math.max(...addOrdenado.map(x => x[1])), i, true)).join('')
                }
            </div>
        </div>

    </div>`

    // ── Tabela recentes ─────────────────────────────────────────────────────
    const linhas = (reservas?.slice(0, 10) ?? []).map(r => `
        <tr>
            <td>${new Date(r.criado_em).toLocaleDateString('pt-BR')}</td>
            <td>${r.numero ? `<strong>#${String(r.numero).padStart(4, '0')}</strong>` : '—'}</td>
            <td>${r.cliente_nome ?? '—'}</td>
            <td>${r.categorias?.nome ?? '—'}</td>
            <td>${r.protecoes?.nome ?? '<span style="color:var(--muted)">—</span>'}</td>
            <td><span class="status-badge status-${r.status}">${labelStatus(r.status)}</span></td>
            <td class="td-price">${fmtMoney(r.valor_estimado)}</td>
        </tr>`).join('')

    tabelaEl.innerHTML = `
    <div class="card">
        <div class="card-header"><h3>Reservas Recentes</h3></div>
        <div class="table-wrap">
            <table>
                <thead><tr>
                    <th>Data</th><th>#</th><th>Cliente</th><th>Categoria</th><th>Proteção</th><th>Status</th><th>Valor Estimado</th>
                </tr></thead>
                <tbody>
                    ${linhas || '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:24px">Nenhuma reserva neste período.</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>`
}

const CORES = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4']

function renderBarraSegmento(nome, qty, total, idx, absoluto = false) {
    const pct    = Math.round((qty / total) * 100)
    const cor    = CORES[idx % CORES.length]
    const label  = absoluto ? `${qty}×` : `${qty} (${pct}%)`
    return `
    <div style="padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
            <span style="font-weight:600;color:var(--text)">${nome}</span>
            <span style="color:var(--muted)">${label}</span>
        </div>
        <div style="background:#f1f5f9;border-radius:99px;height:7px;overflow:hidden">
            <div style="width:${absoluto ? pct : pct}%;height:100%;background:${cor};border-radius:99px;transition:width .4s"></div>
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
