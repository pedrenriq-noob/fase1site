// IdleWindowService — página de consumo (frota-ops/pages/ociosidade.js).
// Não recalcula disponibilidade: reinterpreta frota_veiculos + frota_reservas
// para responder "existe oportunidade de locação curta antes da próxima
// ocupação conhecida?" (ver identificarJanelasOciosidade em ../js/idle-window.js).
//
// A partir de 2026-07-06, as janelas geométricas do IdleWindowService passam
// por um segundo filtro de viabilidade COMERCIAL (período consultado, horário
// de funcionamento do local, limiar mínimo de 30h, diárias recomendadas) via
// OportunidadeComercialService — ver ../js/services/oportunidade-comercial.js
// e docs/domain/OportunidadeComercial.md.
import { supabase, TENANT_ID } from '../js/supabase.js';
import { identificarJanelasOciosidade } from '../js/idle-window.js';
import { filtrarOportunidadesComerciais } from '../js/services/oportunidade-comercial.js';
import {
  calcularDisponivel, escapeHtml, showToast, logger, formatDate, CATEGORIAS
} from '../js/utils.js';

const UM_DIA_MS = 86400000;

function formatDateInput(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export async function init(container) {
  // Regra 3: sem período informado, default é hoje + próximos 15 dias.
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const daqui15Dias = new Date(hoje.getTime() + 15 * UM_DIA_MS);

  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Ociosidade</h1>
        <p class="page-subtitle">Oportunidades reais de locação curta sem comprometer reservas futuras</p>
      </div>

      <div class="card mb-md">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Data inicial</label>
            <input type="date" class="form-input" id="ocio-data-inicial" value="${formatDateInput(hoje)}" />
          </div>
          <div class="form-group">
            <label class="form-label">Data final</label>
            <input type="date" class="form-input" id="ocio-data-final" value="${formatDateInput(daqui15Dias)}" />
          </div>
          <div class="form-group">
            <label class="form-label">Categoria</label>
            <select class="form-select" id="ocio-categoria">
              <option value="TODAS">Todas</option>
              ${CATEGORIAS.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
            </select>
          </div>
        </div>
        <button class="btn btn-primary btn-sm mt-sm" id="ocio-aplicar">Aplicar filtros</button>
      </div>

      <div id="ocio-result"><div class="loading-screen" style="min-height:20vh;"><div class="spinner"></div></div></div>
    </div>
  `;

  document.getElementById('ocio-aplicar').addEventListener('click', () => carregar());

  const resultDiv = document.getElementById('ocio-result');

  async function carregar() {
    resultDiv.innerHTML = `<div class="loading-screen" style="min-height:20vh;"><div class="spinner"></div></div>`;

    const dataInicialStr = document.getElementById('ocio-data-inicial').value;
    const dataFinalStr = document.getElementById('ocio-data-final').value;
    const categoriaSelecionada = document.getElementById('ocio-categoria').value;

    // Regra 3: campo vazio volta ao default (hoje / hoje+15 dias).
    const periodoInicio = dataInicialStr ? new Date(`${dataInicialStr}T00:00:00`) : hoje;
    const periodoFim = dataFinalStr ? new Date(`${dataFinalStr}T23:59:59`) : daqui15Dias;

    try {
      const [veiculosRes, reservasRes, patiosRes, locaisRes] = await Promise.all([
        supabase.from('frota_veiculos').select('categoria, status, patio_atual').eq('tenant_id', TENANT_ID),
        supabase.from('frota_reservas')
          .select('categoria, data_saida, data_retorno_prev, locacao_numero, cliente, status')
          .eq('tenant_id', TENANT_ID)
          .in('status', ['PREVISTO', 'CONFIRMADO']),
        supabase.from('frota_patios').select('nome, locais_id').eq('tenant_id', TENANT_ID),
        supabase.from('locais')
          .select('id, hora_retirada_inicio, hora_retirada_fim, hora_devolucao_inicio, hora_devolucao_fim, disponivel_domingo')
          .eq('tenant_id', TENANT_ID)
      ]);

      if (veiculosRes.error) throw veiculosRes.error;
      if (reservasRes.error) throw reservasRes.error;
      if (patiosRes.error) throw patiosRes.error;
      if (locaisRes.error) throw locaisRes.error;

      const veiculos = veiculosRes.data ?? [];
      const reservas = reservasRes.data ?? [];
      const patios = patiosRes.data ?? [];
      const locais = locaisRes.data ?? [];

      // Regra 5: horário de funcionamento vem da configuração operacional
      // (tabela locais), nunca fixo no código. Resolvido por patio_atual do
      // veículo -> frota_patios.locais_id -> locais (ver sql/031 e ADR
      // implícita: pátio sem vínculo = sem restrição de horário, o mesmo
      // comportamento de locais com colunas de hora NULL).
      const locaisPorId = new Map(locais.map((l) => [l.id, l]));
      const horarioPorPatio = new Map(
        patios
          .filter((p) => p.locais_id && locaisPorId.has(p.locais_id))
          .map((p) => [p.nome, locaisPorId.get(p.locais_id)])
      );

      const totalPorCategoria = {};
      for (const v of veiculos) {
        totalPorCategoria[v.categoria] = (totalPorCategoria[v.categoria] ?? 0) + 1;
      }

      const agora = new Date();
      const categoriasAlvo = categoriaSelecionada === 'TODAS' ? CATEGORIAS : [categoriaSelecionada];

      const gruposPorCategoria = categoriasAlvo
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

          // Local de referência: pátio dos veículos hoje DISPONÍVEIS da
          // categoria. Se houver mais de um pátio distinto com horários
          // diferentes entre esses veículos, não há um único horário válido
          // para o pool inteiro — aplicar sem restrição é a opção
          // conservadora (nunca esconde uma oportunidade real por engano),
          // documentada como limitação conhecida (ver MIGRATION_LOG.md).
          const patiosDisponiveisDaCategoria = [...new Set(
            veiculos.filter((v) => v.categoria === cat && v.status === 'DISPONIVEL' && v.patio_atual).map((v) => v.patio_atual)
          )];
          const horariosDistintos = [...new Set(
            patiosDisponiveisDaCategoria.map((nome) => horarioPorPatio.get(nome) ?? null)
          )];
          const horarioLocal = horariosDistintos.length === 1 ? horariosDistintos[0] : null;

          const oportunidades = filtrarOportunidadesComerciais(janelas, {
            minHoras: 30, periodoInicio, periodoFim, horarioLocal
          });

          return { categoria: cat, oportunidades };
        })
        .filter((c) => c.oportunidades.length > 0);

      renderResult(gruposPorCategoria, resultDiv);
    } catch (err) {
      logger.error('Ociosidade error:', err);
      resultDiv.innerHTML = `<div class="alert alert-error">Erro ao calcular janelas de ociosidade.</div>`;
      showToast('Erro ao calcular ociosidade.', 'error');
    }
  }

  await carregar();
}

function tempoMaximoRecomendavel(oportunidade) {
  const { diarias } = oportunidade.recomendacao;
  return `Até ${diarias} diária${diarias > 1 ? 's' : ''} (${Math.round(oportunidade.duracao_horas)}h disponíveis)`;
}

function renderResult(gruposPorCategoria, el) {
  if (gruposPorCategoria.length === 0) {
    el.innerHTML = `
      <div class="card">
        <p class="text-muted text-sm">Nenhuma oportunidade comercialmente viável identificada no período/categoria selecionados.</p>
      </div>`;
    return;
  }

  el.innerHTML = gruposPorCategoria.map(({ categoria, oportunidades }) => `
    <div class="card mt-md" style="padding:0;">
      <div style="padding: 12px 16px; border-bottom: 1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
        <p class="card-title text-sm">Categoria ${escapeHtml(categoria)}</p>
        <span class="text-xs text-muted">${oportunidades.length} oportunidade${oportunidades.length > 1 ? 's' : ''}</span>
      </div>
      ${oportunidades.map((o) => `
        <div class="info-row" style="padding: 10px 16px; flex-direction:column; align-items:stretch; gap:4px;">
          <div style="display:flex; justify-content:space-between;">
            <span class="font-semibold">${o.veiculos_livres} veículo${o.veiculos_livres > 1 ? 's' : ''} livre${o.veiculos_livres > 1 ? 's' : ''}</span>
            <span class="text-sm text-muted">${Math.round(o.duracao_horas)}h disponíveis</span>
          </div>
          <div class="text-sm">
            ${formatDate(o.inicio)} → <span class="font-semibold">${formatDate(o.fim)}</span> (devolução máxima segura da janela)
          </div>
          <div class="text-xs text-muted">${tempoMaximoRecomendavel(o)}</div>
          <div class="text-xs font-semibold">Devolução máxima recomendada: ${formatDate(o.recomendacao.devolucaoMaxima)}</div>
        </div>
      `).join('')}
    </div>
  `).join('');
}
