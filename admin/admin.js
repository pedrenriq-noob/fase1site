// admin.js — controlador principal do painel Igufoz
import { supabase, TENANT_ID } from './supabase.js'
import { renderCategorias, bindCategorias }       from './pages/categorias.js'
import { renderProtecoes, bindProtecoes }         from './pages/protecoes.js'
import { renderAdicionais, bindAdicionais }       from './pages/adicionais.js'
import { renderSazonalidade, bindSazonalidade }   from './pages/sazonalidade.js'
import { renderReservas, bindReservas }           from './pages/reservas.js'
import { renderTranslados, bindTranslados }       from './pages/translados.js'
import { renderDashboard, bindDashboard }          from './pages/dashboard.js'
import { renderLocais, bindLocais }               from './pages/locais.js'
import { renderAuditoria }                        from './pages/auditoria_page.js'

// ============================================================
// AUTH
// ============================================================

async function verificarSessao() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
}

async function login(email, senha) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) throw error
    return data
}

async function logout() {
    await supabase.auth.signOut()
    location.reload()
}

// ============================================================
// NAVEGAÇÃO
// ============================================================

let paginaAtual = 'dashboard'

async function navegar(pagina) {
    paginaAtual = pagina

    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
        el.classList.toggle('active', el.dataset.page === pagina)
    })

    const el = document.getElementById('page-content')
    el.innerHTML = '<div class="loading-page">Carregando...</div>'

    try {
        switch (pagina) {
            case 'dashboard':    el.innerHTML = await renderDashboard();    bindDashboard();    break
            case 'categorias':   el.innerHTML = await renderCategorias();   bindCategorias();   break
            case 'protecoes':    el.innerHTML = await renderProtecoes();    bindProtecoes();    break
            case 'adicionais':   el.innerHTML = await renderAdicionais();   bindAdicionais();   break
            case 'sazonalidade': el.innerHTML = await renderSazonalidade(); bindSazonalidade(); break
            case 'reservas':     el.innerHTML = await renderReservas();     bindReservas();     break
            case 'translados':   el.innerHTML = await renderTranslados();   bindTranslados();   break
            case 'locais':       el.innerHTML = await renderLocais();       bindLocais();       break
            case 'auditoria':   el.innerHTML = await renderAuditoria();    break
            default:             el.innerHTML = '<p>Página não encontrada.</p>'
        }
    } catch (err) {
        console.error('Erro ao carregar página:', err)
        el.innerHTML = `<div class="alert alert-info">Erro ao carregar: ${err.message}</div>`
    }

    window.scrollTo(0, 0)
}

// ============================================================
// MODAL GENÉRICO
// ============================================================

let modalCallback = null

export function abrirModal(titulo, corpo, aoSalvar) {
    document.getElementById('modal-title').textContent = titulo
    document.getElementById('modal-body').innerHTML = corpo
    document.getElementById('modal-overlay').classList.add('open')
    modalCallback = aoSalvar
}

export function fecharModal() {
    document.getElementById('modal-overlay').classList.remove('open')
    modalCallback = null
    document.getElementById('modal-save-btn').style.display = ''
    document.getElementById('modal-cancel-btn').textContent = 'Cancelar'
}

export function recarregarPagina() {
    navegar(paginaAtual)
}

export { TENANT_ID, supabase }

// ============================================================
// TOAST
// ============================================================

export function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function toast(msg, tipo = 'info') {
    const el = document.getElementById('toast')
    el.textContent = msg
    el.className = `toast ${tipo}`
    el.style.display = 'block'
    clearTimeout(el._timer)
    el._timer = setTimeout(() => { el.style.display = 'none' }, 3500)
}

// ============================================================
// BADGE DE TRANSLADOS PENDENTES
// ============================================================

async function atualizarBadgeTranslados() {
    const { count } = await supabase
        .from('solicitacoes')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', TENANT_ID)
        .not('numero_voo', 'is', null)
        .in('status', ['solicitada', 'em_analise'])

    const badge = document.getElementById('badge-translados')
    if (count > 0) {
        badge.textContent = count
        badge.style.display = 'inline'
    } else {
        badge.style.display = 'none'
    }
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

async function init() {
    const session = await verificarSessao()

    if (!session) {
        mostrarLogin()
        return
    }

    mostrarApp(session.user)
}

function mostrarLogin() {
    document.getElementById('login-screen').style.display = 'flex'
    document.getElementById('admin-app').style.display = 'none'

    document.getElementById('login-form').addEventListener('submit', async e => {
        e.preventDefault()

        const email = document.getElementById('login-email').value.trim()
        const senha = document.getElementById('login-password').value
        const errEl = document.getElementById('login-error')
        const btnText   = document.getElementById('login-btn-text')
        const btnLoader = document.getElementById('login-btn-loader')

        errEl.style.display = 'none'
        btnText.style.display   = 'none'
        btnLoader.style.display = 'inline'

        try {
            const { user } = await login(email, senha)
            mostrarApp(user)
        } catch (err) {
            errEl.textContent = 'E-mail ou senha incorretos.'
            errEl.style.display = 'block'
        } finally {
            btnText.style.display   = 'inline'
            btnLoader.style.display = 'none'
        }
    })

    // Esqueci minha senha
    document.getElementById('btn-forgot')?.addEventListener('click', () => {
        const area = document.getElementById('forgot-form-area')
        area.style.display = area.style.display === 'none' ? 'block' : 'none'
    })

    document.getElementById('btn-forgot-send')?.addEventListener('click', async () => {
        const email = document.getElementById('forgot-email')?.value.trim()
        const msgEl = document.getElementById('forgot-msg')
        if (!email) { msgEl.textContent = 'Informe o e-mail.'; msgEl.style.color = '#ef4444'; return }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + window.location.pathname,
        })

        if (error) {
            msgEl.textContent = error.message
            msgEl.style.color = '#ef4444'
        } else {
            msgEl.textContent = 'Link enviado! Verifique seu e-mail.'
            msgEl.style.color = '#16a34a'
            document.getElementById('btn-forgot-send').disabled = true
        }
    })
}

