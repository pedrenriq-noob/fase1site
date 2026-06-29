import { requireAuth, signOut, renderLoginPage, getSession } from './auth.js';
import { unsubscribeAll } from './realtime.js';
import { logger } from './utils.js';

/* ===== Route Map ===== */
const ROUTES = {
  '/':               () => import('../pages/dashboard.js'),
  '/dashboard':      () => import('../pages/dashboard.js'),
  '/veiculos':       () => import('../pages/veiculos.js'),
  '/veiculo/:placa': () => import('../pages/veiculo-detalhe.js'),
  '/disponibilidade':() => import('../pages/disponibilidade.js'),
  '/reservas':       () => import('../pages/reservas.js'),
  '/patio':          () => import('../pages/patio.js')
};

/* ===== Route Matching ===== */
function matchRoute(hash) {
  const path = hash.replace(/^#/, '') || '/';

  for (const pattern of Object.keys(ROUTES)) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) continue;

    const params = {};
    let matched = true;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (patternParts[i] !== pathParts[i]) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return { loader: ROUTES[pattern], params, pattern };
    }
  }

  return null;
}

/* ===== Navigation ===== */
export function navigate(hash) {
  window.location.hash = hash;
}

/* ===== Active Nav Item ===== */
function updateActiveNav(path) {
  const items = document.querySelectorAll('.bottom-nav__item');
  items.forEach((item) => {
    const route = item.dataset.route;
    const isActive =
      (route === 'dashboard' && (path === '/' || path === '/dashboard')) ||
      (route === 'veiculos' && (path.startsWith('/veiculo'))) ||
      (route !== 'dashboard' && route !== 'veiculos' && path.startsWith(`/${route}`));

    item.classList.toggle('active', isActive);
    item.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

/* ===== Page Render ===== */
let _currentCleanup = null;

async function render(hash) {
  const app = document.getElementById('app');
  if (!app) return;

  const path = hash.replace(/^#/, '') || '/';

  if (path === '/login') {
    renderLoginPage();
    return;
  }

  const authenticated = await requireAuth();
  if (!authenticated) return;

  const matched = matchRoute(hash);

  if (!matched) {
    app.innerHTML = `
      <div class="page">
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p class="empty-state-title">Página não encontrada</p>
          <p class="empty-state-msg">A rota "${path}" não existe.</p>
          <a href="#/dashboard" class="btn btn-primary mt-md">Ir ao Dashboard</a>
        </div>
      </div>
    `;
    return;
  }

  // Show header and nav
  const header = document.getElementById('app-header');
  const nav = document.getElementById('bottom-nav');
  if (header) header.style.display = '';
  if (nav) nav.style.display = '';

  app.style.paddingTop = '';
  app.style.paddingBottom = '';

  // Cleanup previous page
  if (typeof _currentCleanup === 'function') {
    try { _currentCleanup(); } catch (_) {}
    _currentCleanup = null;
  }

  unsubscribeAll();

  updateActiveNav(path);

  app.innerHTML = `<div class="page"><div class="loading-screen" style="min-height:50vh;"><div class="spinner"></div></div></div>`;

  try {
    const module = await matched.loader();
    const cleanup = await module.init(app, matched.params);
    if (typeof cleanup === 'function') {
      _currentCleanup = cleanup;
    }
  } catch (err) {
    logger.error('Page render error:', err);
    app.innerHTML = `
      <div class="page">
        <div class="alert alert-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          Erro ao carregar a página. <a href="#/dashboard" style="font-weight:600;text-decoration:underline;">Ir ao Dashboard</a>
        </div>
      </div>
    `;
  }
}

/* ===== Init ===== */
async function init() {
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('Deseja sair do sistema?')) {
        await signOut();
      }
    });
  }

  window.addEventListener('auth:login', () => {
    const hash = window.location.hash || '#/dashboard';
    render(hash);
  });

  window.addEventListener('hashchange', () => {
    render(window.location.hash);
  });

  const session = await getSession();
  if (!session) {
    renderLoginPage();
    return;
  }

  const hash = window.location.hash || '#/dashboard';
  if (!hash || hash === '#' || hash === '#/login') {
    window.location.hash = '/dashboard';
  } else {
    render(hash);
  }
}

init();
