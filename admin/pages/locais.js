// pages/locais.js
import { supabase, TENANT_ID, abrirModal, toast } from '../admin.js'
import { registrarAuditoria } from './auditoria.js'

const fmt = t => t ? t.slice(0, 5) : '—'

export async function renderLocais() {
    const { data: locais, error } = await supabase
        .from('locais')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .order('ordem')

    if (error) throw error

    const linhas = (locais ?? []).map(l => {
        const retH  = l.hora_retirada_inicio  ? `${fmt(l.hora_retirada_inicio)} – ${fmt(l.hora_retirada_fim)}`   : '24h'
        const devH  = l.hora_devolucao_inicio ? `${fmt(l.hora_devolucao_inicio)} – ${fmt(l.hora_devolucao_fim)}` : '24h'
        const badges = []
        if (l.permite_retirada)  badges.push(`<span class="td-badge">Retirada ${retH}</span>`)
        if (l.permite_devolucao) badges.push(`<span class="td-badge">Devolução ${devH}</span>`)
        if (l.is_aeroporto)      badges.push(`<span class="td-badge per_day">✈ Aeroporto</span>`)
        return `
        <tr>
            <td style="width:36px;font-size:20px;text-align:center">${l.is_aeroporto ? '✈️' : '📍'}</td>
            <td class="td-name">${l.nome}</td>
            <td>${badges.join(' ')}</td>
            <td style="text-align:center">${l.disponivel_domingo ? '✅ Sim' : '❌ Não'}</td>
            <td><span class="td-badge ${l.ativo ? 'per_day' : ''}">${l.ativo ? 'Ativo' : 'Inativo'}</span></td>
            <td class="actions">
                <button class="btn-icon" data-action="editar" data-id="${l.id}">✏️ Editar</button>
                <button class="btn-danger" data-action="excluir" data-id="${l.id}" data-nome="${l.nome}">🗑️</button>
            </td>
        </tr>`
    }).join('')

    return `
    <div class="page-header">
        <div>
            <h1>📍 Locais de Atendimento</h1>
            <p style="color:var(--muted);font-size:13px;margin-top:4px">Configure os endereços, horários e regras de cada ponto de retirada/devolução.</p>
        </div>
        <button class="btn-primary" id="btn-novo-local">+ Novo Local</button>
    </div>
    <div class="card">
        <div class="table-wrap">
            ${locais?.length ? `
            <table>
                <thead><tr>
                    <th></th>
                    <th>Nome / Endereço</th>
                    <th>Horários</th>
                    <th style="text-align:center">Domingo</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr></thead>
                <tbody>${linhas}</tbody>
            </table>` : `
            <div class="empty-state">
                <div class="empty-icon">📍</div>
                <p>Nenhum local cadastrado.</p>
                <p style="margin-top:8px;font-size:12px">Execute o arquivo sql/010_locais.sql no Supabase para criar a tabela e os dados iniciais.</p>
            </div>`}
        </div>
    </div>
    <div class="card" style="margin-top:16px;background:#fffbeb;border:1.5px solid #fbbf24">
        <div style="padding:4px 0;font-size:13px;color:#78350f;line-height:1.7">
            <strong>ℹ️ Como funcionam as regras:</strong><br>
            • <strong>Horário de retirada/devolução:</strong> fora desse intervalo, o local não aparece como opção para o cliente.<br>
            • <strong>Disponível domingo:</strong> desmarcado = local não aparece quando a data escolhida cair num domingo.<br>
            • <strong>É aeroporto:</strong> quando o cliente escolhe este local para devolução, o adicional de devolução no aeroporto é marcado automaticamente.
        </div>
    </div>`
}

export function bindLocais() {
    document.getElementById('btn-novo-local')?.addEventListener('click', () => abrirFormLocal())

    document.querySelectorAll('[data-action="editar"]').forEach(btn => {
        btn.addEventListener('click', () => abrirFormLocal(btn.dataset.id))
    })

    document.querySelectorAll('[data-action="excluir"]').forEach(btn => {
        btn.addEventListener('click', () => excluirLocal(btn.dataset.id, btn.dataset.nome))
    })
}

