import { supabase, TENANT_ID } from '../js/supabase.js';
import { subscribeVeiculos } from '../js/realtime.js';
import {
  statusLabel, statusColor, categoriaLabel, escapeHtml, logger, CATEGORIAS
} from '../js/utils.js';

const STATUS_FILTERS = [
  { value: 'ALL',        label: 'Todos' },
  { value: 'DISPONIVEL', label: 'Disponível' },
  { value: 'LOCADO',     label: 'Locado' },
  { value: 'DEVOLVIDO',  label: 'Devolvido' },
  { value: 'NO_LAVADOR', label: 'Lavador' },
  { value: 'MANUTENCAO', label: 'Manutenção' }
];

export async function init(container) {
  let _veiculos = [];
  let _statusFilter = 'ALL';
  let _catFilter = 'ALL';
  let _search = '';
  let _channel = null;

  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Veículos</h1>
      </div>

      <!-- Search -->
      <div class="search-wrapper mb-md">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          class="form-input search-input"
          type="search"
          id="search-placa"
          placeholder="Buscar placa..."
          autocomplete="off"
          maxlength="10"
        />
      </div>

      <!-- Status Filter -->
      <div class="filter-bar mb-md" id="status-filters" role="group" aria-label="Filtro por status"></div>

      <!-- Category Filter -->
      <div class="filter-bar mb-md" id="cat-filters" role="group" aria-label="Filtro por categoria"></div>

      <!-- Results Count -->
      <p class="text-sm text-muted mb-md" id="result-count"></p>

      <!-- Vehicle Grid -->
      <div id="vehicle-grid"></div>
    </div>
  `;

  function renderStatusFilters() {
    const bar = document.getElementById('status-filters');
    if (!bar) return;
    bar.innerHTML = STATUS_FILTERS.map((f) => {
      const count = f.value === 'ALL'
        ? _veiculos.length
        : _veiculos.filter((v) => v.status === f.value).length;
      return `
        <button class="filter-chip ${_statusFilter === f.value ? 'active' : ''}"
                data-status="${f.value}" type="button">
          ${escapeHtml(f.label)}
          <span class="chip-count">${count}</span>
        </button>
      `;
    }).join('');

    bar.querySelectorAll('.filter-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        _statusFilter = btn.dataset.status;
        renderStatusFilters();
        renderGrid();
      });
    });
  }

  function renderCatFilters() {
    const bar = document.getElementById('cat-filters');
    if (!bar) return;
    const cats = ['ALL', ...new Set(_veiculos.map((v) => v.categoria).filter(Boolean))].sort((a, b) => {
      if (a === 'ALL') return -1;
      if (b === 'ALL') return 1;
      return a.localeCompare(b);
    });
    bar.innerHTML = cats.map((cat) => {
      const count = cat === 'ALL'
        ? _veiculos.length
        : _veiculos.filter((v) => v.categoria === cat).length;
      return `
        <button class="filter-chip ${_catFilter === cat ? 'active' : ''}"
                data-cat="${cat}" type="button">
          ${cat === 'ALL' ? 'Todas' : escapeHtml(cat)}
          <span class="chip-count">${count}</span>
        </button>
      `;
    }).join('');

    bar.querySelectorAll('.filter-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        _catFilter = btn.dataset.cat;
        renderCatFilters();
        renderGrid();
      });
    });
  }

  function getFiltered() {
    return _veiculos.filter((v) => {
      if (_statusFilter !== 'ALL' && v.status !== _statusFilter) return false;
      if (_catFilter !== 'ALL' && v.categoria !== _catFilter) return false;
      if (_search && !v.placa?.toLowerCase().includes(_search.toLowerCase())) return false;
      return true;
    });
  }

  function renderGrid() {
    const grid = document.getElementById('vehicle-grid');
    const countEl = document.getElementById('result-count');
    if (!grid) return;

    const filtered = getFiltered();
    if (countEl) countEl.textContent = `${filtered.length} veículo${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="1" y="3" width="15" height="13" rx="2"/>
            <path d="M16 8h4l3 5v3h-7V8z"/>
            <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          <p class="empty-state-title">Nenhum veículo encontrado</p>
          <p class="empty-state-msg">Tente ajustar os filtros ou a busca.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = `
      <div class="grid-2" style="grid-template-columns: repeat(auto-fill, minmax(160px,1fr)); gap: 10px;">
        ${filtered.map((v) => `
          <div class="vehicle-card" role="button" tabindex="0" data-placa="${escapeHtml(v.placa)}"
               aria-label="Veículo ${escapeHtml(v.placa)}">
            <div class="vehicle-placa">${escapeHtml(v.placa)}</div>
            <div class="vehicle-modelo">${escapeHtml(v.modelo ?? '—')}</div>
            <div class="vehicle-badges">
              <span class="badge badge-${statusColor(v.status)}">${escapeHtml(statusLabel(v.status))}</span>
              ${v.categoria ? `<span class="badge badge-gray">${escapeHtml(v.categoria)}</span>` : ''}
              ${v.limpo === true ? '<span class="badge badge-limpo">Limpo</span>' : ''}
              ${v.limpo === false && v.status !== 'LOCADO' ? '<span class="badge badge-sujo">Sujo</span>' : ''}
            </div>
            ${v.patio_atual ? `<div class="vehicle-patio">📍 ${escapeHtml(v.patio_atual)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;

    grid.querySelectorAll('.vehicle-card').forEach((card) => {
      const handler = () => { window.location.hash = `#/veiculo/${card.dataset.placa}`; };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') handler(); });
    });
  }

  async function loadData() {
    const { data, error } = await supabase
      .from('frota_veiculos')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('placa');

    if (error) {
      logger.error('Veiculos load error:', error);
      document.getElementById('vehicle-grid').innerHTML = `
        <div class="alert alert-error">Erro ao carregar veículos.</div>
      `;
      return;
    }

    _veiculos = data ?? [];
    renderStatusFilters();
    renderCatFilters();
    renderGrid();
  }

  document.getElementById('search-placa')?.addEventListener('input', (e) => {
    _search = e.target.value;
    renderGrid();
  });

  await loadData();

  _channel = subscribeVeiculos(() => loadData());

  return () => {};
}
