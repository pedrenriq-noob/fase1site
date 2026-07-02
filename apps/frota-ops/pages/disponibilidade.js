import { supabase, TENANT_ID } from '../js/supabase.js';
import {
  calcularDisponibilidade, statusLabel, escapeHtml, showToast, logger,
  CATEGORIAS, PONTOS, formatDate
} from '../js/utils.js';

export async function init(container) {
  const now = new Date();
  const defaultStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T10:00`;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultEnd = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}T10:00`;

  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Disponibilidade</h1>
        <p class="page-subtitle">Consulte se há veículos disponíveis para um período</p>
      </div>

      <div class="card mb-md">
        <form id="disp-form" novalidate>
          <div class="stack">
            <div class="form-group">
              <label class="form-label" for="disp-cat">Categoria <span class="required">*</span></label>
              <select class="form-select" id="disp-cat" required>
                <option value="">Selecione uma categoria</option>
                ${CATEGORIAS.map((c) => `<option value="${c}">${escapeHtml(c)}</option>`).join('')}
              </select>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="disp-inicio">Início <span class="required">*</span></label>
                <input class="form-input" type="datetime-local" id="disp-inicio" value="${defaultStart}" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="disp-fim">Fim <span class="required">*</span></label>
                <input class="form-input" type="datetime-local" id="disp-fim" value="${defaultEnd}" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="disp-ponto">Ponto de Retirada</label>
              <select class="form-select" id="disp-ponto">
                <option value="">Qualquer ponto</option>
                ${PONTOS.map((p) => `<option value="${p}">${escapeHtml(p)}</option>`).join('')}
              </select>
            </div>

            <button type="submit" class="btn btn-primary" id="disp-submit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Verificar Disponibilidade
            </button>
          </div>
        </form>
      </div>

      <div id="disp-result"></div>
    </div>
  `;

  const form = document.getElementById('disp-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const cat = document.getElementById('disp-cat').value;
    const inicio = document.getElementById('disp-inicio').value;
    const fim = document.getElementById('disp-fim').value;

    if (!cat) { showToast('Selecione uma categoria.', 'warning'); return; }
    if (!inicio) { showToast('Informe a data/hora de início.', 'warning'); return; }
    if (!fim) { showToast('Informe a data/hora de fim.', 'warning'); return; }

    const inicioD = new Date(inicio);
    const fimD = new Date(fim);

    if (fimD <= inicioD) { showToast('A data de fim deve ser após o início.', 'warning'); return; }

    const submitBtn = document.getElementById('disp-submit');
    submitBtn.disabled = true;
    submitBtn.classList.add('btn-loading');

    const resultDiv = document.getElementById('disp-result');
    resultDiv.innerHTML = `<div class="loading-screen" style="min-height:20vh;"><div class="spinner"></div></div>`;

    try {
      const [veiculosRes, reservasRes] = await Promise.all([
        supabase.from('frota_veiculos').select('*').eq('tenant_id', TENANT_ID).eq('categoria', cat),
        supabase.from('frota_reservas').select('*').eq('tenant_id', TENANT_ID).eq('categoria', cat)
          .in('status', ['PREVISTO', 'CONFIRMADO'])
      ]);

      if (veiculosRes.error) throw veiculosRes.error;
      if (reservasRes.error) throw reservasRes.error;

      const veiculos = veiculosRes.data ?? [];
      const reservas = reservasRes.data ?? [];

      const resultado = calcularDisponibilidade(cat, inicioD, fimD, veiculos, reservas);
      renderResult(resultado, cat, inicioD, fimD, resultDiv);
    } catch (err) {
      logger.error('Disponibilidade error:', err);
      resultDiv.innerHTML = `<div class="alert alert-error">Erro ao verificar disponibilidade.</div>`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('btn-loading');
    }
  });

  function renderResult(resultado, cat, inicio, fim, el) {
    const { disponivel, total, detalhes, overbooking, overbooking_qtd } = resultado;
    const available = disponivel > 0;

    el.innerHTML = `
      <div class="disp-result ${available ? 'available' : 'unavailable'}">
        <div class="disp-number ${available ? 'available' : 'unavailable'}">${disponivel}</div>
        <div class="disp-label">
          ${disponivel === 1 ? 'veículo disponível' : 'veículos disponíveis'}
          ${total > 0 ? `de ${total} na categoria ${escapeHtml(cat)}` : ''}
        </div>
        <p class="text-sm text-muted mt-sm">
          ${formatDate(inicio)} → ${formatDate(fim)}
        </p>
      </div>

      ${overbooking ? `
      <div class="alert alert-error mt-md">
        ⚠ Overbooking previsto na categoria ${escapeHtml(cat)}: ${overbooking_qtd}
        reserva${overbooking_qtd > 1 ? 's' : ''} a mais do que veículos disponíveis no período.
      </div>` : ''}

      ${detalhes.length > 0 ? `
      <div class="card mt-md" style="padding:0;">
        <div style="padding: 12px 16px; border-bottom: 1px solid var(--border);">
          <p class="card-title text-sm">Detalhamento por veículo</p>
        </div>
        ${detalhes.map((d) => `
          <div class="info-row" style="padding: 10px 16px; cursor:pointer;"
               onclick="location.hash='#/veiculo/${escapeHtml(d.placa)}'">
            <div>
              <span class="font-semibold font-mono">${escapeHtml(d.placa)}</span>
              <span class="text-sm text-muted ml-sm">${escapeHtml(d.modelo ?? '')}</span>
            </div>
            <div style="text-align:right;">
              <span style="color: ${d.disponivel ? 'var(--green)' : 'var(--red)'}; font-weight:600; font-size:0.875rem;">
                ${d.disponivel ? '✓ Disponível' : '✗ Indisponível'}
              </span>
              <div class="text-xs text-muted">${escapeHtml(d.motivo)}</div>
            </div>
          </div>
        `).join('')}
      </div>` : `
      <div class="card mt-md">
        <p class="text-muted text-sm">Nenhum veículo desta categoria cadastrado no sistema.</p>
      </div>`}
    `;
  }
}
