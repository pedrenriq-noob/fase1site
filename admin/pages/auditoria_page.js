// auditoria_page.js — Página de visualização do histórico de auditoria
import { supabase, TENANT_ID } from '../admin.js'

export async function renderAuditoria() {
    const { data: logs, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .order('criado_em', { ascending: false })
        .limit(200)

    if (error) throw error

    const ACAO_ICON = { criar: '➕', atualizar: '✏️', excluir: '🗑️', status: '🔄' }
    const ENTIDADE_LABEL = {
        reserva: 'Reserva', categoria: 'Veículo', local: 'Local',
        protecao: 'Proteção', adicional: 'Adicional',
    }

    const linhas = (logs ?? []).map(l => {
        const dt = new Date(l.criado_em).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        })
        const ent   = ENTIDADE_LABEL[l.entidade] ?? l.entidade
        const icon  = ACAO_ICON[l.acao] ?? '•'
        const antes  = l.dados_antes  ? `<details><summary style="cursor:pointer;font-size:11px;color:#61708a">Antes</summary><pre style="font-size:10px;overflow:auto;max-height:80px;background:#f8fafc;padding:6px;border-radius:4px">${JSON.stringify(l.dados_antes, null, 2)}</pre></details>` : ''
        const depois = l.dados_depois ? `<details><summary style="cursor:pointer;font-size:11px;color:#61708a">Depois</summary><pre style="font-size:10px;overflow:auto;max-height:80px;background:#f8fafc;padding:6px;border-radius:4px">${JSON.stringify(l.dados_depois, null, 2)}</pre></details>` : ''

        return `<tr>
            <td style="font-size:12px;white-space:nowrap;color:var(--muted)">${dt}</td>
            <td style="text-align:center">${icon}</td>
            <td><span class="td-badge">${ent}</span></td>
            <td style="font-size:13px">${l.descricao ?? '—'}</td>
            <td style="font-size:11px;color:var(--muted)">${l.entidade_id ? l.entidade_id.slice(0, 8) + '…' : '—'}</td>
            <td>${antes}${depois}</td>
        </tr>`
    }).join('')

    return `
    <div class="page-header">
        <div>
            <h1>🕵️ Auditoria</h1>
            <p style="color:var(--muted);font-size:13px;margin-top:4px">Histórico das últimas 200 alterações administrativas.</p>
        </div>
    </div>
    <div class="card">
        <div class="table-wrap">
            ${logs?.length ? `
            <table>
                <thead><tr>
                    <th>Data/Hora</th><th></th><th>Entidade</th><th>Descrição</th><th>ID</th><th>Dados</th>
                </tr></thead>
                <tbody>${linhas}</tbody>
            </table>` : `
            <div class="empty-state">
                <div class="empty-icon">🕵️</div>
                <p>Nenhum registro de auditoria ainda.</p>
            </div>`}
        </div>
    </div>`
}
