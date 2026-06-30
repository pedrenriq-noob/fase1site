// ─── CONFIG ──────────────────────────────────────────────────────────────────
const SPREADSHEET_ID = '1GZHmTy6K_QGZD5R_DR5gdN2TQr-aEYXQU-ob5-LvOtM';
const SHEET_NAME     = 'Cadastro';
const SHEET_RESERVAS = 'Reservas Futuras';
const RANGE_READ     = `${SHEET_NAME}!A:I`;
const RANGE_RESERVAS = `${SHEET_RESERVAS}!A:H`;  // G=Código, H=Status (novas colunas)
const SHEETS_BASE    = 'https://sheets.googleapis.com/v4/spreadsheets';

// ─── STATE ───────────────────────────────────────────────────────────────────
let itemsData    = [];   // itens do Cadastro
let statusData   = {};   // resumo por categoria
let reservasData = [];   // Reservas Futuras (inclui status G e H)
let isSyncing    = false;
let isLoading    = false;
let activeReserva = null; // reserva sendo confirmada via form de Saída

// ─── DOM ─────────────────────────────────────────────────────────────────────
const btnSync          = document.getElementById('btnSync');
const syncIcon         = document.getElementById('syncIcon');
const statusGrid       = document.getElementById('statusGrid');
const lastSyncEl       = document.getElementById('lastSync');
const selectCat        = document.getElementById('selectCategoria');
const selectCod        = document.getElementById('selectCodigo');
const inputPrevRetorno = document.getElementById('inputPrevRetorno');
const btnRegistrarSaida = document.getElementById('btnRegistrarSaida');
const selectCatRes     = document.getElementById('selectCatRes');
const inputQtd         = document.getElementById('inputQtd');
const inputDataSaida   = document.getElementById('inputDataSaida');
const inputDataDev     = document.getElementById('inputDataDev');
const inputObsRes      = document.getElementById('inputObsRes');
const btnAdicionarReserva = document.getElementById('btnAdicionarReserva');

// ─── INIT ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadFromStorage();
  renderAll();
  setupEventListeners();
});

async function loadFromStorage() {
  return new Promise(resolve => {
    chrome.storage.local.get(['statusData', 'itemsData', 'reservasData', 'lastSync'], data => {
      statusData   = data.statusData   || {};
      itemsData    = data.itemsData    || [];
      reservasData = data.reservasData || [];
      if (data.lastSync) lastSyncEl.textContent = `Última sincronização: ${data.lastSync}`;
      resolve();
    });
  });
}

