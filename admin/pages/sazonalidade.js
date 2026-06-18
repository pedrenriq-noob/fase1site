// pages/sazonalidade.js
import { supabase, TENANT_ID, abrirModal, toast } from '../admin.js'

export async function renderSazonalidade() {
    const [{ data: periodos }, { data: cats }] = await Promise.all([
        supabase.from('sazonalidade').select('*').eq('tenant_id', TENANT_ID).order('data_inicio'),
        supabase.from('categorias').select('id, slug, nome, preco_diaria').eq('tenant_id', TENANT_ID).eq('ativo', true).order('ordem')
    ])

    const hoje = new Date().toISOString().slice(0, 10)

    const linhas = (periodos ?? []).map(s => {
        const ativo   = hoje >= s.data_inicio && hoje <= s.data_fim
        const qtdCats = Object.keys(s.precos ?? {}).length
        return `
        <tr>
            <td class="td-name">
                ${s.nome}
                ${ativo ? '<span class="td-badge per_day" style="margin-left:8px;font-size:10px">🟢 Ativa</span>' : ''}
            </td>
            <td>${fmtData(s.data_inicio)}</td>
            <td>${fmtData(s.data_fim)}</td>
            <td>${qtdCats} categoria${qtdCats !== 1 ? 's' : ''} configurada${qtdCats !== 1 ? 's' : ''}</td>
            <td class="actions">
                <button class="btn-icon" data-action="editar" data-id="${s.id}">✏️ Editar</button>
                <button class="btn-danger" data-action="excluir" data-id="${s.id}" data-nome="${s.nome}">🗑️</button>
            </td>
        </tr>`
    }).join('')

    // Guarda cats para usar nos modais
    window._sazCats = cats ?? []

    return `
    <div class="page-header">
        <h1>🗓️ Sazonalidade</h1>
        <button class="btn-primary" id="btn-novo-periodo">+ Novo Período</button>
    </div>
    <div class="alert alert-info" style="margin-bottom:20px">
        Configure preços por período para cada grupo de veículo. O sistema aplica o preço sazonal com base na <strong>data de retirada</strong>.
        Categorias sem preço configurado usam o valor padrão da categoria.
    </div>
    <div class="card">
        <div class="table-wrap">
            ${periodos?.length ? `
            <table>
                <thead><tr>
                    <th>Nome</th><th>Início</th><th>Fim</th><th>Configuração</th><th>Ações</th>
                </tr></thead>
                <tbody>${linhas}</tbody>
            </table>` : `
            <div class="empty-state">
                <div class="empty-icon">🗓️</div>
                <p>Nenhum período sazonal cadastrado.</p>
            </div>`}
        </div>
    </div>`
}

export function bindSazonalidade() {
    document.getElementById('btn-novo-periodo')?.addEventListener('click', () => abrirForm())

    document.querySelectorAll('[data-action="editar"]').forEach(btn =>
        btn.addEventListener('click', () => abrirForm(btn.dataset.id)))

    document.querySelectorAll('[data-action="excluir"]').forEach(btn =>
        btn.addEventListener('click', () => excluir(btn.dataset.id, btn.dataset.nome)))
}

async function abrirForm(id = null) {
    let s = null
    if (id) {
        const { data } = await supabase.from('sazonalidade').select('*').eq('id', id).single()
        s = data
    }

    const cats = window._sazCats ?? []
    const inputsPrecos = cats.map(c => {
        const val = s?.precos?.[c.slug] ?? ''
        return `
        <div class="seasonal-cat-row">
            <div>
                <div class="seasonal-cat-name">${c.nome}</div>
                <div class="seasonal-cat-base">Padrão: R$ ${c.preco_diaria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/dia</div>
            </div>
            <input type="number" class="seasonal-price-input" data-slug="${c.slug}"
                   placeholder="${c.preco_diaria.toFixed(2)}" value="${val}" step="0.01" min="0">
        </div>`
    }).join('')

    const corpo = `
    <div class="form-grid">
        <div class="form-group full">
            <label>Nome do Período</label>
            <input type="text" id="f-nome" value="${s?.nome ?? ''}" placeholder="Ex: Alta Temporada Julho 2026">
        </div>
        <div class="form-group">
            <label>Data Início</label>
            <input type="date" id="f-inicio" value="${s?.data_inicio ?? ''}">
        </div>
        <div class="form-group">
            <label>Data Fim</label>
            <input type="date" id="f-fim" value="${s?.data_fim ?? ''}">
        </div>
        <div class="form-group full">
            <label>Preço por Dia — por Categoria (deixe vazio para usar o padrão)</label>
            <div class="seasonal-price-grid">${inputsPrecos}</div>
        </div>
        <div class="form-group full">
            <div class="checkbox-row">
                <input type="checkbox" id="f-ativo" ${(s?.ativo ?? true) ? 'checked' : ''}>
                <span>Período ativo</span>
            </div>
        </div>
    </div>`

    abrirModal(id ? `✏️ Editar — ${s.nome}` : '🗓️ Novo Período Sazonal', corpo, async () => {
        const nome   = document.getElementById('f-nome').value.trim()
        const inicio = document.getElementById('f-inicio').value
        const fim    = document.getElementById('f-fim').value

        if (!nome || !inicio || !fim) { toast('Preencha nome e datas.', 'error'); return false }
        if (inicio > fim) { toast('Data início deve ser anterior ao fim.', 'error'); return false }

        const precos = {}
        document.querySelectorAll('.seasonal-price-input').forEach(inp => {
            const v = inp.value.trim()
            if (v !== '') precos[inp.dataset.slug] = parseFloat(v)
        })

        const payload = {
            tenant_id:   TENANT_ID,
            nome,
            data_inicio: inicio,
            data_fim:    fim,
            precos,
            ativo:       document.getElementById('f-ativo').checked,
        }

        const { error } = id
            ? await supabase.from('sazonalidade').update(payload).eq('id', id)
            : await supabase.from('sazonalidade').insert(payload)

        if (error) { toast(error.message, 'error'); return false }
    })
}

async function excluir(id, nome) {
    if (!confirm(`Excluir o período "${nome}"?`)) return
    const { error } = await supabase.from('sazonalidade').delete().eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    toast('Período excluído.', 'success')
    const el = document.getElementById('page-content')
    el.innerHTML = await renderSazonalidade()
    bindSazonalidade()
}

function fmtData(str) {
    if (!str) return '—'
    const [y, m, d] = str.split('-')
    return `${d}/${m}/${y}`
}