function mostrarApp(user) {
    document.getElementById('login-screen').style.display = 'none'
    document.getElementById('admin-app').style.display = 'flex'

    // Info do usuário na sidebar
    const nome = user.email.split('@')[0]
    document.getElementById('sidebar-user-name').textContent = user.email
    document.getElementById('sidebar-avatar').textContent = nome[0].toUpperCase()

    // Navegação
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault()
            navegar(el.dataset.page)
        })
    })

    // Logout
    document.getElementById('logout-btn').addEventListener('click', async () => {
        if (confirm('Deseja sair do painel?')) await logout()
    })

    // Modal
    document.getElementById('modal-close-btn').addEventListener('click', fecharModal)
    document.getElementById('modal-cancel-btn').addEventListener('click', fecharModal)
    document.getElementById('modal-overlay').addEventListener('click', e => {
        if (e.target.id === 'modal-overlay') fecharModal()
    })

    document.getElementById('modal-save-btn').addEventListener('click', async () => {
        if (!modalCallback) { fecharModal(); return }
        try {
            const ok = await modalCallback()
            if (ok !== false) {
                fecharModal()
                toast('Salvo com sucesso!', 'success')
                navegar(paginaAtual)
            }
        } catch (err) {
            toast(err.message || 'Erro ao salvar.', 'error')
        }
    })

    // Alterar senha
    document.getElementById('btn-alterar-senha')?.addEventListener('click', () => {
        abrirModal('🔑 Alterar Senha', `
            <div class="form-group">
                <label>Senha atual *</label>
                <input type="password" id="senha-atual" placeholder="••••••••" autocomplete="current-password">
            </div>
            <div class="form-group">
                <label>Nova senha *</label>
                <input type="password" id="senha-nova" placeholder="Mínimo 8 caracteres" autocomplete="new-password">
            </div>
            <div class="form-group">
                <label>Confirme a nova senha *</label>
                <input type="password" id="senha-conf" placeholder="Repita a nova senha" autocomplete="new-password">
            </div>
            <div id="senha-err" style="color:#ef4444;font-size:13px;margin-top:4px"></div>
        `, async () => {
            const atual = document.getElementById('senha-atual').value
            const nova  = document.getElementById('senha-nova').value
            const conf  = document.getElementById('senha-conf').value
            const errEl = document.getElementById('senha-err')

            if (!atual || !nova || !conf) { errEl.textContent = 'Preencha todos os campos.'; return false }
            if (nova.length < 8)          { errEl.textContent = 'A nova senha deve ter ao menos 8 caracteres.'; return false }
            if (nova !== conf)            { errEl.textContent = 'As senhas não coincidem.'; return false }

            // Re-autentica com senha atual antes de alterar
            const { data: { user } } = await supabase.auth.getUser()
            const { error: reAuthErr } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: atual,
            })
            if (reAuthErr) { errEl.textContent = 'Senha atual incorreta.'; return false }

            const { error } = await supabase.auth.updateUser({ password: nova })
            if (error) { errEl.textContent = error.message; return false }
        })
    })

    // Badge translados
    atualizarBadgeTranslados()

    navegar('dashboard')
}

// Detecta retorno do link de redefinição de senha (token no hash da URL)
async function verificarResetToken() {
    const hash = window.location.hash
    if (!hash.includes('type=recovery')) return false

    const { data: { session }, error } = await supabase.auth.getSession()
    if (error || !session) return false

    // Limpa o hash da URL sem recarregar
    history.replaceState(null, '', window.location.pathname)

    // Abre o modal de nova senha diretamente no app
    mostrarApp(session.user)
    abrirModal('🔑 Redefinir Senha', `
        <p style="font-size:13px;color:#374151;margin-bottom:12px">Defina sua nova senha:</p>
        <div class="form-group">
            <label>Nova senha *</label>
            <input type="password" id="reset-nova" placeholder="Mínimo 8 caracteres" autocomplete="new-password">
        </div>
        <div class="form-group">
            <label>Confirme a nova senha *</label>
            <input type="password" id="reset-conf" placeholder="Repita a nova senha" autocomplete="new-password">
        </div>
        <div id="reset-err" style="color:#ef4444;font-size:13px;margin-top:4px"></div>
    `, async () => {
        const nova  = document.getElementById('reset-nova').value
        const conf  = document.getElementById('reset-conf').value
        const errEl = document.getElementById('reset-err')

        if (nova.length < 8) { errEl.textContent = 'A nova senha deve ter ao menos 8 caracteres.'; return false }
        if (nova !== conf)   { errEl.textContent = 'As senhas não coincidem.'; return false }

        const { error } = await supabase.auth.updateUser({ password: nova })
        if (error) { errEl.textContent = error.message; return false }
    })

    return true
}

document.addEventListener('DOMContentLoaded', async () => {
    const handled = await verificarResetToken()
    if (!handled) init()
})
