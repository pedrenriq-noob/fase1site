// auditoria.js — helper para registrar trilha de auditoria
import { supabase, TENANT_ID } from '../admin.js'

/**
 * Registra uma ação administrativa no audit_log.
 * @param {string} acao       - 'criar' | 'atualizar' | 'excluir' | 'status'
 * @param {string} entidade   - nome da tabela/entidade (ex: 'reserva', 'categoria', 'local')
 * @param {string|null} id    - UUID da entidade afetada
 * @param {string} descricao  - texto livre legível pelo humano
 * @param {object|null} antes  - dados anteriores (para atualizar/excluir)
 * @param {object|null} depois - dados novos (para criar/atualizar)
 */
export async function registrarAuditoria(acao, entidade, id, descricao, antes = null, depois = null) {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('audit_log').insert({
            tenant_id:   TENANT_ID,
            usuario_id:  user?.id ?? null,
            acao,
            entidade,
            entidade_id: id ?? null,
            descricao,
            dados_antes:  antes  ? JSON.parse(JSON.stringify(antes))  : null,
            dados_depois: depois ? JSON.parse(JSON.stringify(depois)) : null,
        })
    } catch (err) {
        console.warn('[auditoria] falha ao registrar:', err.message)
    }
}

/**
 * Exibe modal de confirmação com re-autenticação antes de executar ação destrutiva.
 * @param {string} msg       - Mensagem explicando o que será feito
 * @param {Function} onConfirm - Callback executado após senha confirmada
 */
export function confirmarComSenha(msg, onConfirm) {
    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px'

    overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;max-width:420px;width:100%;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.25)">
        <div style="font-size:28px;text-align:center;margin-bottom:12px">🔐</div>
        <h3 style="text-align:center;font-size:16px;color:#0b1b32;margin-bottom:10px">Confirmação necessária</h3>
        <p style="font-size:13px;color:#374151;line-height:1.6;margin-bottom:16px;text-align:center">${msg}</p>
        <div style="margin-bottom:8px">
            <label style="font-size:12px;color:#61708a;font-weight:600;display:block;margin-bottom:4px">Sua senha de acesso</label>
            <input type="password" id="conf-senha-input" placeholder="••••••••"
                style="width:100%;padding:10px 12px;border:1.5px solid #d9e3ef;border-radius:8px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box">
        </div>
        <div id="conf-senha-err" style="color:#ef4444;font-size:12px;min-height:18px;margin-bottom:10px"></div>
        <div style="display:flex;gap:10px">
            <button id="conf-cancelar" style="flex:1;padding:10px;border:1.5px solid #d9e3ef;background:#fff;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;color:#374151;font-family:inherit">Cancelar</button>
            <button id="conf-confirmar" style="flex:1;padding:10px;background:#ff6a00;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;color:#fff;font-family:inherit">Confirmar</button>
        </div>
    </div>`

    document.body.appendChild(overlay)

    const input  = overlay.querySelector('#conf-senha-input')
    const errEl  = overlay.querySelector('#conf-senha-err')
    const btnOk  = overlay.querySelector('#conf-confirmar')
    const btnCan = overlay.querySelector('#conf-cancelar')

    const fechar = () => overlay.remove()

    btnCan.addEventListener('click', fechar)
    overlay.addEventListener('click', e => { if (e.target === overlay) fechar() })

    input.focus()
    input.addEventListener('keydown', e => { if (e.key === 'Enter') btnOk.click() })

    btnOk.addEventListener('click', async () => {
        const senha = input.value
        if (!senha) { errEl.textContent = 'Informe a senha.'; return }

        btnOk.disabled = true
        btnOk.textContent = 'Verificando...'
        errEl.textContent = ''

        const { data: { user } } = await supabase.auth.getUser()
        const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: senha })

        if (error) {
            errEl.textContent = 'Senha incorreta. Tente novamente.'
            btnOk.disabled = false
            btnOk.textContent = 'Confirmar'
            input.value = ''
            input.focus()
            return
        }

        fechar()
        onConfirm()
    })
}
