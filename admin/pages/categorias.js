// pages/categorias.js
import { supabase, TENANT_ID, abrirModal, toast } from '../admin.js'

export async function renderCategorias() {
    const { data: cats, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .order('ordem')

    if (error) throw error

    const linhas = (cats ?? []).map(c => `
    <tr>
        <td>
            ${c.imagem_url ? `<img src="${c.imagem_url}" alt="${c.nome}" style="width:48px;height:36px;object-fit:cover;border-radius:4px;display:block">` : '<div style="width:48px;height:36px;background:#f1f5f9;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:18px">🚗</div>'}
        </td>
        <td class="td-name">${c.nome}</td>
        <td class="td-price">R$ ${c.preco_diaria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<small>/dia</small></td>
        <td><span class="td-badge">${c.transmissao === 'manual' ? 'Manual' : 'Automático'}</span></td>
        <td style="text-align:center">${c.quantidade_frota}</td>
        <td>${c.max_pessoas} pax · ${c.max_cadeirinhas} cad.</td>
        <td><span class="td-badge ${c.ativo ? 'per_day' : ''}">${c.ativo ? 'Ativo' : 'Inativo'}</span></td>
        <td class="actions">
            <button class="btn-icon" data-action="editar" data-id="${c.id}">✏️ Editar</button>
            <button class="btn-danger" data-action="excluir" data-id="${c.id}" data-nome="${c.nome}">🗑️</button>
        </td>
    </tr>`).join('')

    return `
    <div class="page-header">
        <h1>🚗 Veículos</h1>
        <button class="btn-primary" id="btn-nova-categoria">+ Nova Categoria</button>
    </div>
    <div class="card">
        <div class="table-wrap">
            ${cats?.length ? `
            <table>
                <thead><tr>
                    <th>Imagem</th><th>Nome</th><th>Preço/Dia</th><th>Câmbio</th><th style="text-align:center">Frota</th><th>Capacidade</th><th>Status</th><th>Ações</th>
                </tr></thead>
                <tbody>${linhas}</tbody>
            </table>` : `
            <div class="empty-state">
                <div class="empty-icon">🚗</div>
                <p>Nenhuma categoria cadastrada.</p>
                <p style="margin-top:8px;font-size:12px">Execute o seed.sql para carregar os dados iniciais.</p>
            </div>`}
        </div>
    </div>`
}

export function bindCategorias() {
    document.getElementById('btn-nova-categoria')?.addEventListener('click', () => abrirFormCategoria())

    document.querySelectorAll('[data-action="editar"]').forEach(btn => {
        btn.addEventListener('click', () => abrirFormCategoria(btn.dataset.id))
    })

    document.querySelectorAll('[data-action="excluir"]').forEach(btn => {
        btn.addEventListener('click', () => excluirCategoria(btn.dataset.id, btn.dataset.nome))
    })
}

async function abrirFormCategoria(id = null) {
    let cat = null

    if (id) {
        const { data } = await supabase.from('categorias').select('*').eq('id', id).single()
        cat = data
    }

    const corpo = `
    <div class="form-grid">
        <div class="form-group full">
            <label>Nome / Grupo</label>
            <input type="text" id="f-nome" value="${cat?.nome ?? ''}" placeholder="Ex: GRUPO K">
        </div>
        <div class="form-group">
            <label>Slug</label>
            <input type="text" id="f-slug" value="${cat?.slug ?? ''}" placeholder="Ex: grupo_k" ${id ? 'readonly style="background:#f8fafc"' : ''}>
        </div>
        <div class="form-group">
            <label>Preço por Dia (R$)</label>
            <input type="number" id="f-preco" value="${cat?.preco_diaria ?? ''}" step="0.01" min="0" placeholder="0,00">
        </div>
        <div class="form-group">
            <label>Câmbio</label>
            <select id="f-transmissao">
                <option value="manual"    ${cat?.transmissao === 'manual'    ? 'selected' : ''}>Manual</option>
                <option value="automatico" ${cat?.transmissao === 'automatico' ? 'selected' : ''}>Automático</option>
            </select>
        </div>
        <div class="form-group">
            <label>Máx. Pessoas</label>
            <select id="f-max-pessoas">
                <option value="5" ${(cat?.max_pessoas ?? 5) == 5 ? 'selected' : ''}>5 pessoas</option>
                <option value="7" ${cat?.max_pessoas == 7 ? 'selected' : ''}>7 pessoas</option>
            </select>
        </div>
        <div class="form-group">
            <label>Máx. Cadeirinhas</label>
            <select id="f-max-cad">
                <option value="2" ${(cat?.max_cadeirinhas ?? 2) == 2 ? 'selected' : ''}>2 cadeirinhas</option>
                <option value="4" ${cat?.max_cadeirinhas == 4 ? 'selected' : ''}>4 cadeirinhas</option>
            </select>
        </div>
        <div class="form-group">
            <label>Qtd. na Frota</label>
            <input type="number" id="f-frota" value="${cat?.quantidade_frota ?? 1}" min="1">
        </div>
        <div class="form-group">
            <label>Ordem</label>
            <input type="number" id="f-ordem" value="${cat?.ordem ?? 0}" min="0">
        </div>
        <div class="form-group full">
            <label>Descrição</label>
            <textarea id="f-desc" rows="3" placeholder="Descreva o grupo de veículos...">${cat?.descricao ?? ''}</textarea>
        </div>
        <div class="form-group full">
            <label>URL da Imagem</label>
            <input type="text" id="f-imagem" value="${cat?.imagem_url ?? ''}" placeholder="https://... ou deixe em branco">
        </div>
        <div class="form-group full">
            <div class="checkbox-row">
                <input type="checkbox" id="f-ativo" ${(cat?.ativo ?? true) ? 'checked' : ''}>
                <span>Categoria ativa (visível no site)</span>
            </div>
        </div>
    </div>`

    abrirModal(id ? `✏️ Editar — ${cat.nome}` : '🚗 Nova Categoria', corpo, async () => {
        const nome  = document.getElementById('f-nome').value.trim()
        const slug  = document.getElementById('f-slug').value.trim().toLowerCase().replace(/\s+/g, '_')
        const preco = parseFloat(document.getElementById('f-preco').value)

        if (!nome || !slug || isNaN(preco) || preco < 0) {
            toast('Preencha nome, slug e preço corretamente.', 'error')
            return false
        }

        const payload = {
            tenant_id:        TENANT_ID,
            slug,
            nome,
            preco_diaria:     preco,
            transmissao:      document.getElementById('f-transmissao').value,
            max_pessoas:      parseInt(document.getElementById('f-max-pessoas').value),
            max_cadeirinhas:  parseInt(document.getElementById('f-max-cad').value),
            quantidade_frota: parseInt(document.getElementById('f-frota').value) || 1,
            ordem:            parseInt(document.getElementById('f-ordem').value) || 0,
            descricao:        document.getElementById('f-desc').value.trim() || null,
            imagem_url:       document.getElementById('f-imagem').value.trim() || null,
            ativo:            document.getElementById('f-ativo').checked,
        }

        const { error } = id
            ? await supabase.from('categorias').update(payload).eq('id', id)
            : await supabase.from('categorias').insert(payload)

        if (error) { toast(error.message, 'error'); return false }
    })
}

async function excluirCategoria(id, nome) {
    if (!confirm(`Excluir "${nome}"?\nEsta ação não pode ser desfeita.`)) return

    const { error } = await supabase.from('categorias').delete().eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    toast(`"${nome}" excluída.`, 'success')

    const el = document.getElementById('page-content')
    el.innerHTML = await renderCategorias()
    bindCategorias()
}
