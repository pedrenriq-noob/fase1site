// IdleWindowService — página de consumo (frota-ops/pages/ociosidade.js).
// Não recalcula disponibilidade: só reinterpreta frota_veiculos + frota_reservas
// para responder "existe oportunidade de locação curta antes da próxima ocupação
// conhecida?" (ver identificarJanelasOciosidade em ../js/idle-window.js).
import { supabase, TENANT_ID } from '../js/supabase.js';
import { identificarJanelasOciosidade } from '../js/idle-window.js';
import {
  calcularDisponivel, escapeHtml, showToast, logger, formatDate, CATEGORIAS
} from '../js/utils.js';

export async function init(container) {
  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Ociosidade</h1>
        <p class="page-subtitle">Janelas de locação curta entre uma devolução e a próxima ocupação conhecida</p>
      </div>
      <div id="ocio-result"><div class="loading-screen" style="min-height:20vh;"><div class="spinner"></div></div></div>
    </div>
  `;

  const resultDiv = document.getElementById('ocio-result');

  try {
    const [veiculosRes, reservasRes] = await Promise.all([
      supabase.from('frota_veiculos').select('categoria').eq('tenant_id', TENANT_ID),
      supabase.from('frota_reservas')
        .select('categoria, data_saida, data_retorno_prev, locacao_numero, cliente, status')
        .eq('tenant_id', TENANT_ID)
        .in('status', ['PREVISTO', 'CONFIRMADO'])
    ]);

    if (veiculosRes.error) throw veiculosRes.error;
    if (reservasRes.error) throw reservasRes.error;

    const veiculos = veiculosRes.data ?? [];
    const reservas = reservasRes.data ?? [];

    const totalPorCategoria = {};
    for (const v of veiculos) {
      totalPorCategoria[v.categoria] = (totalPorCategoria[v.categoria] ?? 0) + 1;
    }

    const agora = new Date();
    const janelasPorCategoria = CATEGORIAS
      .filter((cat) => totalPorCategoria[cat] > 0)
      .map((cat) => {
        const ocupacoes = reservas
          .filter((r) => r.categoria === cat)
          .map((r) => ({
            inicio: r.data_saida,
            fim: r.data_retorno_prev,
            origem: 'reserva',
            referencia: { locacao_numero: r.locacao_numero, cliente: r.cliente, status: r.status }
          }));
        const janelas = identificarJanelasOciosidade(cat, totalPorCategoria[cat], ocupacoes, {
          agora, calcularLiberacao: calcularDisponivel
        });
        return { categoria: cat, janelas };
      })
      .filter((c) => c.janelas.length > 0);

    renderResult(janelasPorCategoria, resultDiv);
  } catch (err) {
    logger.error('Ociosidade error:', err);
    resultDiv.innerHTML = `<div class="alert alert-error">Erro ao calcular janelas de ociosidade.</div>`;
    showToast('Erro ao calcular ociosidade.', 'error');
  }
}

function tempoMaximoRecomendavel(janela) {
  const horas = janela.duracao_horas;
  if (horas < 4) return 'Não recomendado (janela muito curta)';
  const diarias = Math.max(1, Math.floor(horas / 24));
  return `Até ${diarias} diária${diarias > 1 ? 's' : ''}`;
}

function renderResult(janelasPorCategoria, el) {
  if (janelasPorCategoria.length === 0) {
    el.innerHTML = `
      <div class="card">
        <p class="text-muted text-sm">Nenhuma oportunidade de locação curta identificada no momento.</p>
      </div>`;
    return;
  }

  el.innerHTML = janelasPorCategoria.map(({ categoria, janelas }) => `
    <div class="card mt-md" style="padding:0;">
      <div style="padding: 12px 16px; border-bottom: 1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
        <p class="card-title text-sm">Categoria ${escapeHtml(categoria)}</p>
        <span class="text-xs text-muted">${janelas.length} oportunidade${janelas.length > 1 ? 's' : ''}</span>
      </div>
      ${janelas.map((j) => `
        <div class="info-row" style="padding: 10px 16px; flex-direction:column; align-items:stretch; gap:4px;">
          <div style="display:flex; justify-content:space-between;">
            <span class="font-semibold">${j.veiculos_livres} veículo${j.veiculos_livres > 1 ? 's' : ''} livre${j.veiculos_livres > 1 ? 's' : ''}</span>
            <span class="text-sm text-muted">${Math.round(j.duracao_horas)}h disponíveis</span>
          </div>
          <div class="text-sm">
            ${formatDate(j.inicio)} → <span class="font-semibold">${formatDate(j.fim)}</span> (devolução máxima segura)
          </div>
          <div class="text-xs text-muted">${tempoMaximoRecomendavel(j)}</div>
        </div>
      `).join('')}
    </div>
  `).join('');
}
