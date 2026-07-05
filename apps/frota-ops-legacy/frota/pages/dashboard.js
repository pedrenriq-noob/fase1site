import { supabase, TENANT_ID } from '../js/supabase.js';
import { subscribeVeiculos, subscribeReservas } from '../js/realtime.js';
import {
  formatDate, formatDateShort, isOverdue, isToday, isTomorrow,
  statusLabel, statusColor, calcularSaidaLavador, categoriaLabel,
  showToast, logger, escapeHtml, formatTime
} from '../js/utils.js';

let _channels = [];

export async function init(container) {
  container.innerHTML = `
    <div class="page">
      <div class="page-header row-between">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle" id="dash-date"></p>
        </div>
        <button class="btn btn-sm btn-secondary" id="btn-refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Atualizar
        </button>
      </div>

      <div id="dash-content">
        <div class="loading-screen" style="min-height:40vh;"><div class="spinner"></div></div>
      </div>
    </div>
  `;

  const now = new Date();
  const dateEl = document.getElementById('dash-date');
  if (dateEl) {
    const days = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
    dateEl.textContent = `${days[now.getDay()]}, ${now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`;
  }

  document.getElementById('btn-refresh')?.addEventListener('click', loadData);

  async function loadData() {
    const content = document.getElementById('dash-content');
    if (!content) return;

    try {
      const [veiculosRes, reservasRes] = await Promise.all([
        supabase.from('frota_veiculos').select('*').eq('tenant_id', TENANT_ID),
        supabase.from('frota_reservas').select('*').eq('tenant_id', TENANT_ID)
          .in('status', ['PREVISTO', 'CONFIRMADO'])
          .gte('data_retorno_prev', new Date().toISOString())
      ]);

      if (veiculosRes.error) throw veiculosRes.error;
      if (reservasRes.error) throw reservasRes.error;

      const veiculos = veiculosRes.data ?? [];
      const reservas = reservasRes.data ?? [];

      renderDashboard(content, veiculos, reservas);
    } catch (err) {
      logger.error('Dashboard load error:', err);
      content.innerHTML = `
        <div class="alert alert-error">
          Erro ao carregar dados. Verifique a conexão e tente novamente.
        </div>
      `;
    }
  }

  function renderDashboard(content, veiculos, reservas) {
    const disponiveis = veiculos.filter((v) => v.status === 'DISPONIVEL');
    const locados     = veiculos.filter((v) => v.status === 'LOCADO');
    const devolvidos  = veiculos.filter((v) => v.status === 'DEVOLVIDO');
    const noLavador   = veiculos.filter((v) => v.status === 'NO_LAVADOR');
    const manutencao  = veiculos.filter((v) => v.status === 'MANUTENCAO');
    const sujos       = veiculos.filter((v) => v.status === 'DEVOLVIDO' && !v.limpo);

    // Stats by categoria
    const cats = [...new Set(veiculos.map((v) => v.categoria))].sort();

    const catStats = cats.map((cat) => {
      const catVeiculos = veiculos.filter((v) => v.categoria === cat);
      const dispCat = catVeiculos.filter((v) => v.status === 'DISPONIVEL').length;
      const locCat  = catVeiculos.filter((v) => v.status === 'LOCADO').length;
      const lavCat  = catVeiculos.filter((v) => v.status === 'NO_LAVADOR').length;
      const manCat  = catVeiculos.filter((v) => v.status === 'MANUTENCAO').length;
      return { cat, total: catVeiculos.length, disp: dispCat, loc: locCat, lav: lavCat, man: manCat };
    });

    // Retornos previstos hoje e amanhã
    const retornosHoje = locados
      .filter((v) => v.prev_retorno && isToday(new Date(v.prev_retorno)))
      .sort((a, b) => new Date(a.prev_retorno) - new Date(b.prev_retorno));

    const retornosAmanha = locados
      .filter((v) => v.prev_retorno && isTomorrow(new Date(v.prev_retorno)))
      .sort((a, b) => new Date(a.prev_retorno) - new Date(b.prev_retorno));

    const retornosAtrasados = locados
      .filter((v) => v.prev_retorno && isOverdue(new Date(v.prev_retorno)) && !isToday(new Date(v.prev_retorno)))
      .sort((a, b) => new Date(a.prev_retorno) - new Date(b.prev_retorno));

    content.innerHTML = `
      <!-- Summary Stats -->
      <div class="section">
        <div class="grid-2" style="grid-template-columns: repeat(auto-fill, minmax(140px,1fr)); gap: 10px;">
          <div class="stat-card stat-green">
            <span class="stat-number">${disponiveis.length}</span>
            <span class="stat-label">Disponíveis</span>
          </div>
          <div class="stat-card stat-blue">
            <span class="stat-number">${locados.length}</span>
            <span class="stat-label">Locados</span>
          </div>
          <div class="stat-card stat-yellow">
            <span class="stat-number">${devolvidos.length}</span>
            <span class="stat-label">Devolvidos</span>
          </div>
          <div class="stat-card stat-orange">
            <span class="stat-number">${noLavador.length}</span>
            <span class="stat-label">No Lavador</span>
          </div>
          <div class="stat-card stat-red">
            <span class="stat-number">${manutencao.length}</span>
            <span class="stat-label">Manutenção</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">${veiculos.length}</span>
            <span class="stat-label">Total Frota</span>
          </div>
        </div>
      </div>

      <!-- Por Categoria -->
      ${cats.length > 0 ? `
      <div class="section">
        <p class="section-title">Disponibilidade por Categoria</p>
        <div class="cat-stats-grid">
          ${catStats.map((cs) => `
            <div class="cat-stat-card">
              <div class="cat-stat-name">${escapeHtml(cs.cat)}</div>
              <div class="cat-stat-disp">${cs.disp}</div>
              <div class="cat-stat-detail">de ${cs.total} | ${cs.loc} loc | ${cs.lav} lav</div>
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      <!-- Retornos Atrasados -->
      ${retornosAtrasados.length > 0 ? `
      <div class="section">
        <p class="section-title">⚠️ Retornos Atrasados (${retornosAtrasados.length})</p>
        <div class="card" style="padding:0;">
          ${retornosAtrasados.map((v) => renderRetornoItem(v, 'overdue')).join('')}
        </div>
      </div>` : ''}

      <!-- Retornos Hoje -->
      <div class="section">
        <p class="section-title">Retornos Previstos Hoje (${retornosHoje.length})</p>
        ${retornosHoje.length > 0 ? `
        <div class="card" style="padding:0;">
          ${retornosHoje.map((v) => renderRetornoItem(v, 'today')).join('')}
        </div>` : `
        <div class="card">
          <p class="text-muted text-sm">Nenhum retorno previsto para hoje.</p>
        </div>`}
      </div>

      <!-- Retornos Amanhã -->
      <div class="section">
        <p class="section-title">Retornos Previstos Amanhã (${retornosAmanha.length})</p>
        ${retornosAmanha.length > 0 ? `
        <div class="card" style="padding:0;">
          ${retornosAmanha.map((v) => renderRetornoItem(v, '')).join('')}
        </div>` : `
        <div class="card">
          <p class="text-muted text-sm">Nenhum retorno previsto para amanhã.</p>
        </div>`}
      </div>

      <!-- Sujos aguardando limpeza -->
      ${sujos.length > 0 ? `
      <div class="section">
        <p class="section-title">Aguardando Limpeza (${sujos.length})</p>
        <div class="card" style="padding:0;">
          ${sujos.map((v) => `
            <div class="return-item" style="cursor:pointer;" onclick="location.hash='#/veiculo/${escapeHtml(v.placa)}'">
              <div>
                <div class="return-placa">${escapeHtml(v.placa)}</div>
                <div class="return-info">${escapeHtml(v.modelo ?? '—')} · ${escapeHtml(v.patio_atual ?? '—')}</div>
              </div>
              <span class="badge badge-sujo">Sujo</span>
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      <!-- No Lavador -->
      ${noLavador.length > 0 ? `
      <div class="section">
        <p class="section-title">No Lavador (${noLavador.length})</p>
        <div class="card" style="padding:0;">
          ${noLavador.map((v) => {
            const saida = calcularSaidaLavador(v.hora_entrada_lavador);
            const saidaStr = saida ? formatTime(saida) : '—';
            const atrasado = saida && isOverdue(saida);
            return `
              <div class="return-item" style="cursor:pointer;" onclick="location.hash='#/veiculo/${escapeHtml(v.placa)}'">
                <div>
                  <div class="return-placa">${escapeHtml(v.placa)}</div>
                  <div class="return-info">${escapeHtml(v.modelo ?? '—')} · entrada ${formatTime(v.hora_entrada_lavador)}</div>
                </div>
                <div class="return-time ${atrasado ? 'overdue' : ''}">
                  saída ${saidaStr}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>` : ''}
    `;

    // Click handlers for return items
    content.querySelectorAll('[data-placa]').forEach((el) => {
      el.addEventListener('click', () => {
        window.location.hash = `#/veiculo/${el.dataset.placa}`;
      });
    });
  }

  function renderRetornoItem(v, cls) {
    const prevRetorno = v.prev_retorno ? new Date(v.prev_retorno) : null;
    const timeStr = prevRetorno ? formatTime(prevRetorno) : '—';
    return `
      <div class="return-item" style="cursor:pointer;" data-placa="${escapeHtml(v.placa)}">
        <div>
          <div class="return-placa">${escapeHtml(v.placa)}</div>
          <div class="return-info">${escapeHtml(v.modelo ?? '—')} · ${escapeHtml(categoriaLabel(v.categoria))} · ${escapeHtml(v.ponto_retorno ?? '—')}</div>
        </div>
        <div class="return-time ${cls}">${timeStr}</div>
      </div>
    `;
  }

  await loadData();

  // Realtime subscriptions
  const ch1 = subscribeVeiculos(() => loadData());
  const ch2 = subscribeReservas(() => loadData());
  _channels = [ch1, ch2];

  return () => {
    _channels = [];
  };
}
