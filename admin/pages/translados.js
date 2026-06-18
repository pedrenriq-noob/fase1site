// pages/translados.js
import { supabase, TENANT_ID, toast } from '../admin.js'

export async function renderTranslados() {
    const { data: translados, error } = await supabase
        .from('translados')
        .select(`
            id, numero_voo, data_voo, horario_pouso, pessoas,
            status, solicitado_em, confirmado_em, observacoes,
            usuarios ( nome, whatsapp ),
            solicitacoes ( id, categorias ( nome ) )
        `)
        .eq('tenant_id', TENANT_ID)
        .order('solicitado_em', { ascending: false })

    if (error) throw error

    const pendentes   = (translados ?? []).filter(t => t.status === 'pendente')
    const historico   = (translados ?? []).filter(t => t.status !== 'pendente')

    const cardTranslado = (t) => `
    <div class="translado-card ${t.status}" data-id="${t.id}">
        <div class="translado-info">
            <strong>✈️ Voo ${t.numero_voo}</strong>
            <span>📅 ${fmtData(t.data_voo)} às ${t.horario_pouso?.slice(0,5)}</span>
            <span>👤 ${t.usuarios?.nome ?? '—'} · ${t.usuarios?.whatsapp ?? '—'}</span>
            <span>🚗 ${t.solicitacoes?.categorias?.nome ?? '—'}</span>
            <span>👥 ${t.pessoas} pessoa${t.pessoas !== 1 ? 's' : ''}</span>
            ${t.observacoes ? `<span style="font-size:12px;color:#64748b">📝 ${t.observacoes}</span>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
            <span class="status-badge status-${t.status === 'pendente' ? 'solicitada' : t.status === 'confirmado' ? 'confirmada' : 'cancelada'}">
                ${t.status === 'pendente' ? '⏳ Pendente' : t.status === 'confirmado' ? '✅ Confirmado' : '❌ Cancelado'}
            </span>
            ${t.status === 'pendente' ? `
            <button class="btn-primary btn-sm" data-action="confirmar" data-id="${t.id}">✅ Confirmar</button>
            <button class="btn-danger btn-sm"  data-action="cancelar"  data-id="${t.id}">❌ Cancelar</button>
            ` : `<span style="font-size:11px;color:#94a3b8">${t.confirmado_em ? 'em ' + fmtData(t.confirmado_em) : ''}</span>`}
        </div>
    </div>`

    return `
    <div class="page-header">
        <h1>✈️ Translados</h1>
    </div>

    <h3 style="font-size:15px;font-weight:600;color:#0f2b4f;margin-bottom:12px">
        Pendentes (${pendentes.length})
    </h3>

    ${pendentes.length
        ? pendentes.map(cardTranslado).join('')
        : '<div class="card"><div class="empty-state"><div class="empty-icon">✅</div><p>Nenhum translado pendente.</p></div></div>'}

    ${historico.length ? `
    <h3 style="font-size:15px;font-weight:600;color:#64748b;margin:24px 0 12px">
        Histórico (${historico.length})
    </h3>
    ${historico.map(cardTranslado).join('')}` : ''}`
}

export function bindTranslados() {
    document.querySelectorAll('[data-action="confirmar"]').forEach(btn =>
        btn.addEventListener('click', () => atualizarTranslado(btn.dataset.id, 'confirmado')))

    document.querySelectorAll('[data-action="cancelar"]').forEach(btn =>
        btn.addEventListener('click', () => atualizarTranslado(btn.dataset.id, 'cancelado')))
}

async function atualizarTranslado(id, status) {
    const acao = status === 'confirmado' ? 'confirmar' : 'cancelar'
    if (!confirm(`Deseja ${acao} este translado?`)) return

    const payload = {
        status,
        confirmado_em: status === 'confirmado' ? new Date().toISOString() : null,
    }

    const { error } = await supabase
        .from('translados')
        .update(payload)
        .eq('id', id)
        .eq('tenant_id', TENANT_ID)

    if (error) { toast(error.message, 'error'); return }

    toast(status === 'confirmado' ? 'Translado confirmado!' : 'Translado cancelado.', 'success')

    const el = document.getElementById('page-content')
    el.innerHTML = await renderTranslados()
    bindTranslados()
}

function fmtData(str) {
    if (!str) return '—'
    return new Date(str + 'T00:00:00').toLocaleDateString('pt-BR')
}
