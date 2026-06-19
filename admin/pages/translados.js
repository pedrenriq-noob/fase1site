// pages/translados.js
import { supabase, TENANT_ID, toast } from '../admin.js'

export async function renderTranslados() {
    const { data: reservas, error } = await supabase
        .from('solicitacoes')
        .select(`
            id, numero_voo, horario_pouso, companhia_aerea, pessoas, status,
            cliente_nome, cliente_whatsapp, criado_em, observacoes,
            data_retirada, local_retirada,
            categorias ( nome )
        `)
        .eq('tenant_id', TENANT_ID)
        .not('numero_voo', 'is', null)
        .order('criado_em', { ascending: false })

    if (error) throw error

    const STATUS_TRANSLADO = {
        solicitada: 'pendente',
        em_analise: 'pendente',
        confirmada: 'confirmado',
        concluida:  'confirmado',
        cancelada:  'cancelado',
    }

    const pendentes = (reservas ?? []).filter(r => ['solicitada','em_analise'].includes(r.status))
    const historico = (reservas ?? []).filter(r => !['solicitada','em_analise'].includes(r.status))

    const cardTranslado = (r) => {
        const tStatus = STATUS_TRANSLADO[r.status] ?? 'pendente'
        const isPendente = tStatus === 'pendente'
        return `
    <div class="translado-card ${tStatus}" data-id="${r.id}">
        <div class="translado-info">
            <strong>✈️ ${r.companhia_aerea ? r.companhia_aerea + ' · ' : ''}Voo ${r.numero_voo}</strong>
            <span>🛬 Pouso: ${r.horario_pouso ?? '—'} · Retirada: ${fmtDt(r.data_retirada)}</span>
            <span>👤 ${r.cliente_nome ?? '—'} · ${r.cliente_whatsapp ?? '—'}</span>
            <span>🚗 ${r.categorias?.nome ?? '—'}</span>
            <span>👥 ${r.pessoas ?? 1} pessoa${(r.pessoas ?? 1) !== 1 ? 's' : ''}</span>
            <span>📍 ${r.local_retirada ?? '—'}</span>
            ${r.observacoes ? `<span style="font-size:12px;color:#64748b">📝 ${r.observacoes}</span>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
            <span class="status-badge status-${r.status === 'confirmada' || r.status === 'concluida' ? 'confirmada' : r.status === 'cancelada' ? 'cancelada' : 'solicitada'}">
                ${isPendente ? '⏳ Pendente' : tStatus === 'confirmado' ? '✅ Confirmado' : '❌ Cancelado'}
            </span>
            <span style="font-size:11px;color:#94a3b8">Reserva: ${r.status}</span>
        </div>
    </div>`
    }

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
    // status gerenciado pela página de Reservas — sem ações diretas aqui
}

function fmtDt(str) {
    if (!str) return '—'
    return new Date(str).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}
