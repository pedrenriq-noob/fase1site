import { supabase, TENANT_ID } from '../js/supabase.js';
import { subscribeVeiculos } from '../js/realtime.js';
import { criarSearchBox } from '../js/ui/search-box.js';
import { criarFilterBar } from '../js/ui/filter-bar.js';
import {
  statusLabel, statusColor, categoriaLabel, escapeHtml, logger, CATEGORIAS
} from '../js/utils.js';

const STATUS_OPTIONS = [
  { value: 'DISPONIVEL', label: 'Disponível' },
  { value: 'LOCADO',     label: 'Locado' },
  { value: 'DEVOLVIDO',  label: 'Devolvido' },
  { value: 'NO_LAVADOR', label: 'Lavador' },
  { value: 'MANUTENCAO', label: 'Manutenção' }
];

export async function init(container) {
  let _veiculos = [];
  let _search = '';
  let _channel = null;

  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Veículos</h1>
      </div>

      <div id="search-container" class="mb-md"></div>
      <div id="filter-container" class="mb-md"></div>

      <!-- Results Count -->
      <p class="text-sm text-muted mb-md" id="result-count"></p>

      <!-- Vehicle Grid -->
      <div id="vehicle-grid"></div>
    </div>
  `;

  const search = criarSearchBox({
    placeholder: 'Buscar placa...',
    onSearch: (termo) => { _search = termo; renderGrid(); }
  });
  document.getElementById('search-container').appendChild(search.el);

  const filterBar = criarFilterBar({
    groups: buildFilterGroups(_veiculos),
    onFilterChange: () => renderGrid()
  });
  document.getElementById('filter-container').appendChild(filterBar.el);

  function buildFilterGroups(veiculos) {
    const categorias = [...new Set(veiculos.map((v) => v.categoria).filter(Boolean))].sort();
    return [
      {
        key: 'status',
        label: 'Status',
        options: STATUS_OPTIONS.map((f) => ({
          value: f.value,
          label: f.label,
          count: veiculos.filter((v) => v.status === f.value).length
        }))
      },
      {
        key: 'categoria',
        label: 'Categoria',
        options: categorias.map((cat) => ({
          value: cat,
          label: cat,
          count: veiculos.filter((v) => v.categoria === cat).length
        }))
      }
    ];
  }

  function getFiltered() {
    const estado = filterBar.getState();
    return _veiculos.filter((v) => {
      if (estado.status?.length && !estado.status.includes(v.status)) return false;
      if (estado.categoria?.length && !estado.categoria.includes(v.categoria)) return false;
      if (_search && !v.placa?.toLowerCase().includes(_search)) return false;
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
    // update() do FilterBar preserva a seleção ativa do operador mesmo
    // quando os dados (e portanto as contagens) mudam — ver docs/ui/FilterBar.md.
    filterBar.update({ groups: buildFilterGroups(_veiculos) });
    renderGrid();
  }

  await loadData();

  _channel = subscribeVeiculos(() => loadData());

  return () => {};
}
