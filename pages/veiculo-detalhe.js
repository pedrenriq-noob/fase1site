import { supabase, TENANT_ID } from '../js/supabase.js';
import { subscribeVeiculos } from '../js/realtime.js';
import { getUser } from '../js/auth.js';
import {
  statusLabel, statusColor, categoriaLabel, formatDate, formatTime,
  calcularSaidaLavador, isOverdue, showToast, escapeHtml, logger, PONTOS
} from '../js/utils.js';

export async function init(container, params) {
  const { placa } = params ?? {};
  let _veiculo = null;
  let _channel = null;
  let _user = null;

  if (!placa) {
    container.innerHTML = `<div class="page"><div class="alert alert-error">Placa não especificada.</div></div>`;
    return;
  }

  container.innerHTML = `
    <div class="page">
      <div class="row mb-md">
        <button class="btn btn-sm btn-secondary" onclick="history.back()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Voltar
        </button>
      </div>
      <div id="detail-content">
        <div class="loading-screen" style="min-height:40vh;"><div class="spinner"></div></div>
      </div>
    </div>
  `;

  async function loadData() {
    const [veiculoRes, userRes] = await Promise.all([
      supabase.from('frota_veiculos').select('*').eq('tenant_id', TENANT_ID).eq('placa', placa).single(),
      getUser()
    ]);

    if (veiculoRes.error) {
      logger.error('Veiculo detail error:', veiculoRes.error);
      document.getElementById('detail-content').innerHTML = `
        <div class="alert alert-error">Veículo não encontrado.</div>
      `;
      return;
    }

    _veiculo = veiculoRes.data;
    _user = userRes;

    const movRes = await supabase
      .from('frota_movimentacoes')
      .select('*')
      .eq('veiculo_id', _veiculo.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const movs = movRes.data ?? [];

    render(_veiculo, movs);
  }

  function render(v, movs) {
    const content = document.getElementById('detail-content');
    if (!content) return;

    const saidaLavador = v.status === 'NO_LAVADOR' ? calcularSaidaLavador(v.hora_entrada_lavador) : null;
    const lavadorAtrasado = saidaLavador && isOverdue(saidaLavador);

    content.innerHTML = `
      <!-- Header -->
      <div class="detail-header">
        <div class="detail-placa">${escapeHtml(v.placa)}</div>
        <div class="detail-model">${escapeHtml(v.modelo ?? '—')} · ${escapeHtml(v.fabricante ?? '—')}</div>
        <div class="detail-badges mt-sm">
          <span class="badge badge-${statusColor(v.status)}">${escapeHtml(statusLabel(v.status))}</span>
          ${v.categoria ? `<span class="badge badge-gray">${escapeHtml(categoriaLabel(v.categoria))}</span>` : ''}
          ${v.limpo === true ? '<span class="badge badge-limpo">Limpo</span>' : ''}
          ${v.limpo === false ? '<span class="badge badge-sujo">Sujo</span>' : ''}
          ${v.patio_atual ? `<span class="badge badge-gray">📍 ${escapeHtml(v.patio_atual)}</span>` : ''}
        </div>
      </div>

      <!-- Info -->
      <div class="card mb-md">
        ${v.status === 'LOCADO' && v.prev_retorno ? `
          <div class="info-row">
            <span class="info-key">Retorno previsto</span>
            <span class="info-val ${isOverdue(new Date(v.prev_retorno)) ? 'color-red' : ''}">${formatDate(v.prev_retorno)}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Ponto de retorno</span>
            <span class="info-val">${escapeHtml(v.ponto_retorno ?? '—')}</span>
          </div>
        ` : ''}
        ${v.status === 'NO_LAVADOR' ? `
          <div class="info-row">
            <span class="info-key">Entrou no lavador</span>
            <span class="info-val">${formatTime(v.hora_entrada_lavador)}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Saída estimada</span>
            <span class="info-val ${lavadorAtrasado ? 'color-red' : 'color-green'}">${saidaLavador ? formatTime(saidaLavador) : '—'}</span>
          </div>
        ` : ''}
        <div class="info-row">
          <span class="info-key">Ponto de retirada</span>
          <span class="info-val">${escapeHtml(v.ponto_retirada ?? '—')}</span>
        </div>
        <div class="info-row">
          <span class="info-key">Atualizado por</span>
          <span class="info-val">${escapeHtml(v.updated_by ?? '—')}</span>
        </div>
        <div class="info-row">
          <span class="info-key">Última atualização</span>
          <span class="info-val">${formatDate(v.updated_at)}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="section">
        <p class="section-title">Ações</p>
        <div class="action-grid" id="actions-grid"></div>
      </div>

      <!-- Movimentações -->
      ${movs.length > 0 ? `
      <div class="section">
        <p class="section-title">Últimas Movimentações</p>
        <div class="card" style="padding:0;">
          ${movs.map((m) => {
            const detalhe = m.obs
              ? escapeHtml(m.obs)
              : m.valor_antes
                ? `${escapeHtml(JSON.stringify(m.valor_antes))} → ${escapeHtml(JSON.stringify(m.valor_depois))}`
                : '';
            return `
              <div class="movimentacao-item">
                <div class="movimentacao-tipo">${escapeHtml(m.tipo ?? '—')}</div>
                <div class="movimentacao-meta">${detalhe ? `${detalhe} · ` : ''}${formatDate(m.created_at)}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>` : ''}
    `;

    renderActions(v);
  }

  function renderActions(v) {
    const grid = document.getElementById('actions-grid');
    if (!grid) return;

    const btns = [];

    if (v.status === 'LOCADO') {
      btns.push(`<button class="btn btn-primary" id="btn-retorno">Registrar Retorno</button>`);
    }

    if (v.status === 'DEVOLVIDO') {
      if (!v.limpo) {
        btns.push(`<button class="btn btn-primary" id="btn-lavador">Enviar ao Lavador</button>`);
        btns.push(`<button class="btn btn-secondary" id="btn-marcar-limpo">Marcar Limpo</button>`);
      } else {
        btns.push(`<button class="btn btn-primary" id="btn-disponivel">Marcar Disponível</button>`);
      }
    }

    if (v.status === 'NO_LAVADOR') {
      btns.push(`<button class="btn btn-primary" id="btn-saiu-lavador">Saiu do Lavador</button>`);
    }

    if (v.status === 'DISPONIVEL') {
      btns.push(`<button class="btn btn-primary" id="btn-saida">Registrar Saída</button>`);
    }

    if (v.status !== 'MANUTENCAO') {
      btns.push(`<button class="btn btn-secondary" id="btn-manutencao">Colocar em Manutenção</button>`);
    } else {
      btns.push(`<button class="btn btn-secondary" id="btn-de-manutencao">Sair da Manutenção</button>`);
    }

    btns.push(`<button class="btn btn-secondary" id="btn-mover-patio">Mover Pátio</button>`);

    grid.innerHTML = btns.join('');

    // Bind events
    document.getElementById('btn-retorno')?.addEventListener('click', () => showRetornoModal(v));
    document.getElementById('btn-lavador')?.addEventListener('click', () => enviarLavador(v));
    document.getElementById('btn-marcar-limpo')?.addEventListener('click', () => marcarLimpo(v));
    document.getElementById('btn-disponivel')?.addEventListener('click', () => marcarDisponivel(v));
    document.getElementById('btn-saiu-lavador')?.addEventListener('click', () => saiuLavador(v));
    document.getElementById('btn-saida')?.addEventListener('click', () => showSaidaModal(v));
    document.getElementById('btn-manutencao')?.addEventListener('click', () => colocarManutencao(v));
    document.getElementById('btn-de-manutencao')?.addEventListener('click', () => sairManutencao(v));
    document.getElementById('btn-mover-patio')?.addEventListener('click', () => showMoverPatioModal(v));
  }

  async function updateVeiculo(updates) {
    const { error } = await supabase
      .from('frota_veiculos')
      .update({ ...updates, updated_at: new Date().toISOString(), updated_by: _user?.id ?? null })
      .eq('tenant_id', TENANT_ID)
      .eq('placa', placa);

    if (error) throw error;
    // frota_movimentacoes is populated automatically by the trigger fn_log_frota_movimentacao
  }

  function showRetornoModal(v) {
    const now = new Date();
    const nowLocal = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    const modal = createModal('Registrar Retorno', `
      <div class="form-group">
        <label class="form-label" for="ret-dt">Data/Hora do Retorno <span class="required">*</span></label>
        <input class="form-input" type="datetime-local" id="ret-dt" value="${nowLocal}" required />
      </div>
      <div class="form-group">
        <label class="form-label" for="ret-ponto">Ponto de Retorno</label>
        <select class="form-select" id="ret-ponto">
          ${PONTOS.map((p) => `<option value="${p}" ${v.ponto_retorno === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="ret-obs">Observações</label>
        <textarea class="form-textarea" id="ret-obs" placeholder="Estado do veículo, danos, etc."></textarea>
      </div>
    `, async () => {
      const dt = document.getElementById('ret-dt').value;
      const ponto = document.getElementById('ret-ponto').value;
      const obs = document.getElementById('ret-obs').value.trim();

      if (!dt) { showToast('Informe a data/hora do retorno.', 'warning'); return false; }

      await updateVeiculo({ status: 'DEVOLVIDO', limpo: false, patio_atual: ponto, ponto_retorno: ponto });
      showToast('Retorno registrado!', 'success');
      return true;
    });
  }

  async function enviarLavador(v) {
    if (!confirm(`Enviar ${v.placa} para o lavador?`)) return;
    try {
      const agora = new Date().toISOString();
      await updateVeiculo({ status: 'NO_LAVADOR', hora_entrada_lavador: agora, patio_atual: 'Lavador' });
      showToast('Veículo enviado ao lavador!', 'success');
      await loadData();
    } catch (err) {
      logger.error('Enviar lavador:', err);
      showToast('Erro ao enviar para o lavador.', 'error');
    }
  }

  async function marcarLimpo(v) {
    if (!confirm(`Marcar ${v.placa} como limpo e disponível?`)) return;
    try {
      await updateVeiculo({ status: 'DISPONIVEL', limpo: true });
      showToast('Veículo marcado como limpo!', 'success');
      await loadData();
    } catch (err) {
      logger.error('Marcar limpo:', err);
      showToast('Erro ao marcar como limpo.', 'error');
    }
  }

  async function marcarDisponivel(v) {
    if (!confirm(`Marcar ${v.placa} como disponível?`)) return;
    try {
      await updateVeiculo({ status: 'DISPONIVEL' });
      showToast('Veículo disponível!', 'success');
      await loadData();
    } catch (err) {
      logger.error('Marcar disponivel:', err);
      showToast('Erro.', 'error');
    }
  }

  async function saiuLavador(v) {
    if (!confirm(`Confirmar saída do lavador e marcar ${v.placa} como limpo?`)) return;
    try {
      await updateVeiculo({ status: 'DISPONIVEL', limpo: true, patio_atual: v.patio_atual === 'Lavador' ? 'Garagem' : v.patio_atual });
      showToast('Veículo saiu do lavador!', 'success');
      await loadData();
    } catch (err) {
      logger.error('Saiu lavador:', err);
      showToast('Erro.', 'error');
    }
  }

  async function colocarManutencao(v) {
    const obs = prompt('Motivo da manutenção (opcional):') ?? '';
    try {
      await updateVeiculo({ status: 'MANUTENCAO' });
      showToast('Veículo em manutenção.', 'warning');
      await loadData();
    } catch (err) {
      logger.error('Manutencao:', err);
      showToast('Erro.', 'error');
    }
  }

  async function sairManutencao(v) {
    if (!confirm(`Retirar ${v.placa} da manutenção?`)) return;
    try {
      await updateVeiculo({ status: 'DISPONIVEL', limpo: true });
      showToast('Veículo disponível!', 'success');
      await loadData();
    } catch (err) {
      logger.error('Sair manutencao:', err);
      showToast('Erro.', 'error');
    }
  }

  function showMoverPatioModal(v) {
    createModal('Mover Pátio', `
      <div class="form-group">
        <label class="form-label" for="patio-select">Pátio de destino</label>
        <select class="form-select" id="patio-select">
          ${PONTOS.map((p) => `<option value="${p}" ${v.patio_atual === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
    `, async () => {
      const patio = document.getElementById('patio-select').value;
      await updateVeiculo({ patio_atual: patio });
      showToast(`Veículo movido para ${patio}!`, 'success');
      return true;
    });
  }

  function showSaidaModal(v) {
    createModal('Registrar Saída', `
      <div class="form-group">
        <label class="form-label" for="saida-ponto">Ponto de Retirada</label>
        <select class="form-select" id="saida-ponto">
          ${PONTOS.map((p) => `<option value="${p}" ${v.ponto_retirada === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="saida-retorno">Ponto de Retorno Previsto</label>
        <select class="form-select" id="saida-retorno">
          ${PONTOS.map((p) => `<option value="${p}">${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="saida-prev">Retorno Previsto</label>
        <input class="form-input" type="datetime-local" id="saida-prev" />
      </div>
    `, async () => {
      const ponto = document.getElementById('saida-ponto').value;
      const retorno = document.getElementById('saida-retorno').value;
      const prev = document.getElementById('saida-prev').value;

      await updateVeiculo({
        status: 'LOCADO',
        limpo: true,
        patio_atual: null,
        ponto_retirada: ponto,
        ponto_retorno: retorno,
        prev_retorno: prev ? new Date(prev).toISOString() : null
      });
      showToast('Saída registrada!', 'success');
      return true;
    });
  }

  function createModal(title, bodyHtml, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="modal-header">
          <h2 class="modal-title">${escapeHtml(title)}</h2>
          <button class="modal-close" aria-label="Fechar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-footer">
          <button class="btn btn-secondary modal-cancel">Cancelar</button>
          <button class="btn btn-primary modal-confirm">Confirmar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.querySelector('.modal-cancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    const confirmBtn = overlay.querySelector('.modal-confirm');
    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.classList.add('btn-loading');
      try {
        const ok = await onConfirm();
        if (ok !== false) {
          close();
          await loadData();
        }
      } catch (err) {
        logger.error('Modal confirm error:', err);
        showToast('Erro ao salvar. Tente novamente.', 'error');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('btn-loading');
      }
    });

    return overlay;
  }

  await loadData();

  _channel = subscribeVeiculos((payload) => {
    if (payload.new?.placa === placa || payload.old?.placa === placa) {
      loadData();
    }
  });

  return () => {};
}
