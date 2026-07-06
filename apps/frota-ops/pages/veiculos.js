import { supabase, TENANT_ID } from '../js/supabase.js';
import { subscribeVeiculos } from '../js/realtime.js';
import { criarSearchBox } from '../js/ui/search-box.js';
import { criarFilterBar } from '../js/ui/filter-bar.js';
import { criarSortableHeader } from '../js/ui/sortable-header.js';
import { criarSelectionController } from '../js/ui/selection-controller.js';
import { criarBulkActionBar } from '../js/ui/bulk-action-bar.js';
import { descreverTransicao } from '../js/services/vehicle-status.js';
import {
  statusLabel, statusColor, categoriaLabel, escapeHtml, logger, showToast, CATEGORIAS
} from '../js/utils.js';

// Ações em lote restritas às 2 transições do VehicleStatusService que não
// exigem contexto por veículo (ponto/horário/pátio) — as demais transições
// (locar, devolver, lavar) precisariam de um formulário por item, o que
// descaracterizaria a ideia de ação em lote. Decisão do Product Owner
// (2026-07-06): faz sentido hoje porque a tela ainda supre um sistema
// oficial que não gera esses eventos automaticamente; deixará de fazer
// sentido quando o SaaS definitivo registrar cada evento individualmente.
const BULK_ACTIONS = [
  { id: 'manutencao',          label: 'Enviar p/ Manutenção', statusDestino: 'MANUTENCAO' },
  { id: 'liberar-manutencao',  label: 'Liberar de Manutenção', statusDestino: 'DISPONIVEL' }
];

const STATUS_OPTIONS = [
  { value: 'DISPONIVEL', label: 'Disponível' },
  { value: 'LOCADO',     label: 'Locado' },
  { value: 'DEVOLVIDO',  label: 'Devolvido' },
  { value: 'NO_LAVADOR', label: 'Lavador' },
  { value: 'MANUTENCAO', label: 'Manutenção' }
];

// Critérios de ordenação disponíveis para a grade de veículos — cada um vira
// uma instância independente de SortableHeader (regra de comportamento #1 do
// contrato: um componente por critério, a página decide quais existem).
const SORT_CRITERIOS = [
  { key: 'placa',     label: 'Placa' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'status',    label: 'Status' }
];

export async function init(container) {
  let _veiculos = [];
  let _search = '';
  let _channel = null;
  // Ordenação padrão replica a query atual (`order('placa')`) — nenhuma
  // mudança de comportamento percebida até o operador escolher outro critério.
  let _sort = { key: 'placa', dir: 'asc' };

  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Veículos</h1>
      </div>

      <div id="search-container" class="mb-md"></div>
      <div id="filter-container" class="mb-md"></div>
      <div id="sort-container" class="mb-md" style="display:flex;gap:var(--space-sm);"></div>
      <div id="bulk-container" class="mb-md"></div>

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

  const sortContainer = document.getElementById('sort-container');
  const sortHeaders = SORT_CRITERIOS.map((criterio) => {
    const header = criarSortableHeader({
      label: criterio.label,
      sortKey: criterio.key,
      active: _sort.key === criterio.key,
      direction: _sort.key === criterio.key ? _sort.dir : null,
      onSort: (key, dir) => {
        _sort = { key, dir };
        // Só um critério fica ativo por vez (regra de comportamento #3) —
        // a página é quem garante isso, atualizando todos os outros headers.
        sortHeaders.forEach((h) => h.update({ active: h.sortKey === key, direction: h.sortKey === key ? dir : null }));
        renderGrid();
      }
    });
    header.sortKey = criterio.key;
    sortContainer.appendChild(header.el);
    return header;
  });

  const selection = criarSelectionController({
    onSelectionChange: (ids) => bulkBar.update({ selectedCount: ids.size })
  });

  const bulkBar = criarBulkActionBar({
    selectedCount: 0,
    actions: BULK_ACTIONS.map((a) => ({ id: a.id, label: a.label })),
    onAction: runBulkAction,
    onCancelSelection: () => selection.clear()
  });
  document.getElementById('bulk-container').appendChild(bulkBar.el);

  async function runBulkAction(actionId) {
    const acao = BULK_ACTIONS.find((a) => a.id === actionId);
    const ids = selection.getSelected();
    const selecionados = _veiculos.filter((v) => ids.has(v.placa));

    let sucesso = 0;
    const falhas = [];
    for (const v of selecionados) {
      const resultado = descreverTransicao(v.status, acao.statusDestino);
      if (!resultado.valido) { falhas.push(`${v.placa}: ${resultado.motivo}`); continue; }
      const { error } = await supabase.from('frota_veiculos')
        .update(resultado.payload).eq('id', v.id).eq('tenant_id', TENANT_ID);
      if (error) { falhas.push(`${v.placa}: erro ao salvar`); continue; }
      sucesso++;
    }

    if (sucesso > 0) {
      showToast(`${sucesso} veículo${sucesso !== 1 ? 's' : ''} atualizado${sucesso !== 1 ? 's' : ''}.`, 'success');
    }
    if (falhas.length > 0) {
      showToast(`${falhas.length} não puderam ser atualizados: ${falhas.join('; ')}`, 'error', 7000);
    }

    selection.clear();
    await loadData();
  }

  function getSorted(lista) {
    const { key, dir } = _sort;
    const mult = dir === 'desc' ? -1 : 1;
    return [...lista].sort((a, b) => {
      const va = (a[key] ?? '').toString();
      const vb = (b[key] ?? '').toString();
      return va.localeCompare(vb) * mult;
    });
  }

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

    const filtered = getSorted(getFiltered());
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
            <input type="checkbox" class="vehicle-select" data-placa="${escapeHtml(v.placa)}"
                   aria-label="Selecionar veículo ${escapeHtml(v.placa)}"
                   ${selection.isSelected(v.placa) ? 'checked' : ''} />
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
      card.addEventListener('click', (e) => {
        if (e.target.closest('.vehicle-select')) return;
        handler();
      });
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') handler(); });
    });

    grid.querySelectorAll('.vehicle-select').forEach((checkbox) => {
      checkbox.addEventListener('click', (e) => e.stopPropagation());
      checkbox.addEventListener('change', () => selection.toggle(checkbox.dataset.placa));
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