function renderAll() {
  renderStatus();
  renderReservas();
  renderLocados();
  renderPrevisao();
  populateCategoryDropdowns();
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `show ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = ''; }, duration);
}

// ─── AUTH ────────────────────────────────────────────────────────────────────
function getAccessToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, token => {
      if (chrome.runtime.lastError || !token)
        reject(new Error(chrome.runtime.lastError?.message || 'Falha na autenticação'));
      else
        resolve(token);
    });
  });
}

function removeCachedToken(token) {
  return new Promise(resolve => chrome.identity.removeCachedAuthToken({ token }, resolve));
}

// ─── API HELPERS ─────────────────────────────────────────────────────────────
async function sheetsGet(token, range) {
  const url = `${SHEETS_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error('401');
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`); }
  return (await res.json()).values || [];
}

async function sheetsPut(token, range, values) {
  const url = `${SHEETS_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ range, majorDimension: 'ROWS', values })
  });
  if (res.status === 401) throw new Error('401');
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`); }
}

async function sheetsAppend(token, range, values) {
  const url = `${SHEETS_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ majorDimension: 'ROWS', values })
  });
  if (res.status === 401) throw new Error('401');
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`); }
}

// ─── SYNC ────────────────────────────────────────────────────────────────────
async function syncData() {
  if (isSyncing) return;
  isSyncing = true;
  btnSync.disabled = true;
  syncIcon.classList.add('spin');
  showToast('Sincronizando…', 'info');

  try {
    const token = await getAccessToken(true);
    const [cadastroRows, reservasRows] = await Promise.all([
      sheetsGet(token, RANGE_READ),
      sheetsGet(token, RANGE_RESERVAS)
    ]);

    processSheetData(cadastroRows);
    processReservasData(reservasRows);

    const now = new Date().toLocaleString('pt-BR');
    chrome.storage.local.set({ statusData, itemsData, reservasData, lastSync: now });
    lastSyncEl.textContent = `Última sincronização: ${now}`;

    renderAll();
    showToast('Sincronizado!', 'success');
  } catch (err) {
    console.error('sync:', err);
    showToast(`Erro: ${err.message}`, 'error', 4000);
  } finally {
    isSyncing = false;
    btnSync.disabled = false;
    syncIcon.classList.remove('spin');
  }
}

// ─── PROCESS DATA ─────────────────────────────────────────────────────────────
function normalizeStatus(s) {
  const u = (s || '').toUpperCase().trim();
  if (u === 'DISPONÍVEL' || u === 'DISPONIVEL') return 'DISPONIVEL';
  if (u === 'LOCADO') return 'LOCADO';
  return u || 'DISPONIVEL';
}

function processSheetData(rows) {
  itemsData  = [];
  statusData = {};
  rows.slice(2).forEach((row, i) => {
    const categoria   = (row[0] || '').trim().toUpperCase();
    const codigo      = (row[1] || '').trim();
    const marca       = (row[2] || '').trim();
    const status      = normalizeStatus(row[3]);
    const prevRetorno = (row[6] || '').trim();
    if (!codigo || !categoria) return;
    itemsData.push({ categoria, codigo, marca, status, prevRetorno, rowIndex: i + 3 });
    if (!statusData[categoria]) statusData[categoria] = { total: 0, disponivel: 0, locado: 0, outros: 0 };
    statusData[categoria].total++;
    if (status === 'DISPONIVEL')  statusData[categoria].disponivel++;
    else if (status === 'LOCADO') statusData[categoria].locado++;
    else                          statusData[categoria].outros++;
  });
}

function parseDate(str) {
  if (!str) return null;
  const parts = str.split(' ')[0].split('/');
  if (parts.length < 3) return null;
  let year = parseInt(parts[2]);
  if (year < 100) year += 2000;
  return new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));
}

function processReservasData(rows) {
  reservasData = [];
  rows.slice(3).forEach((row, i) => {
    const categoria     = (row[0] || '').trim().toUpperCase();
    const quantidade    = parseInt(row[1] || '1') || 1;
    const dataRetirada  = (row[2] || '').trim();
    const dataDevolucao = (row[3] || '').trim();
    const obs           = (row[4] || '').trim();
    const cadastradoPor = (row[5] || '').trim();
    const codigoRes     = (row[6] || '').trim();   // G – código atribuído ao confirmar
    const status        = (row[7] || 'PREVISTO').trim().toUpperCase() || 'PREVISTO'; // H – status
    if (!categoria || !dataRetirada) return;
    reservasData.push({ categoria, quantidade, dataRetirada, dataDevolucao, obs, cadastradoPor, codigoRes, status, rowIndex: i + 4 });
  });
}

// ─── RENDER STATUS ────────────────────────────────────────────────────────────
function renderStatus() {
  const cats = Object.keys(statusData);
  if (!cats.length) {
    statusGrid.innerHTML = '<div class="empty-msg" style="grid-column:1/-1">Clique em Sincronizar para carregar dados</div>';
    return;
  }
  statusGrid.innerHTML = cats.map(cat => {
    const d   = statusData[cat];
    const pct = d.total > 0 ? d.disponivel / d.total : 1;
    const cls = pct === 0 ? 'warn' : pct === 1 ? 'ok' : '';
    const name = cat.replace('CADEIRA DE BEBE', 'CADEIRA BEBÊ').replace('BEBE CONFORTO', 'BEBÊ CONFORTO');
    const inativos = d.outros ? ` · ${d.outros} inativo${d.outros > 1 ? 's' : ''}` : '';
    return `
      <div class="status-card ${cls}">
        <div class="status-card-name" title="${cat}">${name}</div>
        <div class="status-card-count">${d.disponivel}<span style="font-size:13px;font-weight:400">/${d.total}</span></div>
        <div class="status-card-sub">${d.locado} locado${d.locado !== 1 ? 's' : ''}${inativos}</div>
      </div>`;
  }).join('');
}

// ─── RENDER RESERVAS PREVISTAS ────────────────────────────────────────────────
function renderReservas() {
  const listEl  = document.getElementById('reservasList');
  const countEl = document.getElementById('reservasCount');

  // Apenas PREVISTO — CONFIRMADO já está em Cadastro como LOCADO (sem fantasma)
  const previstas = reservasData
    .filter(r => r.status === 'PREVISTO' || !r.status)
    .sort((a, b) => (parseDate(a.dataRetirada) || 0) - (parseDate(b.dataRetirada) || 0));

  countEl.style.display = previstas.length ? '' : 'none';
  countEl.textContent   = previstas.length || '';

  if (!previstas.length) {
    listEl.innerHTML = '<div class="empty-msg">Nenhuma reserva futura</div>';
    return;
  }

  const hoje    = new Date(); hoje.setHours(0, 0, 0, 0);
  const em3dias = new Date(hoje.getTime() + 3 * 86400000);

  listEl.innerHTML = previstas.map(r => {
    const d       = parseDate(r.dataRetirada);
    const urgente = d && d <= em3dias;
    const catShort = r.categoria.replace('CADEIRA DE BEBE', 'CADEIRA BEBÊ').replace('BEBE CONFORTO', 'BEBÊ CONFORTO');
    const sub = [
      `×${r.quantidade}`,
      r.dataDevolucao ? `Dev ${r.dataDevolucao}` : '',
      r.obs || '',
      r.cadastradoPor ? `por ${r.cadastradoPor}` : ''
    ].filter(Boolean).join(' · ');

    return `
      <div class="reserva-card${urgente ? ' urgente' : ''}" data-row="${r.rowIndex}">
        <div class="rc-info">
          <div class="rc-title">
            ${r.dataRetirada} · ${catShort}
            ${urgente ? '<span class="badge-urgente">em breve</span>' : ''}
          </div>
          <div class="rc-sub">${sub}</div>
        </div>
        <div class="rc-actions">
          <button class="btn-saida btn-confirmar-saida" data-row="${r.rowIndex}" title="Confirmar saída">▶</button>
          <button class="btn-cancel-res btn-cancelar-res" data-row="${r.rowIndex}" title="Cancelar reserva">✕</button>
        </div>
      </div>`;
  }).join('');

  listEl.querySelectorAll('.btn-confirmar-saida').forEach(btn => {
    btn.addEventListener('click', () => iniciarConfirmacaoSaida(Number(btn.dataset.row)));
  });
  listEl.querySelectorAll('.btn-cancelar-res').forEach(btn => {
    btn.addEventListener('click', () => cancelarReserva(Number(btn.dataset.row)));
  });
}

// ─── RENDER LOCADOS ───────────────────────────────────────────────────────────
function renderLocados() {
  const listEl  = document.getElementById('locadosList');
  const countEl = document.getElementById('locadosCount');

  const locados = itemsData
    .filter(i => i.status === 'LOCADO')
    .sort((a, b) => (parseDate(a.prevRetorno) || new Date(9999, 0, 1)) - (parseDate(b.prevRetorno) || new Date(9999, 0, 1)));

  countEl.style.display = locados.length ? '' : 'none';
  countEl.textContent   = locados.length || '';

  if (!locados.length) {
    listEl.innerHTML = '<div class="empty-msg">Nenhum item locado</div>';
    return;
  }

  const hoje    = new Date();
  const todayMs = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();

  listEl.innerHTML = locados.map(item => {
    const d        = parseDate(item.prevRetorno);
    const dMs      = d ? d.getTime() : null;
    const atrasado = dMs && dMs < todayMs;
    const ehHoje   = dMs && dMs === todayMs;
    const cls      = atrasado ? ' atrasado' : ehHoje ? ' hoje' : '';

    let badge = '';
    if (atrasado) badge = '<span class="badge-atraso">ATRASADO</span>';
    else if (ehHoje) badge = '<span class="badge-hoje">HOJE</span>';

    const catShort  = item.categoria.replace('CADEIRA DE BEBE', 'CADEIRA BEBÊ').replace('BEBE CONFORTO', 'BEBÊ CONFORTO');
    const marcaTxt  = item.marca ? `<span class="marca">(${item.marca})</span>` : '';
    const retornoTxt = item.prevRetorno ? ` · ${item.prevRetorno}` : '';

    return `
      <div class="locado-item${cls}">
        <div class="locado-info">
          <div class="locado-title">${item.codigo} ${marcaTxt} ${badge}</div>
          <div class="locado-sub">${catShort}${retornoTxt}</div>
        </div>
        <button class="btn-retorno" data-codigo="${item.codigo}" data-cat="${item.categoria}">↩ Retorno</button>
      </div>`;
  }).join('');

  listEl.querySelectorAll('.btn-retorno').forEach(btn => {
    btn.addEventListener('click', () => confirmarRetorno(btn.dataset.codigo, btn.dataset.cat, btn));
  });
}

// ─── RENDER PREVISÃO ──────────────────────────────────────────────────────────
function calcDisponibilidadeNaData(dataAlvo) {
  const result = {};
  Object.keys(statusData).forEach(cat => {
    const total = statusData[cat].total;
    const aindaLocados = itemsData.filter(item => {
      if (item.categoria !== cat || item.status !== 'LOCADO') return false;
      const ret = parseDate(item.prevRetorno);
      return !ret || ret > dataAlvo;
    }).length;
    // Somente PREVISTO — CONFIRMADO já está contado como LOCADO em Cadastro
    const reservasAtivas = reservasData
      .filter(r => r.categoria === cat && (r.status === 'PREVISTO' || !r.status))
      .filter(r => {
        const saida = parseDate(r.dataRetirada);
        const dev   = parseDate(r.dataDevolucao);
        return saida && saida <= dataAlvo && (!dev || dev > dataAlvo);
      })
      .reduce((sum, r) => sum + r.quantidade, 0);
    result[cat] = { total, aindaLocados, reservasAtivas, disponivel: total - aindaLocados - reservasAtivas };
  });
  return result;
}

function renderPrevisao() {
  const listEl = document.getElementById('previsaoList');

  const previstas = reservasData.filter(r => r.status === 'PREVISTO' || !r.status);
  if (!previstas.length) {
    listEl.innerHTML = '<div class="empty-msg">Nenhuma reserva futura prevista</div>';
    return;
  }

  const datas = [...new Set(previstas.map(r => r.dataRetirada))]
    .sort((a, b) => (parseDate(a) || 0) - (parseDate(b) || 0));

  if (!Object.keys(statusData).length) {
    listEl.innerHTML = '<div class="empty-msg">Sincronize para calcular a previsão</div>';
    return;
  }

  listEl.innerHTML = datas.map(dataStr => {
    const dataAlvo = parseDate(dataStr);
    if (!dataAlvo) return '';

    const dispPorCat     = calcDisponibilidadeNaData(dataAlvo);
    const reservasNaData = previstas.filter(r => r.dataRetirada === dataStr);
    const qtdPorCat      = {};
    reservasNaData.forEach(r => { qtdPorCat[r.categoria] = (qtdPorCat[r.categoria] || 0) + r.quantidade; });

    const linhas = Object.keys(qtdPorCat).map(cat => {
      const d = dispPorCat[cat];
      if (!d) return '';
      const saiNaData  = qtdPorCat[cat];
      const dispAntes  = d.total - d.aindaLocados - (d.reservasAtivas - saiNaData);
      const dispDepois = dispAntes - saiNaData;

      let cls = '', badge = '';
      if (dispDepois < 0) { cls = 'critico'; badge = `<span class="prev-badge critico">FALTA ${Math.abs(dispDepois)}</span>`; }
      else if (dispDepois === 0) { cls = 'atencao'; badge = `<span class="prev-badge atencao">ZERADO</span>`; }
      else if (dispDepois === 1) { cls = 'atencao'; badge = `<span class="prev-badge atencao">APERTADO</span>`; }

      const name = cat.replace('CADEIRA DE BEBE', 'CADEIRA BEBÊ').replace('BEBE CONFORTO', 'BEBÊ CONFORTO');
      return `
        <div class="prev-item ${cls}">
          <span class="prev-cat">${name}</span>
          <span class="prev-nums">
            ${Math.max(0, dispAntes)}/${d.total} livre${dispAntes !== 1 ? 's' : ''}
            <span class="prev-saida">−${saiNaData}</span>${badge}
          </span>
        </div>`;
    }).join('');

    const cads = [...new Set(reservasNaData.filter(r => r.cadastradoPor).map(r => r.cadastradoPor))].join(', ');
    return `
      <div class="prev-data-header">${dataStr}</div>
      ${linhas}
      ${cads ? `<div class="prev-cad">por ${cads}</div>` : ''}`;
  }).join('');
}

// ─── DROPDOWNS ───────────────────────────────────────────────────────────────
function populateCategoryDropdowns() {
  const cats = [...new Set(itemsData.map(i => i.categoria))].sort();

  // Saída
  const prevCat = selectCat.value;
  selectCat.innerHTML = '<option value="">Selecione…</option>';
  cats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = cat;
    selectCat.appendChild(opt);
  });
  if (prevCat && cats.includes(prevCat)) selectCat.value = prevCat;

  // Nova Reserva
  const prevCatRes = selectCatRes.value;
  selectCatRes.innerHTML = '<option value="">Selecione…</option>';
  cats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = cat;
    selectCatRes.appendChild(opt);
  });
  if (prevCatRes && cats.includes(prevCatRes)) selectCatRes.value = prevCatRes;

  updateCodigoDropdown();
}

function updateCodigoDropdown() {
  const cat = selectCat.value;
  selectCod.disabled = !cat;
  if (!cat) {
    selectCod.innerHTML = '<option value="">Selecione a categoria primeiro…</option>';
    updateSaidaBtn();
    return;
  }

  const disponiveis = itemsData.filter(item => item.categoria === cat && item.status === 'DISPONIVEL');

  if (!disponiveis.length) {
    selectCod.innerHTML = '<option value="">— Nenhum item disponível —</option>';
    updateSaidaBtn();
    return;
  }

  selectCod.innerHTML = '<option value="">Selecione o código…</option>';
  disponiveis.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.codigo;
    opt.textContent = item.marca ? `${item.codigo} (${item.marca})` : item.codigo;
    selectCod.appendChild(opt);
  });
  updateSaidaBtn();
}

function updateSaidaBtn() {
  btnRegistrarSaida.disabled = !(selectCat.value && selectCod.value);
}

function updateReservaBtn() {
  btnAdicionarReserva.disabled = !(selectCatRes.value && inputDataSaida.value.trim());
}

// ─── CONFIRMAR SAÍDA DE RESERVA ───────────────────────────────────────────────
function iniciarConfirmacaoSaida(rowIndex) {
  const r = reservasData.find(x => x.rowIndex === rowIndex);
  if (!r) return;

  activeReserva = r;

  // Muda para aba Saída
  setTab('saida');

  // Pre-preenche categoria (trava) e prevRetorno
  selectCat.value    = r.categoria;
  selectCat.disabled = true;
  updateCodigoDropdown();
  inputPrevRetorno.value = r.dataDevolucao || '';

  // Mostra banner
  const catShort = r.categoria.replace('CADEIRA DE BEBE', 'CADEIRA BEBÊ').replace('BEBE CONFORTO', 'BEBÊ CONFORTO');
  document.getElementById('bannerText').textContent = `Confirmando reserva: ${catShort} · ${r.dataRetirada}`;
  document.getElementById('reservaBanner').style.display = '';

  document.getElementById('sectionForm').scrollIntoView({ behavior: 'smooth' });
  showToast('Selecione o código do item', 'info');
}

function cancelarConfirmacaoAtiva() {
  activeReserva = null;
  selectCat.disabled = false;
  selectCat.value = '';
  updateCodigoDropdown();
  inputPrevRetorno.value = '';
  document.getElementById('reservaBanner').style.display = 'none';
}

// ─── CANCELAR RESERVA ─────────────────────────────────────────────────────────
async function cancelarReserva(rowIndex) {
  const r = reservasData.find(x => x.rowIndex === rowIndex);
  if (!r) return;

  setLoading(true);
  try {
    const token = await getAccessToken(true);
    const range = `${SHEET_RESERVAS}!A${r.rowIndex}:H${r.rowIndex}`;
    await sheetsPut(token, range, [[
      r.categoria, r.quantidade, r.dataRetirada, r.dataDevolucao,
      r.obs, r.cadastradoPor, r.codigoRes, 'CANCELADO'
    ]]);
    showToast('Reserva cancelada.', 'info');
    await syncData();
  } catch (err) {
    console.error('cancelarReserva:', err);
    showToast(`Erro: ${err.message}`, 'error', 4000);
  } finally {
    setLoading(false);
  }
}

// ─── REGISTRAR SAÍDA DIRETA (walk-in ou confirmar reserva) ───────────────────
async function registrarSaida() {
  const categoria   = selectCat.value;
  const codigo      = selectCod.value;
  const prevRetorno = inputPrevRetorno.value.trim();

  if (!categoria || !codigo) {
    showToast('Selecione categoria e código.', 'error');
    return;
  }

  const item = itemsData.find(i => i.codigo === codigo && i.categoria === categoria);
  if (!item || item.status !== 'DISPONIVEL') {
    showToast(`${codigo} não está disponível.`, 'error');
    return;
  }

  setLoading(true);
  try {
    const token = await getAccessToken(true);

    // 1. Atualiza Cadastro: LOCADO + prevRetorno
    const rangeCad = `${SHEET_NAME}!A${item.rowIndex}:I${item.rowIndex}`;
    await sheetsPut(token, rangeCad, [[
      item.categoria, item.codigo, item.marca, 'LOCADO', '', '', prevRetorno, '', ''
    ]]);

    // 2. Se veio de uma reserva: marca como CONFIRMADO na aba Reservas Futuras
    if (activeReserva) {
      const r = activeReserva;
      const novaQtd = r.quantidade - 1;
      const novoStatus = novaQtd <= 0 ? 'CONFIRMADO' : 'PREVISTO';
      const rangeRes = `${SHEET_RESERVAS}!A${r.rowIndex}:H${r.rowIndex}`;
      await sheetsPut(token, rangeRes, [[
        r.categoria, Math.max(0, novaQtd), r.dataRetirada, r.dataDevolucao,
        r.obs, r.cadastradoPor, codigo, novoStatus
      ]]);
      cancelarConfirmacaoAtiva();
    }

    showToast(`Saída de ${codigo} registrada!`, 'success');
    await syncData();
  } catch (err) {
    console.error('registrarSaida:', err);
    showToast(`Erro: ${err.message}`, 'error', 4000);
  } finally {
    setLoading(false);
  }
}

// ─── CONFIRMAR RETORNO ────────────────────────────────────────────────────────
async function confirmarRetorno(codigo, categoria, btn) {
  const item = itemsData.find(i => i.codigo === codigo && i.categoria === categoria);
  if (!item || item.status !== 'LOCADO') { showToast(`${codigo} não está locado.`, 'error'); return; }

  if (btn) btn.disabled = true;
  setLoading(true);
  try {
    const token = await getAccessToken(true);

    // Atualiza Cadastro: DISPONIVEL, limpa campos
    const rangeCad = `${SHEET_NAME}!A${item.rowIndex}:I${item.rowIndex}`;
    await sheetsPut(token, rangeCad, [[
      item.categoria, item.codigo, item.marca, 'DISPONIVEL', '', '', '', '', ''
    ]]);

    showToast(`Retorno de ${codigo} confirmado!`, 'success');
    await syncData();
  } catch (err) {
    console.error('confirmarRetorno:', err);
    showToast(`Erro: ${err.message}`, 'error', 4000);
    if (btn) btn.disabled = false;
  } finally {
    setLoading(false);
  }
}

// ─── ADICIONAR RESERVA FUTURA ─────────────────────────────────────────────────
async function adicionarReserva() {
  const categoria   = selectCatRes.value;
  const quantidade  = parseInt(inputQtd.value) || 1;
  const dataSaida   = inputDataSaida.value.trim();
  const dataDev     = inputDataDev.value.trim();
  const obs         = inputObsRes.value.trim();

  if (!categoria || !dataSaida) {
    showToast('Informe categoria e data de saída.', 'error');
    return;
  }

  setLoading(true);
  try {
    const token = await getAccessToken(true);
    await sheetsAppend(token, RANGE_RESERVAS, [[
      categoria, quantidade, dataSaida, dataDev, obs, '', '', 'PREVISTO'
    ]]);

    // Limpa form
    selectCatRes.value    = '';
    inputQtd.value        = '1';
    inputDataSaida.value  = '';
    inputDataDev.value    = '';
    inputObsRes.value     = '';
    updateReservaBtn();

    showToast('Reserva adicionada!', 'success');
    await syncData();
  } catch (err) {
    console.error('adicionarReserva:', err);
    showToast(`Erro: ${err.message}`, 'error', 4000);
  } finally {
    setLoading(false);
  }
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
function setTab(tab) {
  const isSaida = tab === 'saida';
  document.getElementById('tabSaida').classList.toggle('active', isSaida);
  document.getElementById('tabReserva').classList.toggle('active', !isSaida);
  document.getElementById('panelSaida').style.display   = isSaida ? '' : 'none';
  document.getElementById('panelReserva').style.display = isSaida ? 'none' : '';
  if (!isSaida && activeReserva) cancelarConfirmacaoAtiva();
}

// ─── LOADING ─────────────────────────────────────────────────────────────────
function setLoading(on) {
  isLoading = on;
  btnSync.disabled          = on;
  btnRegistrarSaida.disabled = on || !(selectCat.value && selectCod.value);
  btnAdicionarReserva.disabled = on || !(selectCatRes.value && inputDataSaida.value.trim());
  document.querySelectorAll('.btn-retorno, .btn-saida, .btn-cancel-res').forEach(b => b.disabled = on);
}

// ─── EVENTS ──────────────────────────────────────────────────────────────────
function setupEventListeners() {
  btnSync.addEventListener('click', syncData);

  // Tabs
  document.getElementById('tabSaida').addEventListener('click',   () => setTab('saida'));
  document.getElementById('tabReserva').addEventListener('click', () => setTab('reserva'));

  // Cancelar banner de confirmação ativa
  document.getElementById('btnCancelarAtivo').addEventListener('click', cancelarConfirmacaoAtiva);

  // Saída
  selectCat.addEventListener('change', () => { updateCodigoDropdown(); });
  selectCod.addEventListener('change', updateSaidaBtn);
  btnRegistrarSaida.addEventListener('click', registrarSaida);

  // Nova Reserva
  selectCatRes.addEventListener('change',  updateReservaBtn);
  inputDataSaida.addEventListener('input', updateReservaBtn);
  btnAdicionarReserva.addEventListener('click', adicionarReserva);

  if (itemsData.length) populateCategoryDropdowns();
}
