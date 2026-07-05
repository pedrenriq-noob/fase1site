import { supabase, TENANT_ID } from '../js/supabase.js';
import { subscribeReservas } from '../js/realtime.js';
import { getUser } from '../js/auth.js';
import { criarModal } from '../js/ui/modal.js';
import { criarConfirmationDialog } from '../js/ui/confirmation-dialog.js';
import {
  reservaStatusLabel, reservaStatusColor, formatDate, escapeHtml,
  showToast, logger, CATEGORIAS, PONTOS
} from '../js/utils.js';

const TAB_FILTERS = [
  { value: 'ALL',        label: 'Todas' },
  { value: 'PREVISTO',   label: 'Previsto' },
  { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'CONCLUIDO',  label: 'Concluído' }
];

export async function init(container) {
  let _reservas = [];
  let _tab = 'ALL';
  let _channel = null;

  container.innerHTML = `
    <div class="page">
      <div class="row-between page-header">
        <h1 class="page-title">Reservas</h1>
        <button class="btn btn-primary btn-sm" id="btn-nova-reserva">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nova Reserva
        </button>
      </div>

      <div class="tabs" id="reserva-tabs" role="tablist"></div>

      <div id="reservas-list">
        <div class="loading-screen" style="min-height:40vh;"><div class="spinner"></div></div>
      </div>
    </div>
  `;

  function renderTabs() {
    const tabs = document.getElementById('reserva-tabs');
    if (!tabs) return;
    tabs.innerHTML = TAB_FILTERS.map((t) => {
      const count = t.value === 'ALL'
        ? _reservas.length
        : _reservas.filter((r) => r.status === t.value).length;
      return `
        <button class="tab-btn ${_tab === t.value ? 'active' : ''}" data-tab="${t.value}"
                role="tab" aria-selected="${_tab === t.value}">
          ${escapeHtml(t.label)} (${count})
        </button>
      `;
    }).join('');

    tabs.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        _tab = btn.dataset.tab;
        renderTabs();
        renderList();
      });
    });
  }

  function getFiltered() {
    if (_tab === 'ALL') return _reservas;
    return _reservas.filter((r) => r.status === _tab);
  }

  function renderList() {
    const list = document.getElementById('reservas-list');
    if (!list) return;

    const filtered = getFiltered();
    filtered.sort((a, b) => new Date(a.data_saida) - new Date(b.data_saida));

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <p class="empty-state-title">Nenhuma reserva encontrada</p>
          <p class="empty-state-msg">Tente outro filtro ou crie uma nova reserva.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = `
      <div class="stack-sm">
        ${filtered.map((r) => `
          <div class="reserva-card" data-id="${r.id}" role="button" tabindex="0">
            <div class="row-between">
              <span class="reserva-num">${escapeHtml(r.locacao_numero ?? '—')}</span>
              <span class="badge badge-${reservaStatusColor(r.status)}">${escapeHtml(reservaStatusLabel(r.status))}</span>
            </div>
            <div class="reserva-cliente">${escapeHtml(r.cliente ?? '—')}</div>
            <div class="reserva-datas">
              ${formatDate(r.data_saida)} → ${formatDate(r.data_retorno_prev)}
            </div>
            <div class="row-wrap mt-sm" style="gap:6px;">
              ${r.categoria ? `<span class="badge badge-gray">${escapeHtml(r.categoria)}</span>` : ''}
              ${r.ponto_retirada ? `<span class="badge badge-gray">↗ ${escapeHtml(r.ponto_retirada)}</span>` : ''}
              ${r.ponto_retorno ? `<span class="badge badge-gray">↙ ${escapeHtml(r.ponto_retorno)}</span>` : ''}
              ${r.placa_atribuida ? `<span class="badge badge-locado">${escapeHtml(r.placa_atribuida)}</span>` : ''}
            </div>
            ${r.obs ? `<p class="text-xs text-muted mt-sm">${escapeHtml(r.obs)}</p>` : ''}
            <div class="row mt-sm" style="gap:6px; flex-wrap:wrap;">
              ${r.status === 'PREVISTO' ? `<button class="btn btn-sm btn-primary btn-confirmar-saida" data-id="${r.id}">Confirmar Saída</button>` : ''}
              ${r.status === 'CONFIRMADO' ? `<button class="btn btn-sm btn-primary btn-confirmar-retorno" data-id="${r.id}">Confirmar Retorno</button>` : ''}
              ${['PREVISTO','CONFIRMADO'].includes(r.status) ? `<button class="btn btn-sm btn-danger btn-cancelar" data-id="${r.id}">Cancelar</button>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    list.querySelectorAll('.btn-confirmar-saida').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const r = _reservas.find((x) => x.id === btn.dataset.id);
        if (r) showConfirmarSaidaModal(r);
      });
    });

    list.querySelectorAll('.btn-confirmar-retorno').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const r = _reservas.find((x) => x.id === btn.dataset.id);
        if (r) confirmarRetorno(r);
      });
    });

    list.querySelectorAll('.btn-cancelar').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const r = _reservas.find((x) => x.id === btn.dataset.id);
        if (r) cancelarReserva(r);
      });
    });
  }

  async function loadData() {
    const { data, error } = await supabase
      .from('frota_reservas')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('data_saida', { ascending: false });

    if (error) {
      logger.error('Reservas load error:', error);
      document.getElementById('reservas-list').innerHTML = `<div class="alert alert-error">Erro ao carregar reservas.</div>`;
      return;
    }

    _reservas = data ?? [];
    renderTabs();
    renderList();
  }

  function showNovaReservaModal() {
    const now = new Date();
    const defaultSaida = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T10:00`;
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultRetorno = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}T10:00`;

    criarModal({
      title: 'Nova Reserva',
      bodyHtml: `
      <div class="form-group">
        <label class="form-label" for="nr-locacao">Nº Locação <span class="required">*</span></label>
        <input class="form-input" type="text" id="nr-locacao" placeholder="LOC-2024-001" required />
      </div>
      <div class="form-group">
        <label class="form-label" for="nr-cliente">Cliente <span class="required">*</span></label>
        <input class="form-input" type="text" id="nr-cliente" placeholder="Nome do cliente" required />
      </div>
      <div class="form-group">
        <label class="form-label" for="nr-cat">Categoria <span class="required">*</span></label>
        <select class="form-select" id="nr-cat" required>
          <option value="">Selecione</option>
          ${CATEGORIAS.map((c) => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label" for="nr-saida">Saída <span class="required">*</span></label>
          <input class="form-input" type="datetime-local" id="nr-saida" value="${defaultSaida}" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="nr-retorno">Retorno Previsto <span class="required">*</span></label>
          <input class="form-input" type="datetime-local" id="nr-retorno" value="${defaultRetorno}" required />
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label" for="nr-ponto-ret">Ponto de Retirada</label>
          <select class="form-select" id="nr-ponto-ret">
            ${PONTOS.map((p) => `<option value="${p}">${p}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="nr-ponto-dev">Ponto de Devolução</label>
          <select class="form-select" id="nr-ponto-dev">
            ${PONTOS.map((p) => `<option value="${p}">${p}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="nr-obs">Observações</label>
        <textarea class="form-textarea" id="nr-obs" placeholder="Observações adicionais"></textarea>
      </div>
      `,
      onConfirm: async () => {
        const locacao = document.getElementById('nr-locacao').value.trim();
        const cliente = document.getElementById('nr-cliente').value.trim();
        const cat = document.getElementById('nr-cat').value;
        const saida = document.getElementById('nr-saida').value;
        const retorno = document.getElementById('nr-retorno').value;
        const pontoRet = document.getElementById('nr-ponto-ret').value;
        const pontoDev = document.getElementById('nr-ponto-dev').value;
        const obs = document.getElementById('nr-obs').value.trim();

        if (!locacao || !cliente || !cat || !saida || !retorno) {
          showToast('Preencha todos os campos obrigatórios.', 'warning');
          return false;
        }

        if (new Date(retorno) <= new Date(saida)) {
          showToast('A data de retorno deve ser após a saída.', 'warning');
          return false;
        }

        const { error } = await supabase.from('frota_reservas').insert({
          tenant_id: TENANT_ID,
          locacao_numero: locacao,
          cliente,
          categoria: cat,
          data_saida: new Date(saida).toISOString(),
          data_retorno_prev: new Date(retorno).toISOString(),
          ponto_retirada: pontoRet,
          ponto_retorno: pontoDev,
          obs: obs || null,
          status: 'PREVISTO',
          created_at: new Date().toISOString()
        });

        if (error) { logger.error('Nova reserva:', error); throw error; }
        showToast('Reserva criada!', 'success');
        await loadData();
        return true;
      }
    });
  }

  function showConfirmarSaidaModal(r) {
    criarModal({
      title: 'Confirmar Saída',
      bodyHtml: `
        <p class="text-sm">Locação: <strong>${escapeHtml(r.locacao_numero)}</strong></p>
        <p class="text-sm">Cliente: <strong>${escapeHtml(r.cliente)}</strong></p>
        <div class="form-group mt-md">
          <label class="form-label" for="cs-placa">Placa Atribuída <span class="required">*</span></label>
          <input class="form-input" type="text" id="cs-placa" value="${escapeHtml(r.placa_atribuida ?? '')}" placeholder="ABC-1234" required />
          <span class="form-hint">Digite a placa do veículo que será entregue</span>
        </div>
      `,
      onConfirm: async () => {
        const placa = document.getElementById('cs-placa').value.trim().toUpperCase();
        if (!placa) { showToast('Informe a placa do veículo.', 'warning'); return false; }

        // fn_confirmar_saida_reserva faz as duas escritas (reserva + veículo)
        // em uma única transação no banco — evita estado inconsistente se a
        // segunda escrita falhar isoladamente (ver Technical Audit, Ação #3).
        const { error } = await supabase.rpc('fn_confirmar_saida_reserva', {
          p_reserva_id: r.id,
          p_placa: placa
        });

        if (error) { logger.error('Confirmar saida:', error); throw error; }

        showToast('Saída confirmada!', 'success');
        await loadData();
        return true;
      }
    });
  }

  function confirmarRetorno(r) {
    criarConfirmationDialog({
      message: `Confirmar retorno da locação ${r.locacao_numero}?`,
      onConfirm: async () => {
        try {
          const { error } = await supabase.rpc('fn_confirmar_retorno_reserva', {
            p_reserva_id: r.id
          });

          if (error) throw error;

          showToast('Retorno confirmado!', 'success');
          await loadData();
        } catch (err) {
          logger.error('Confirmar retorno:', err);
          showToast('Erro ao confirmar retorno.', 'error');
        }
      }
    });
  }

  function cancelarReserva(r) {
    criarConfirmationDialog({
      message: `Cancelar a locação ${r.locacao_numero}?`,
      tone: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('frota_reservas')
            .update({ status: 'CANCELADO' })
            .eq('id', r.id)
            .eq('tenant_id', TENANT_ID);

          if (error) throw error;
          showToast('Reserva cancelada.', 'info');
          await loadData();
        } catch (err) {
          logger.error('Cancelar reserva:', err);
          showToast('Erro ao cancelar.', 'error');
        }
      }
    });
  }

  document.getElementById('btn-nova-reserva')?.addEventListener('click', showNovaReservaModal);

  await loadData();

  _channel = subscribeReservas(() => loadData());

  return () => {};
}
