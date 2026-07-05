import { supabase, TENANT_ID } from '../js/supabase.js';
import { subscribeVeiculos } from '../js/realtime.js';
import {
  statusLabel, statusColor, calcularSaidaLavador,
  logger, escapeHtml, formatTime
} from '../js/utils.js';

const PATIOS = ['Oklahoma', 'Brasil', 'Garagem', 'Lavador'];

let _channels = [];

export async function init(container) {
  container.innerHTML = `
    <div class="page">
      <div class="page-header row-between">
        <div>
          <h1 class="page-title">Pátio</h1>
          <p class="page-subtitle" id="patio-subtitle">Visão por localização</p>
        </div>
        <button class="btn btn-sm btn-secondary" id="btn-refresh-patio">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Atualizar
        </button>
      </div>

      <div id="patio-content">
        <div class="loading-screen" style="min-height:40vh;"><div class="spinner"></div></div>
      </div>
    </div>
  `;

  document.getElementById('btn-refresh-patio')?.addEventListener('click', loadData);

  async function loadData() {
    const content = document.getElementById('patio-content');
    if (!content) return;

    try {
      const { data, error } = await supabase
        .from('frota_veiculos')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .order('categoria')
        .order('placa');

      if (error) throw error;

      const veiculos = data ?? [];
      renderPatio(content, veiculos);

      const subtitle = document.getElementById('patio-subtitle');
      if (subtitle) {
        const comPatio = veiculos.filter((v) => v.patio_atual).length;
        subtitle.textContent = `${comPatio} veículo${comPatio !== 1 ? 's' : ''} em pátio`;
      }
    } catch (err) {
      logger.error('Pátio load error:', err);
      content.innerHTML = `
        <div class="alert alert-error">
          Erro ao carregar dados do pátio. Verifique a conexão e tente novamente.
        </div>
      `;
    }
  }

  function dotClass(v) {
    if (!v.limpo && v.status !== 'LOCADO') return 'sujo';
    if (v.status === 'NO_LAVADOR') return 'lavador';
    if (v.status === 'MANUTENCAO') return 'manutencao';
    if (v.status === 'LOCADO') return 'locado';
    return 'limpo';
  }

  function renderVeiculoTile(v) {
    const cls = dotClass(v);
    const title = `${v.placa} — ${statusLabel(v.status)}${!v.limpo ? ' (Sujo)' : ''}`;
    let extra = '';
    if (v.status === 'NO_LAVADOR' && v.hora_entrada_lavador) {
      const saida = calcularSaidaLavador(v.hora_entrada_lavador);
      extra = `<span style="font-size:0.65rem;color:var(--muted);">saída ${saida ? formatTime(saida) : '—'}</span>`;
    }
    return `
      <div class="patio-vehicle" data-nav-placa="${escapeHtml(v.placa)}" title="${escapeHtml(title)}"
           role="button" tabindex="0" aria-label="${escapeHtml(title)}">
        <div class="patio-dot ${cls}"></div>
        <span class="patio-vehicle-placa">${escapeHtml(v.placa)}</span>
        <span style="font-size:0.65rem;color:var(--muted);text-align:center;">${escapeHtml(v.categoria ?? '')}</span>
        ${extra}
      </div>
    `;
  }

  function renderPatio(content, veiculos) {
    const semLocal = veiculos.filter((v) => !v.patio_atual);

    const sections = PATIOS.map((patio) => ({
      patio,
      veiculos: veiculos.filter((v) => v.patio_atual === patio)
    })).filter((s) => s.veiculos.length > 0);

    if (sections.length === 0 && semLocal.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
          <p class="empty-state-title">Nenhum veículo em pátio</p>
          <p class="empty-state-msg">Todos os veículos estão locados sem localização registrada.</p>
        </div>
      `;
      return;
    }

    const legend = `
      <div class="card" style="padding:10px var(--spacing-md);margin-bottom:var(--spacing-md);">
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;font-size:0.8125rem;">
          <span><span class="patio-dot limpo" style="display:inline-block;"></span> Disponível/Limpo</span>
          <span><span class="patio-dot sujo" style="display:inline-block;"></span> Sujo</span>
          <span><span class="patio-dot lavador" style="display:inline-block;"></span> Lavador</span>
          <span><span class="patio-dot manutencao" style="display:inline-block;"></span> Manutenção</span>
          <span><span class="patio-dot locado" style="display:inline-block;"></span> Locado</span>
        </div>
      </div>
    `;

    const sectionsHtml = sections.map((s) => `
      <div class="patio-section">
        <div class="patio-header">
          <span class="patio-name">${escapeHtml(s.patio)}</span>
          <span class="patio-count">${s.veiculos.length} veículo${s.veiculos.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="patio-grid">
          ${s.veiculos.map(renderVeiculoTile).join('')}
        </div>
      </div>
    `).join('');

    const semLocalHtml = semLocal.length > 0 ? `
      <div class="patio-section">
        <div class="patio-header">
          <span class="patio-name" style="color:var(--muted);">Sem localização</span>
          <span class="patio-count">${semLocal.length}</span>
        </div>
        <div class="patio-grid">
          ${semLocal.map(renderVeiculoTile).join('')}
        </div>
      </div>
    ` : '';

    content.innerHTML = legend + sectionsHtml + semLocalHtml;

    content.querySelectorAll('[data-nav-placa]').forEach((el) => {
      el.addEventListener('click', () => {
        window.location.hash = `#/veiculo/${el.dataset.navPlaca}`;
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.location.hash = `#/veiculo/${el.dataset.navPlaca}`;
        }
      });
    });
  }

  await loadData();

  const ch = subscribeVeiculos(() => loadData());
  _channels = [ch];

  return () => {
    _channels = [];
  };
}
