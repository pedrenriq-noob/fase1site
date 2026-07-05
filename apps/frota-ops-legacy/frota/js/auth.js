import { supabase, TENANT_ID } from './supabase.js';
import { showToast } from './utils.js';

let _currentUser = null;

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  if (_currentUser) return _currentUser;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('usuarios')
    .select('role, nome')
    .eq('id', user.id)
    .single();

  _currentUser = {
    id: user.id,
    email: user.email,
    role: profile?.role ?? 'balcao',
    nome: profile?.nome ?? user.email
  };

  return _currentUser;
}

export function clearUserCache() {
  _currentUser = null;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  clearUserCache();
  return data;
}

export async function signOut() {
  clearUserCache();
  await supabase.auth.signOut();
  window.location.hash = '/login';
  renderLoginPage();
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    renderLoginPage();
    return false;
  }
  return true;
}

export function renderLoginPage() {
  const header = document.getElementById('app-header');
  const nav = document.getElementById('bottom-nav');
  if (header) header.style.display = 'none';
  if (nav) nav.style.display = 'none';

  const app = document.getElementById('app');
  if (!app) return;

  app.style.paddingTop = '0';
  app.style.paddingBottom = '0';

  app.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">I-Frotas</div>
        <p class="login-subtitle">Gestão operacional da frota Igufoz</p>

        <form id="login-form" class="stack" novalidate>
          <div class="form-group">
            <label class="form-label" for="login-email">E-mail <span class="required">*</span></label>
            <input
              class="form-input"
              type="email"
              id="login-email"
              name="email"
              autocomplete="email"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="login-password">Senha <span class="required">*</span></label>
            <input
              class="form-input"
              type="password"
              id="login-password"
              name="password"
              autocomplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>

          <div id="login-error" class="alert alert-error" style="display:none;"></div>

          <button type="submit" class="btn btn-primary btn-full" id="login-btn">
            Entrar
          </button>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById('login-form');
  const errDiv = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      errDiv.textContent = 'Preencha e-mail e senha.';
      errDiv.style.display = 'flex';
      return;
    }

    loginBtn.disabled = true;
    loginBtn.classList.add('btn-loading');
    errDiv.style.display = 'none';

    try {
      await signIn(email, password);
      app.style.paddingTop = '';
      app.style.paddingBottom = '';
      window.dispatchEvent(new CustomEvent('auth:login'));
    } catch (err) {
      const msgs = {
        'Invalid login credentials': 'E-mail ou senha incorretos.',
        'Email not confirmed': 'Confirme seu e-mail antes de entrar.'
      };
      errDiv.textContent = msgs[err.message] ?? 'Erro ao fazer login. Tente novamente.';
      errDiv.style.display = 'flex';
    } finally {
      loginBtn.disabled = false;
      loginBtn.classList.remove('btn-loading');
    }
  });
}
