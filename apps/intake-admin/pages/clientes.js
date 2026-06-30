// pages/clientes.js
import { supabase, TENANT_ID } from '../admin.js'

export async function renderClientes() {
    const { data: clientes, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, whatsapp, cpf, criado_em, role')
        .eq('tenant_id', TENANT_ID)
        .eq('role', 'cliente')
        .order('criado_em', { ascending: false })

    if (error) throw error

    const linhas = (clientes ?? []).map(c => `
    <tr>
        <td class="td-name">${c.nome}</td>
        <td>${c.email}</td>
        <td>${c.whatsapp ?? '—'}</td>
        <td>${c.cpf ?? '—'}</td>
        <td style="font-size:12px">${new Date(c.criado_em).toLocaleDateString('pt-BR')}</td>
    </tr>`).join('')

    return `
    <div class="page-header">
        <h1>👥 Clientes</h1>
    </div>
    <div class="card">
        <div class="table-wrap">
            ${clientes?.length ? `
            <table>
                <thead><tr>
                    <th>Nome</th><th>E-mail</th><th>WhatsApp</th><th>CPF</th><th>Cadastro</th>
                </tr></thead>
                <tbody>${linhas}</tbody>
            </table>` : `
            <div class="empty-state">
                <div class="empty-icon">👥</div>
                <p>Nenhum cliente cadastrado ainda.</p>
                <p style="margin-top:8px;font-size:12px">Os clientes aparecem aqui ao fazer login na área do cliente.</p>
            </div>`}
        </div>
    </div>`
}
