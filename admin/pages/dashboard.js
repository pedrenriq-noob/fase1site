// pages/dashboard.js
import { supabase, TENANT_ID } from '../admin.js'

export async function renderDashboard() {
    const { data: reservas } = await supabase
        .from('solicitacoes')
        .select('status, valor_estimado, criado_em')
        .eq('tenant_id', TENANT_ID)
        .order('criado_em', { ascending: false })
        .limit(500)

    const total      = reservas?.length ?? 0
    const confirmada = reservas?.filter(r => r.status === 'confirmada').length  ?? 0
    const analise    = reservas?.filter(r => r.status === 'em_analise').length  ?? 0
    const cancelada  = reservas?.filter(r => r.status === 'cancelada').length   ?? 0
    const faturamento = reservas
        ?.filter(r => r.status !== 'cancelada')
        .reduce((s, r) => s + (parseFloat(r.valor_estimado) || 0), 0) ?? 0

    return `
    <div class="page-header">
        <h1>📊 Dashboard</h1>
    </div>

    <div class="stats-grid">
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
        </div>
    </div>

    <div class="card">
        <div class="card-header"><h3>Reservas Recentes</h3></div>
        <div class="table-wrap">
            <table>
                <thead><tr>
                    <th>Data</th><th>Status</th><th>Valor Estimado</th>
                </tr></thead>
                <tbody>
                    ${(reservas?.slice(0, 10) ?? []).map(r => `
                    <tr>
                        <td>${new Date(r.criado_em).toLocaleDateString('pt-BR')}</td>
                        <td><span class="status-badge status-${r.status}">${labelStatus(r.status)}</span></td>
                        <td class="td-price">${fmtMoney(r.valor_estimado)}</td>
                    </tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:24px">Nenhuma reserva ainda.</td></tr>'}
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
