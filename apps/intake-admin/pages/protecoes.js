// pages/protecoes.js
import { supabase, TENANT_ID, abrirModal, toast, initSortable } from '../admin.js'

export async function renderProtecoes() {
    const { data: prot, error } = await supabase
        .from('protecoes')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .order('ordem')

    if (error) throw error

    const linhas = (prot ?? []).map(p => `
    <tr>
        <td class="td-name">${p.nome}</td>
        <td class="td-price">R$ ${p.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td><span class="td-badge ${p.tipo_preco}">${p.tipo_preco === 'per_day' ? 'Por dia' : 'Fixo'}</span></td>
        <td style="font-size:12px;color:#64748b;max-width:280px">${(p.descricao ?? '').substring(0, 80)}${p.descricao?.length > 80 ? '...' : ''}</td>
        <td class="actions">
            <button class="btn-icon" data-action="editar" data-id="${p.id}">✏️ Editar</button>
            <button class="btn-danger" data-action="excluir" data-id="${p.id}" data-nome="${p.nome}">🗑️</button>
        </td>
    </tr>`).join('')

    return `
    <div class="page-header">
        <h1>🛡️ Proteções</h1>
        <button class="btn-primary" id="btn-nova-protecao">+ Nova Proteção</button>
    </div>
    <div class="card">
        <div class="table-wrap">
            ${prot?.length ? `
            <table>
                <thead><tr>
                    <th data-sort="text">Nome</th><th data-sort="num">Preço</th><th data-sort="text">Tipo</th><th>Descrição</th><th>Ações</th>
                </tr></thead>
                <tbody>${linhas}</tbody>
            </table>` : `
            <div class="empty-state">
                <div class="empty-icon">🛡️</div>
                <p>Nenhuma proteção cadastrada.</p>
            </div>`}
        </div>
    </div>`
}

export function bindProtecoes() {
    document.getElementById('btn-nova-protecao')?.addEventListener('click', () => abrirForm())

    document.querySelectorAll('[data-action="editar"]').forEach(btn =>
        btn.addEventListener('click', () => abrirForm(btn.dataset.id)))

    document.querySelectorAll('[data-action="excluir"]').forEach(btn =>
        btn.addEventListener('click', () => excluir(btn.dataset.id, btn.dataset.nome)))

    initSortable(document.querySelector('.table-wrap table'))
}

async function abrirForm(id = null) {
    let p = null
    if (id) {
        const { data } = await supabase.from('protecoes').select('*').eq('id', id).single()
        p = data
    }

    const corpo = `
    <div class="form-grid">
        <div class="form-group full">
            <label>Nome</label>
            <input type="text" id="f-nome" value="${p?.nome ?? ''}" placeholder="Ex: PROTEÇÃO TOTAL">
        </div>
        <div class="form-group">
            <label>Preço (R$)</label>
            <input type="number" id="f-preco" value="${p?.preco ?? ''}" step="0.01" min="0" placeholder="0,00">
        </div>
        <div class="form-group">
            <label>Tipo de Cobrança</label>
            <select id="f-tipo">
                <option value="per_day" ${p?.tipo_preco === 'per_day' ? 'selected' : ''}>Por dia</option>
                <option value="fixed"   ${p?.tipo_preco === 'fixed'   ? 'selected' : ''}>Valor fixo</option>
            </select>
        </div>
        <div class="form-group">
            <label>Franquia / Participação</label>
            <input type="text" id="f-franquia" value="${p?.franquia ?? ''}" placeholder="Ex: até 20% do valor FIPE">
        </div>
        <div class="form-group">
            <label>Pré-autorização (R$)</label>
            <input type="number" id="f-preauth" value="${p?.pre_autorizacao ?? ''}" step="0.01" min="0" placeholder="0,00">
        </div>
        <div class="form-group">
            <label>Ordem</label>
            <input type="number" id="f-ordem" value="${p?.ordem ?? 0}" min="0">
        </div>
        <div class="form-group full">
            <label>Descrição</label>
            <textarea id="f-desc" rows="5" placeholder="Descreva as coberturas...">${p?.descricao ?? ''}</textarea>
        </div>
        <div class="form-group full">
            <div class="checkbox-row">
                <input type="checkbox" id="f-ativo" ${(p?.ativo ?? true) ? 'checked' : ''}>
                <span>Proteção ativa</span>
            </div>
        </div>
    </div>`

    abrirModal(id ? `✏️ Editar — ${p.nome}` : '🛡️ Nova Proteção', corpo, async () => {
        const nome  = document.getElementById('f-nome').value.trim()
        const preco = parseFloat(document.getElementById('f-preco').value)

        if (!nome || isNaN(preco) || preco < 0) {
            toast('Preencha nome e preço.', 'error')
            return false
        }

        const payload = {
            tenant_id:      TENANT_ID,
            nome,
            preco,
            tipo_preco:     document.getElementById('f-tipo').value,
            franquia:       document.getElementById('f-franquia').value.trim() || null,
            pre_autorizacao: parseFloat(document.getElementById('f-preauth').value) || null,
            ordem:          parseInt(document.getElementById('f-ordem').value) || 0,
            descricao:      document.getElementById('f-desc').value.trim() || null,
            ativo:          document.getElementById('f-ativo').checked,
        }

        const { error } = id
            ? await supabase.from('protecoes').update(payload).eq('id', id)
            : await supabase.from('protecoes').insert(payload)

        if (error) { toast(error.message, 'error'); return false }
    })
}

async function excluir(id, nome) {
    if (!confirm(`Excluir "${nome}"?`)) return
    const { error } = await supabase.from('protecoes').delete().eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    toast(`"${nome}" excluída.`, 'success')
    const el = document.getElementById('page-content')
    el.innerHTML = await renderProtecoes()
    bindProtecoes()
}
