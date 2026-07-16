// pages/adicionais.js
import { supabase, TENANT_ID, abrirModal, toast, initSortable } from '../admin.js'

export async function renderAdicionais() {
    const { data: adds, error } = await supabase
        .from('adicionais')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .order('ordem')

    if (error) throw error

    const linhas = (adds ?? []).map(a => `
    <tr>
        <td class="td-name">${a.nome}${a.is_cadeirinha ? ' <span class="td-badge" style="font-size:10px">🪑</span>' : ''}</td>
        <td class="td-price">R$ ${a.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td><span class="td-badge ${a.tipo_preco}">${a.tipo_preco === 'per_day' ? 'Por dia' : 'Fixo'}</span></td>
        <td style="text-align:center">${a.permite_quantidade ? '✅' : '—'}</td>
        <td style="text-align:center">${a.estoque ?? '∞'}</td>
        <td style="font-size:12px;color:#64748b">${(a.descricao ?? '').substring(0, 40)}</td>
        <td class="actions">
            <button class="btn-icon" data-action="editar" data-id="${a.id}">✏️ Editar</button>
            <button class="btn-danger" data-action="excluir" data-id="${a.id}" data-nome="${a.nome}">🗑️</button>
        </td>
    </tr>`).join('')

    return `
    <div class="page-header">
        <h1>➕ Adicionais</h1>
        <button class="btn-primary" id="btn-novo-adicional">+ Novo Adicional</button>
    </div>
    <div class="card">
        <div class="table-wrap">
            ${adds?.length ? `
            <table>
                <thead><tr>
                    <th data-sort="text">Nome</th><th data-sort="num">Preço</th><th data-sort="text">Tipo</th><th style="text-align:center">Qtd?</th><th data-sort="num" style="text-align:center">Estoque</th><th>Descrição</th><th>Ações</th>
                </tr></thead>
                <tbody>${linhas}</tbody>
            </table>` : `
            <div class="empty-state">
                <div class="empty-icon">➕</div>
                <p>Nenhum adicional cadastrado.</p>
            </div>`}
        </div>
    </div>`
}

export function bindAdicionais() {
    document.getElementById('btn-novo-adicional')?.addEventListener('click', () => abrirForm())

    document.querySelectorAll('[data-action="editar"]').forEach(btn =>
        btn.addEventListener('click', () => abrirForm(btn.dataset.id)))

    document.querySelectorAll('[data-action="excluir"]').forEach(btn =>
        btn.addEventListener('click', () => excluir(btn.dataset.id, btn.dataset.nome)))

    initSortable(document.querySelector('.table-wrap table'))
}

async function abrirForm(id = null) {
    let a = null
    if (id) {
        const { data } = await supabase.from('adicionais').select('*').eq('id', id).single()
        a = data
    }

    const corpo = `
    <div class="form-grid">
        <div class="form-group full">
            <label>Nome</label>
            <input type="text" id="f-nome" value="${a?.nome ?? ''}" placeholder="Ex: GPS PORTÁTIL">
        </div>
        <div class="form-group">
            <label>Preço (R$)</label>
            <input type="number" id="f-preco" value="${a?.preco ?? ''}" step="0.01" min="0" placeholder="0,00">
        </div>
        <div class="form-group">
            <label>Tipo de Cobrança</label>
            <select id="f-tipo">
                <option value="per_day" ${a?.tipo_preco === 'per_day' ? 'selected' : ''}>Por dia</option>
                <option value="fixed"   ${a?.tipo_preco === 'fixed'   ? 'selected' : ''}>Valor fixo</option>
            </select>
        </div>
        <div class="form-group" id="grupo-regra-hora-extra" style="${a?.tipo_preco === 'per_day' ? '' : 'display:none'}">
            <label>Cobrança de Hora Extra</label>
            <select id="f-regra-hora-extra">
                <option value="proporcional" ${(a?.regra_hora_extra ?? 'proporcional') === 'proporcional' ? 'selected' : ''}>Proporcional (fração da diária, regra padrão)</option>
                <option value="integral_apos_tolerancia" ${a?.regra_hora_extra === 'integral_apos_tolerancia' ? 'selected' : ''}>Diária integral após 1h de tolerância</option>
            </select>
        </div>
        <div class="form-group">
            <label>Estoque (vazio = ilimitado)</label>
            <input type="number" id="f-estoque" value="${a?.estoque ?? ''}" min="0" placeholder="ilimitado">
        </div>
        <div class="form-group">
            <label>Ordem</label>
            <input type="number" id="f-ordem" value="${a?.ordem ?? 0}" min="0">
        </div>
        <div class="form-group full">
            <label>Descrição</label>
            <textarea id="f-desc" rows="3" placeholder="Descreva o adicional...">${a?.descricao ?? ''}</textarea>
        </div>
        <div class="form-group full">
            <div class="checkbox-row">
                <input type="checkbox" id="f-qtd" ${a?.permite_quantidade ? 'checked' : ''}>
                <span>Permite selecionar quantidade (ex: cadeirinhas)</span>
            </div>
        </div>
        <div class="form-group full">
            <div class="checkbox-row">
                <input type="checkbox" id="f-cad" ${a?.is_cadeirinha ? 'checked' : ''}>
                <span>É cadeirinha (conta no limite por categoria)</span>
            </div>
        </div>
        <div class="form-group full">
            <div class="checkbox-row">
                <input type="checkbox" id="f-ativo" ${(a?.ativo ?? true) ? 'checked' : ''}>
                <span>Adicional ativo</span>
            </div>
        </div>
    </div>`

    abrirModal(id ? `✏️ Editar — ${a.nome}` : '➕ Novo Adicional', corpo, async () => {
        const nome  = document.getElementById('f-nome').value.trim()
        const preco = parseFloat(document.getElementById('f-preco').value)

        if (!nome || isNaN(preco) || preco < 0) {
            toast('Preencha nome e preço.', 'error')
            return false
        }

        const estoqueVal = document.getElementById('f-estoque').value
        const payload = {
            tenant_id:         TENANT_ID,
            nome,
            preco,
            tipo_preco:        document.getElementById('f-tipo').value,
            regra_hora_extra:  document.getElementById('f-regra-hora-extra').value,
            estoque:           estoqueVal !== '' ? parseInt(estoqueVal) : null,
            ordem:             parseInt(document.getElementById('f-ordem').value) || 0,
            descricao:         document.getElementById('f-desc').value.trim() || null,
            permite_quantidade: document.getElementById('f-qtd').checked,
            is_cadeirinha:     document.getElementById('f-cad').checked,
            ativo:             document.getElementById('f-ativo').checked,
        }

        const { error } = id
            ? await supabase.from('adicionais').update(payload).eq('id', id)
            : await supabase.from('adicionais').insert(payload)

        if (error) { toast(error.message, 'error'); return false }
    })

    // "Cobrança de Hora Extra" só faz sentido para tipo_preco='per_day'.
    const tipoEl = document.getElementById('f-tipo')
    const grupoRegra = document.getElementById('grupo-regra-hora-extra')
    tipoEl.addEventListener('change', () => {
        grupoRegra.style.display = tipoEl.value === 'per_day' ? '' : 'none'
    })
}

async function excluir(id, nome) {
    if (!confirm(`Excluir "${nome}"?`)) return
    const { error } = await supabase.from('adicionais').delete().eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    toast(`"${nome}" excluído.`, 'success')
    const el = document.getElementById('page-content')
    el.innerHTML = await renderAdicionais()
    bindAdicionais()
}