async function abrirFormLocal(id = null) {
    let l = null
    if (id) {
        const { data } = await supabase.from('locais').select('*').eq('id', id).single()
        l = data
    }

    const v = (field, fallback = '') => l?.[field] ?? fallback
    const t = (field, fallback = '') => {
        const val = l?.[field]
        return val ? val.slice(0, 5) : fallback
    }

    const corpo = `
    <div class="form-grid">
        <div class="form-group full">
            <label>Nome / Endereço *</label>
            <input type="text" id="f-nome" value="${v('nome')}" placeholder="Ex: Av. Brasil, 90 — Centro">
        </div>
        <div class="form-group">
            <label>Ordem de exibição</label>
            <input type="number" id="f-ordem" value="${v('ordem', 0)}" min="0">
        </div>
        <div class="form-group" style="display:flex;align-items:center;gap:12px;padding-top:24px">
            <input type="checkbox" id="f-ativo" ${v('ativo', true) ? 'checked' : ''}>
            <label for="f-ativo" style="margin:0">Local ativo</label>
        </div>

        <div class="form-group full" style="border-top:1.5px solid var(--border);padding-top:16px;margin-top:4px">
            <strong style="font-size:13px;color:var(--text)">Retirada</strong>
        </div>
        <div class="form-group" style="display:flex;align-items:center;gap:12px">
            <input type="checkbox" id="f-permite-ret" ${v('permite_retirada', true) ? 'checked' : ''} onchange="document.getElementById('ret-horas').style.display=this.checked?'':'none'">
            <label for="f-permite-ret" style="margin:0">Permite retirada</label>
        </div>
        <div class="form-group" style="display:flex;align-items:center;gap:12px;padding-top:24px">
            <input type="checkbox" id="f-dom" ${v('disponivel_domingo', true) ? 'checked' : ''}>
            <label for="f-dom" style="margin:0">Disponível aos domingos</label>
        </div>
        <div id="ret-horas" class="form-group full" style="${v('permite_retirada', true) ? '' : 'display:none'}">
            <label>Horário de retirada (deixe em branco para 24h)</label>
            <div style="display:flex;align-items:center;gap:12px">
                <input type="time" id="f-ret-ini" value="${t('hora_retirada_inicio')}" style="width:auto">
                <span style="color:var(--muted)">até</span>
                <input type="time" id="f-ret-fim" value="${t('hora_retirada_fim')}" style="width:auto">
            </div>
        </div>

        <div class="form-group full" style="border-top:1.5px solid var(--border);padding-top:16px;margin-top:4px">
            <strong style="font-size:13px;color:var(--text)">Devolução</strong>
        </div>
        <div class="form-group" style="display:flex;align-items:center;gap:12px">
            <input type="checkbox" id="f-permite-dev" ${v('permite_devolucao', true) ? 'checked' : ''} onchange="document.getElementById('dev-horas').style.display=this.checked?'':'none'">
            <label for="f-permite-dev" style="margin:0">Permite devolução</label>
        </div>
        <div class="form-group" style="display:flex;align-items:center;gap:12px;padding-top:24px">
            <input type="checkbox" id="f-aeroporto" ${v('is_aeroporto', false) ? 'checked' : ''}>
            <label for="f-aeroporto" style="margin:0">✈️ É aeroporto (ativa addon automaticamente)</label>
        </div>
        <div id="dev-horas" class="form-group full" style="${v('permite_devolucao', true) ? '' : 'display:none'}">
            <label>Horário de devolução (deixe em branco para 24h)</label>
            <div style="display:flex;align-items:center;gap:12px">
                <input type="time" id="f-dev-ini" value="${t('hora_devolucao_inicio')}" style="width:auto">
                <span style="color:var(--muted)">até</span>
                <input type="time" id="f-dev-fim" value="${t('hora_devolucao_fim')}" style="width:auto">
            </div>
        </div>
    </div>`

    abrirModal(id ? `✏️ Editar — ${l.nome}` : '📍 Novo Local', corpo, async () => {
        const nome = document.getElementById('f-nome').value.trim()
        if (!nome) { toast('Informe o nome do local.', 'error'); return false }

        const retIni = document.getElementById('f-ret-ini').value || null
        const retFim = document.getElementById('f-ret-fim').value || null
        const devIni = document.getElementById('f-dev-ini').value || null
        const devFim = document.getElementById('f-dev-fim').value || null

        const permRet = document.getElementById('f-permite-ret').checked
        const permDev = document.getElementById('f-permite-dev').checked

        if (permRet && (!!retIni !== !!retFim)) {
            toast('Informe início E fim do horário de retirada, ou deixe os dois em branco para 24h.', 'error'); return false
        }
        if (permDev && (!!devIni !== !!devFim)) {
            toast('Informe início E fim do horário de devolução, ou deixe os dois em branco para 24h.', 'error'); return false
        }

        const payload = {
            tenant_id:              TENANT_ID,
            nome,
            permite_retirada:       permRet,
            permite_devolucao:      permDev,
            hora_retirada_inicio:   permRet ? retIni : null,
            hora_retirada_fim:      permRet ? retFim : null,
            hora_devolucao_inicio:  permDev ? devIni : null,
            hora_devolucao_fim:     permDev ? devFim : null,
            disponivel_domingo:     document.getElementById('f-dom').checked,
            is_aeroporto:           document.getElementById('f-aeroporto').checked,
            ordem:                  parseInt(document.getElementById('f-ordem').value) || 0,
            ativo:                  document.getElementById('f-ativo').checked,
        }

        const { error } = id
            ? await supabase.from('locais').update(payload).eq('id', id)
            : await supabase.from('locais').insert(payload)

        if (error) { toast(error.message, 'error'); return false }

        await registrarAuditoria(
            id ? 'atualizar' : 'criar', 'local', id ?? null,
            id ? `Local "${nome}" atualizado` : `Local "${nome}" criado`,
            id ? l : null, payload
        )
    })
}

async function excluirLocal(id, nome) {
    if (!confirm(`Excluir "${nome}"?\nEsta ação não pode ser desfeita.`)) return

    const { data: antes } = await supabase.from('locais').select('*').eq('id', id).single()
    const { error } = await supabase.from('locais').delete().eq('id', id)
    if (error) { toast(error.message, 'error'); return }

    await registrarAuditoria('excluir', 'local', id, `Local "${nome}" excluído`, antes, null)
    toast(`"${nome}" excluído.`, 'success')

    const el = document.getElementById('page-content')
    el.innerHTML = await renderLocais()
    bindLocais()
}
