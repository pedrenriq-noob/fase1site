import { supabase, TENANT_ID, SUPABASE_URL } from '../js/supabase.js';
import { getUser } from '../js/auth.js';
import { showToast, logger, escapeHtml } from '../js/utils.js';

const ROLES = { admin: 'Admin', operador: 'Operador', balcao: 'Balcão' };
const TABS = ['veiculos', 'usuarios', 'patios', 'importacao'];

export async function init(container, params) {
  const user = await getUser();
  if (user?.role !== 'admin') {
    container.innerHTML = `
      <div class="page">
        <div class="alert alert-error">Acesso restrito a administradores.</div>
      </div>`;
    return;
  }

  const activeTab = params?.tab ?? 'veiculos';

  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Administração</h1>
        <p class="page-subtitle">Gerencie a frota, usuários e pátios</p>
      </div>

      <div class="admin-tabs" role="tablist">
        <button class="admin-tab ${activeTab === 'veiculos' ? 'active' : ''}" data-tab="veiculos" role="tab">Veículos</button>
        <button class="admin-tab ${activeTab === 'usuarios' ? 'active' : ''}" data-tab="usuarios" role="tab">Usuários</button>
        <button class="admin-tab ${activeTab === 'patios'      ? 'active' : ''}" data-tab="patios"      role="tab">Pátios</button>
        <button class="admin-tab ${activeTab === 'importacao' ? 'active' : ''}" data-tab="importacao" role="tab">Importação</button>
      </div>

      <div id="admin-panel"></div>
    </div>
  `;

  container.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadTab(btn.dataset.tab);
    });
  });

  loadTab(activeTab);

  /* ===== TAB LOADER ===== */
  async function loadTab(tab) {
    const panel = document.getElementById('admin-panel');
    panel.innerHTML = `<div class="loading-screen" style="min-height:30vh;"><div class="spinner"></div></div>`;
    if (tab === 'veiculos')   await renderVeiculos(panel);
    if (tab === 'usuarios')   await renderUsuarios(panel);
    if (tab === 'patios')     await renderPatios(panel);
    if (tab === 'importacao') await renderImportacao(panel);
  }

  /* ================================================================
     TAB IMPORTAÇÃO
  ================================================================ */
  async function renderImportacao(panel) {
    panel.innerHTML = `
      <div class="card mb-md">
        <h2 class="section-title" style="margin-bottom:var(--space-sm)">Sincronização com Sistema Oficial</h2>
        <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:var(--space-md)">
          Exporte os dois relatórios do sistema oficial e faça upload aqui. O sistema irá criar novas reservas,
          atualizar as existentes e encerrar contratos que não aparecem mais como abertos.
        </p>

        <div class="form-grid" style="margin-bottom:var(--space-md)">
          <div class="form-group">
            <label class="form-label">Contratos Abertos (CSV)</label>
            <input type="file" id="imp-contratos" accept=".csv" class="form-input" />
            <span class="form-hint" id="imp-contratos-info" style="color:var(--text-secondary);font-size:0.8rem;"></span>
          </div>
          <div class="form-group">
            <label class="form-label">Reservas Futuras (CSV)</label>
            <input type="file" id="imp-reservas" accept=".csv" class="form-input" />
            <span class="form-hint" id="imp-reservas-info" style="color:var(--text-secondary);font-size:0.8rem;"></span>
          </div>
        </div>

        <button class="btn btn-secondary" id="imp-preview-btn" disabled>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Analisar
        </button>
      </div>

      <div id="imp-preview" style="display:none;"></div>
    `;

    let parsedRows = [];

    const checkReady = () => {
      document.getElementById('imp-preview-btn').disabled =
        !document.getElementById('imp-contratos').files.length &&
        !document.getElementById('imp-reservas').files.length;
    };

    const readFile = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file, 'windows-1252');
    });

    panel.querySelector('#imp-contratos').addEventListener('change', e => {
      const f = e.target.files[0];
      document.getElementById('imp-contratos-info').textContent = f ? f.name : '';
      checkReady();
    });
    panel.querySelector('#imp-reservas').addEventListener('change', e => {
      const f = e.target.files[0];
      document.getElementById('imp-reservas-info').textContent = f ? f.name : '';
      checkReady();
    });

    panel.querySelector('#imp-preview-btn').addEventListener('click', async () => {
      const contratosFile = document.getElementById('imp-contratos').files[0];
      const reservasFile  = document.getElementById('imp-reservas').files[0];
      if (!contratosFile && !reservasFile) return;

      parsedRows = [];
      if (contratosFile) parsedRows.push(...parseCSV(await readFile(contratosFile)));
      if (reservasFile)  parsedRows.push(...parseCSV(await readFile(reservasFile)));

      await showPreview(parsedRows);
    });
  }

  function parseCSV(text) {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^﻿/, ''));
    const rows = [];
    let i = 1;
    while (i < lines.length) {
      let line = lines[i];
      // Handle multiline fields (fields with embedded newlines enclosed in quotes)
      while ((line.match(/"/g) || []).length % 2 !== 0 && i + 1 < lines.length) {
        i++;
        line += '\n' + lines[i];
      }
      const cols = [];
      let cur = '', inQ = false;
      for (let c = 0; c < line.length; c++) {
        const ch = line[c];
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
      cols.push(cur.trim());
      if (cols.length >= headers.length - 1) {
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = (cols[idx] ?? '').replace(/^"|"$/g, '').trim(); });
        if (obj['locacao-numero']) rows.push(obj);
      }
      i++;
    }
    return rows;
  }

  function normalizeCategoria(cat) {
    if (!cat) return '';
    return cat.trim()
      .replace(/^J\s*-?\s*PREMIUM$/i, 'J')
      .replace(/^U\s*-\s*UTILITARIO$/i, 'U-UTILITARIO')
      .trim();
  }

  function parseBRDate(str) {
    if (!str) return null;
    // "28/06/2026 08:00" → ISO
    const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
    if (!m) return null;
    return new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00-03:00`).toISOString();
  }

  function rowToReserva(row) {
    const placa = row['veiculo-placa'] || null;
    return {
      tenant_id:        TENANT_ID,
      locacao_numero:   row['locacao-numero'],
      locacao_id_ext:   parseInt(row['locacao-id']) || null,
      cliente:          row['cliente'] || null,
      condutor:         row['condutor'] || null,
      categoria:        normalizeCategoria(row['locacao-grupo'] || row['veiculo-grupo']),
      placa_atribuida:  placa || null,
      data_saida:       parseBRDate(row['locacao-inicio']),
      data_retorno_prev: parseBRDate(row['locacao-previsao']),
      ponto_retirada:   row['locacao-pontovenda'] || null,
      status:           placa ? 'CONFIRMADO' : 'PREVISTO',
      obs:              row['locacao-obs'] || null,
      frequencia:       row['locacao-frequencia'] || null,
      sincronizado_em:  new Date().toISOString(),
    };
  }

  async function showPreview(rows) {
    const previewEl = document.getElementById('imp-preview');
    previewEl.style.display = '';
    previewEl.innerHTML = `<div class="loading-screen" style="min-height:10vh;"><div class="spinner"></div></div>`;

    // Buscar reservas abertas no BD
    const { data: existing, error } = await supabase
      .from('frota_reservas')
      .select('id, locacao_numero, placa_atribuida, status, data_retorno_prev')
      .eq('tenant_id', TENANT_ID)
      .in('status', ['CONFIRMADO', 'PREVISTO']);

    if (error) { previewEl.innerHTML = `<div class="alert alert-error">Erro ao buscar dados: ${escapeHtml(error.message)}</div>`; return; }

    const importedNums = new Set(rows.map(r => r['locacao-numero']));
    const existingMap  = new Map((existing || []).map(r => [r.locacao_numero, r]));

    const novos       = rows.filter(r => !existingMap.has(r['locacao-numero']));
    const atualizados = rows.filter(r => existingMap.has(r['locacao-numero']));
    const encerrar    = (existing || []).filter(r => r.locacao_numero && !importedNums.has(r.locacao_numero));

    // Dedupe by locacao_numero: if the same number appears in both CSVs
    // (or twice in the same file), keep only the last occurrence so the
    // upsert chunk never contains two rows with the same (tenant_id, locacao_numero).
    const reservasMap = new Map();
    rows.forEach(r => reservasMap.set(r['locacao-numero'], rowToReserva(r)));
    const reservas = Array.from(reservasMap.values());

    previewEl.innerHTML = `
      <div class="card mb-md">
        <h3 style="margin-bottom:var(--space-md)">Resumo da Importação</h3>
        <div class="form-grid" style="gap:var(--space-sm);margin-bottom:var(--space-md)">
          <div class="stat-card" style="background:var(--success-bg,#d1fae5);border-radius:8px;padding:var(--space-sm) var(--space-md);">
            <div style="font-size:1.5rem;font-weight:700;color:#065f46;">${novos.length}</div>
            <div style="font-size:0.8rem;color:#065f46;">Novos registros</div>
          </div>
          <div class="stat-card" style="background:var(--info-bg,#dbeafe);border-radius:8px;padding:var(--space-sm) var(--space-md);">
            <div style="font-size:1.5rem;font-weight:700;color:#1e40af;">${atualizados.length}</div>
            <div style="font-size:0.8rem;color:#1e40af;">Atualizações</div>
          </div>
          <div class="stat-card" style="background:var(--warning-bg,#fef9c3);border-radius:8px;padding:var(--space-sm) var(--space-md);">
            <div style="font-size:1.5rem;font-weight:700;color:#854d0e;">${encerrar.length}</div>
            <div style="font-size:0.8rem;color:#854d0e;">A encerrar</div>
          </div>
        </div>

        ${encerrar.length > 0 ? `
        <details style="margin-bottom:var(--space-md);">
          <summary style="cursor:pointer;font-weight:600;color:var(--warning,#d97706);">
            ⚠ ${encerrar.length} contrato${encerrar.length > 1 ? 's' : ''} que sumiu${encerrar.length > 1 ? 'ram' : ''} da lista (serão marcados como CONCLUÍDO)
          </summary>
          <table class="admin-table" style="margin-top:var(--space-sm)">
            <thead><tr><th>Locação</th><th>Status atual</th><th>Placa</th></tr></thead>
            <tbody>
              ${encerrar.map(r => `<tr><td>${escapeHtml(r.locacao_numero)}</td><td>${r.status}</td><td>${r.placa_atribuida || '—'}</td></tr>`).join('')}
            </tbody>
          </table>
        </details>` : ''}

        <button class="btn btn-primary" id="imp-sync-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px">
            <polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
          Sincronizar Agora
        </button>
      </div>
    `;

    // Remover listeners anteriores antes de re-registrar (previne duplo sync)
    const syncBtnOld = document.getElementById('imp-sync-btn');
    const syncBtn = syncBtnOld.cloneNode(true);
    syncBtnOld.replaceWith(syncBtn);
    syncBtn.addEventListener('click', async () => {
      await executarSync(reservas, encerrar);
    });
  }

  async function executarSync(reservas, encerrar) {
    const btn = document.getElementById('imp-sync-btn');
    btn.disabled = true;
    btn.classList.add('btn-loading');
    btn.textContent = 'Sincronizando…';

    try {
      // 1. Upsert todos os registros importados
      const CHUNK = 50;
      for (let i = 0; i < reservas.length; i += CHUNK) {
        const chunk = reservas.slice(i, i + CHUNK);
        const { error } = await supabase
          .from('frota_reservas')
          .upsert(chunk, { onConflict: 'tenant_id,locacao_numero' });
        if (error) throw error;
      }

      // 2. Encerrar contratos que sumiram + atualizar status do veículo
      for (const r of encerrar) {
        await supabase.from('frota_reservas')
          .update({ status: 'CONCLUIDO', sincronizado_em: new Date().toISOString() })
          .eq('id', r.id);

        if (r.placa_atribuida && r.status === 'CONFIRMADO') {
          await supabase.from('frota_veiculos')
            .update({ status: 'DEVOLVIDO', limpo: false, prev_retorno: null, patio_atual: null })
            .eq('placa', r.placa_atribuida)
            .eq('tenant_id', TENANT_ID)
            .eq('status', 'LOCADO');
        }
      }

      // 3. Atualizar status LOCADO nos veículos com contrato ativo
      // Não sobrescreve MANUTENCAO: só atualiza veículos em status operacional
      const confirmados = reservas.filter(r => r.placa_atribuida && r.status === 'CONFIRMADO');
      for (const r of confirmados) {
        await supabase.from('frota_veiculos')
          .update({ status: 'LOCADO', prev_retorno: r.data_retorno_prev, patio_atual: null })
          .eq('placa', r.placa_atribuida)
          .eq('tenant_id', TENANT_ID)
          .in('status', ['DISPONIVEL', 'LOCADO', 'DEVOLVIDO', 'NO_LAVADOR']);
      }

      const total = reservas.length;
      const enc   = encerrar.length;
      showToast(`Sync concluído: ${total} registros importados, ${enc} encerrados.`, 'success', 5000);
      document.getElementById('imp-preview').innerHTML = `
        <div class="alert alert-success">
          ✓ Sincronização concluída — ${total} reservas/contratos importados, ${enc} encerrados.
        </div>`;
    } catch (err) {
      logger.error('Sync error:', err);
      showToast('Erro durante sincronização: ' + escapeHtml(err.message), 'error');
      btn.disabled = false;
      btn.classList.remove('btn-loading');
      btn.textContent = 'Sincronizar Agora';
    }
  }

  /* ================================================================
     TAB VEÍCULOS
  ================================================================ */
  async function renderVeiculos(panel) {
    const { data: veiculos, error } = await supabase
      .from('frota_veiculos').select('*').eq('tenant_id', TENANT_ID)
      .order('categoria').order('placa');

    if (error) { panel.innerHTML = `<div class="alert alert-error">Erro ao carregar veículos.</div>`; return; }

    panel.innerHTML = `
      <div class="section">
        <div class="row-between mb-md">
          <span class="text-muted text-sm">${veiculos.length} veículos na frota</span>
          <button class="btn btn-primary btn-sm" id="btn-add-veiculo">+ Adicionar Veículo</button>
        </div>
        <div class="card" style="padding:0;overflow:hidden;">
          <table class="admin-table">
            <thead>
              <tr><th>Placa</th><th>Modelo</th><th>Fabricante</th><th>Cat.</th><th>Cor</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              ${veiculos.map(v => `
                <tr>
                  <td><strong>${escapeHtml(v.placa)}</strong></td>
                  <td>${escapeHtml(v.modelo ?? '—')}</td>
                  <td>${escapeHtml(v.fabricante ?? '—')}</td>
                  <td><span class="badge badge-gray">${escapeHtml(v.categoria)}</span></td>
                  <td>${escapeHtml(v.cor ?? '—')}</td>
                  <td><span class="badge badge-${v.status === 'DISPONIVEL' ? 'disponivel' : 'locado'}">${escapeHtml(v.status)}</span></td>
                  <td class="table-actions">
                    <button class="btn btn-sm btn-secondary btn-edit-veiculo" data-id="${escapeHtml(v.id)}" data-placa="${escapeHtml(v.placa)}">Editar</button>
                    <button class="btn btn-sm btn-danger btn-del-veiculo" data-id="${escapeHtml(v.id)}" data-placa="${escapeHtml(v.placa)}">Remover</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    panel.querySelector('#btn-add-veiculo').addEventListener('click', () => showVeiculoModal());

    panel.querySelectorAll('.btn-edit-veiculo').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = veiculos.find(x => x.id === btn.dataset.id);
        if (v) showVeiculoModal(v);
      });
    });

    panel.querySelectorAll('.btn-del-veiculo').forEach(btn => {
      btn.addEventListener('click', () => deleteVeiculo(btn.dataset.id, btn.dataset.placa));
    });
  }

  function showVeiculoModal(v = null) {
    const isEdit = !!v;
    const modal = createModal(isEdit ? `Editar ${v.placa}` : 'Novo Veículo', `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Placa <span class="required">*</span></label>
          <input class="form-input" id="v-placa" value="${escapeHtml(v?.placa ?? '')}" ${isEdit ? 'disabled' : ''} placeholder="AAA-0000" />
        </div>
        <div class="form-group">
          <label class="form-label">Categoria <span class="required">*</span></label>
          <select class="form-select" id="v-cat">
            ${['B','C','D','D+','E','F','G','H','I','J','U-UTILITARIO'].map(c =>
              `<option value="${c}" ${v?.categoria === c ? 'selected' : ''}>${c}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group" style="grid-column:span 2">
          <label class="form-label">Modelo <span class="required">*</span></label>
          <input class="form-input" id="v-modelo" value="${escapeHtml(v?.modelo ?? '')}" placeholder="ARGO DRIVE 1.0 6V Flex" />
        </div>
        <div class="form-group">
          <label class="form-label">Fabricante</label>
          <input class="form-input" id="v-fabricante" value="${escapeHtml(v?.fabricante ?? '')}" placeholder="Fiat" />
        </div>
        <div class="form-group">
          <label class="form-label">Cor</label>
          <input class="form-input" id="v-cor" value="${escapeHtml(v?.cor ?? '')}" placeholder="Branco" />
        </div>
      </div>
    `, async () => {
      const placa     = document.getElementById('v-placa').value.trim().toUpperCase();
      const categoria = document.getElementById('v-cat').value;
      const modelo    = document.getElementById('v-modelo').value.trim();
      const fabricante= document.getElementById('v-fabricante').value.trim();
      const cor       = document.getElementById('v-cor').value.trim();

      if (!placa || !modelo) { showToast('Placa e modelo são obrigatórios.', 'warning'); return false; }

      if (isEdit) {
        const { error } = await supabase.from('frota_veiculos')
          .update({ modelo, fabricante, cor, categoria })
          .eq('id', v.id).eq('tenant_id', TENANT_ID);
        if (error) { showToast('Erro ao salvar.', 'error'); return false; }
        showToast('Veículo atualizado!', 'success');
      } else {
        const { error } = await supabase.from('frota_veiculos').insert({
          tenant_id: TENANT_ID, placa, categoria, modelo, fabricante, cor,
          status: 'DISPONIVEL', limpo: true
        });
        if (error) { showToast(error.message.includes('unique') ? 'Placa já cadastrada.' : 'Erro ao cadastrar.', 'error'); return false; }
        showToast('Veículo adicionado!', 'success');
      }
      return true;
    }, () => loadTab('veiculos'));
  }

  async function deleteVeiculo(id, placa) {
    if (!confirm(`Remover ${placa} da frota? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from('frota_veiculos').delete().eq('id', id).eq('tenant_id', TENANT_ID);
    if (error) { showToast('Erro ao remover. Verifique se o veículo tem movimentações.', 'error'); return; }
    showToast(`${placa} removido.`, 'success');
    loadTab('veiculos');
  }

  /* ================================================================
     TAB USUÁRIOS
  ================================================================ */
  async function renderUsuarios(panel) {
    const { data: usuarios, error } = await supabase
      .from('usuarios').select('*').eq('tenant_id', TENANT_ID).order('nome');

    if (error) { panel.innerHTML = `<div class="alert alert-error">Erro ao carregar usuários.</div>`; return; }

    panel.innerHTML = `
      <div class="section">
        <div class="row-between mb-md">
          <span class="text-muted text-sm">${usuarios.length} usuário${usuarios.length !== 1 ? 's' : ''}</span>
          <button class="btn btn-primary btn-sm" id="btn-add-usuario">+ Novo Usuário</button>
        </div>
        <div class="card" style="padding:0;overflow:hidden;">
          <table class="admin-table">
            <thead>
              <tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              ${usuarios.map(u => `
                <tr class="${u.ativo === false ? 'row-inactive' : ''}">
                  <td><strong>${escapeHtml(u.nome ?? '—')}</strong></td>
                  <td>${escapeHtml(u.email ?? '—')}</td>
                  <td>
                    <select class="form-select form-select-sm role-select" data-uid="${escapeHtml(u.id)}">
                      ${Object.entries(ROLES).map(([k, v]) =>
                        `<option value="${k}" ${u.role === k ? 'selected' : ''}>${v}</option>`
                      ).join('')}
                    </select>
                  </td>
                  <td><span class="badge ${u.ativo !== false ? 'badge-disponivel' : 'badge-cancelado'}">${u.ativo !== false ? 'Ativo' : 'Inativo'}</span></td>
                  <td class="table-actions">
                    <button class="btn btn-sm btn-secondary btn-reset-pw" data-uid="${escapeHtml(u.id)}" data-nome="${escapeHtml(u.nome ?? '')}">Senha</button>
                    <button class="btn btn-sm ${u.ativo !== false ? 'btn-danger' : 'btn-secondary'} btn-toggle-ativo"
                      data-uid="${escapeHtml(u.id)}" data-ativo="${u.ativo !== false}">
                      ${u.ativo !== false ? 'Desativar' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    panel.querySelector('#btn-add-usuario').addEventListener('click', () => showUsuarioModal());

    panel.querySelectorAll('.role-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const res = await callAdminFn({ action: 'update_role', userId: sel.dataset.uid, role: sel.value });
        if (res.success) showToast('Perfil atualizado!', 'success');
        else showToast(res.error ?? 'Erro.', 'error');
      });
    });

    panel.querySelectorAll('.btn-reset-pw').forEach(btn => {
      btn.addEventListener('click', () => showResetSenhaModal(btn.dataset.uid, btn.dataset.nome));
    });

    panel.querySelectorAll('.btn-toggle-ativo').forEach(btn => {
      btn.addEventListener('click', async () => {
        const novoAtivo = btn.dataset.ativo === 'true' ? false : true;
        const res = await callAdminFn({ action: 'toggle_ativo', userId: btn.dataset.uid, ativo: novoAtivo });
        if (res.success) { showToast(novoAtivo ? 'Usuário reativado.' : 'Usuário desativado.', 'success'); loadTab('usuarios'); }
        else showToast(res.error ?? 'Erro.', 'error');
      });
    });
  }

  function showUsuarioModal() {
    createModal('Novo Usuário', `
      <div class="form-grid">
        <div class="form-group" style="grid-column:span 2">
          <label class="form-label">Nome <span class="required">*</span></label>
          <input class="form-input" id="u-nome" placeholder="Nome completo" />
        </div>
        <div class="form-group" style="grid-column:span 2">
          <label class="form-label">E-mail <span class="required">*</span></label>
          <input class="form-input" type="email" id="u-email" placeholder="email@empresa.com" />
        </div>
        <div class="form-group">
          <label class="form-label">Senha <span class="required">*</span></label>
          <input class="form-input" type="password" id="u-pw" placeholder="Mínimo 8 caracteres" />
        </div>
        <div class="form-group">
          <label class="form-label">Perfil <span class="required">*</span></label>
          <select class="form-select" id="u-role">
            ${Object.entries(ROLES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
        </div>
      </div>
    `, async () => {
      const nome  = document.getElementById('u-nome').value.trim();
      const email = document.getElementById('u-email').value.trim();
      const pw    = document.getElementById('u-pw').value;
      const role  = document.getElementById('u-role').value;

      if (!nome || !email || !pw) { showToast('Preencha todos os campos.', 'warning'); return false; }
      if (pw.length < 8) { showToast('Senha mínima: 8 caracteres.', 'warning'); return false; }

      const res = await callAdminFn({ action: 'create', email, password: pw, nome, role });
      if (!res.success) { showToast(res.error ?? 'Erro ao criar usuário.', 'error'); return false; }
      showToast(`Usuário ${nome} criado!`, 'success');
      return true;
    }, () => loadTab('usuarios'));
  }

  function showResetSenhaModal(userId, nome) {
    createModal(`Redefinir Senha — ${nome}`, `
      <div class="form-group">
        <label class="form-label">Nova Senha <span class="required">*</span></label>
        <input class="form-input" type="password" id="pw-nova" placeholder="Mínimo 8 caracteres" />
      </div>
    `, async () => {
      const pw = document.getElementById('pw-nova').value;
      if (pw.length < 8) { showToast('Senha mínima: 8 caracteres.', 'warning'); return false; }
      const res = await callAdminFn({ action: 'reset_password', userId, password: pw });
      if (!res.success) { showToast(res.error ?? 'Erro.', 'error'); return false; }
      showToast('Senha redefinida!', 'success');
      return true;
    });
  }

  /* ================================================================
     TAB PÁTIOS
  ================================================================ */
  async function renderPatios(panel) {
    const { data: patios, error } = await supabase
      .from('frota_patios').select('*').eq('tenant_id', TENANT_ID).order('ordem');

    if (error) { panel.innerHTML = `<div class="alert alert-error">Erro ao carregar pátios.</div>`; return; }

    const tipoLabel = { patio: 'Pátio', retorno: 'Ponto Retorno', retirada: 'Ponto Retirada' };

    panel.innerHTML = `
      <div class="section">
        <div class="row-between mb-md">
          <span class="text-muted text-sm">${patios.length} locais cadastrados</span>
          <button class="btn btn-primary btn-sm" id="btn-add-patio">+ Novo Local</button>
        </div>
        <div class="card" style="padding:0;overflow:hidden;">
          <table class="admin-table">
            <thead>
              <tr><th>Nome</th><th>Tipo</th><th>Ordem</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              ${patios.map(p => `
                <tr class="${!p.ativo ? 'row-inactive' : ''}">
                  <td><strong>${escapeHtml(p.nome)}</strong></td>
                  <td>${escapeHtml(tipoLabel[p.tipo] ?? p.tipo)}</td>
                  <td>${p.ordem}</td>
                  <td><span class="badge ${p.ativo ? 'badge-disponivel' : 'badge-cancelado'}">${p.ativo ? 'Ativo' : 'Inativo'}</span></td>
                  <td class="table-actions">
                    <button class="btn btn-sm btn-secondary btn-edit-patio" data-id="${escapeHtml(p.id)}">Editar</button>
                    <button class="btn btn-sm ${p.ativo ? 'btn-danger' : 'btn-secondary'} btn-toggle-patio"
                      data-id="${escapeHtml(p.id)}" data-ativo="${p.ativo}">
                      ${p.ativo ? 'Desativar' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    panel.querySelector('#btn-add-patio').addEventListener('click', () => showPatioModal());

    panel.querySelectorAll('.btn-edit-patio').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = patios.find(x => x.id === btn.dataset.id);
        if (p) showPatioModal(p);
      });
    });

    panel.querySelectorAll('.btn-toggle-patio').forEach(btn => {
      btn.addEventListener('click', async () => {
        const novoAtivo = btn.dataset.ativo === 'true' ? false : true;
        const { error } = await supabase.from('frota_patios')
          .update({ ativo: novoAtivo }).eq('id', btn.dataset.id).eq('tenant_id', TENANT_ID);
        if (error) { showToast('Erro.', 'error'); return; }
        showToast(novoAtivo ? 'Local reativado.' : 'Local desativado.', 'success');
        loadTab('patios');
      });
    });
  }

  function showPatioModal(p = null) {
    const isEdit = !!p;
    createModal(isEdit ? `Editar ${p.nome}` : 'Novo Local', `
      <div class="form-grid">
        <div class="form-group" style="grid-column:span 2">
          <label class="form-label">Nome <span class="required">*</span></label>
          <input class="form-input" id="p-nome" value="${escapeHtml(p?.nome ?? '')}" placeholder="Ex: Garagem Norte" />
        </div>
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select class="form-select" id="p-tipo">
            <option value="patio"    ${p?.tipo === 'patio'    ? 'selected' : ''}>Pátio</option>
            <option value="retorno"  ${p?.tipo === 'retorno'  ? 'selected' : ''}>Ponto de Retorno</option>
            <option value="retirada" ${p?.tipo === 'retirada' ? 'selected' : ''}>Ponto de Retirada</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Ordem</label>
          <input class="form-input" type="number" id="p-ordem" value="${p?.ordem ?? 0}" min="0" />
        </div>
      </div>
    `, async () => {
      const nome  = document.getElementById('p-nome').value.trim();
      const tipo  = document.getElementById('p-tipo').value;
      const ordem = parseInt(document.getElementById('p-ordem').value) || 0;

      if (!nome) { showToast('Nome é obrigatório.', 'warning'); return false; }

      if (isEdit) {
        const { error } = await supabase.from('frota_patios')
          .update({ nome, tipo, ordem }).eq('id', p.id);
        if (error) { showToast('Erro ao salvar.', 'error'); return false; }
        showToast('Local atualizado!', 'success');
      } else {
        const { error } = await supabase.from('frota_patios').insert({
          tenant_id: TENANT_ID, nome, tipo, ordem, ativo: true
        });
        if (error) { showToast(error.message.includes('unique') ? 'Nome já existe.' : 'Erro ao criar.', 'error'); return false; }
        showToast('Local criado!', 'success');
      }
      return true;
    }, () => loadTab('patios'));
  }

  /* ================================================================
     HELPERS
  ================================================================ */
  async function callAdminFn(body) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.hash = '/login';
        return { error: 'Sessão expirada. Faça login novamente.' };
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-user-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(body)
      });
      return await res.json();
    } catch (err) {
      logger.error('callAdminFn:', err.message);
      return { error: 'Erro de conexão com o servidor.' };
    }
  }

  function createModal(title, bodyHtml, onConfirm, onDone = null) {
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
          <button class="btn btn-primary modal-confirm">Salvar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.querySelector('.modal-cancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    const confirmBtn = overlay.querySelector('.modal-confirm');
    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.classList.add('btn-loading');
      try {
        const ok = await onConfirm();
        if (ok !== false) {
          close();
          if (onDone) onDone();
        }
      } catch (err) {
        logger.error('Modal confirm:', err);
        showToast('Erro inesperado.', 'error');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('btn-loading');
      }
    });
    return overlay;
  }
}
