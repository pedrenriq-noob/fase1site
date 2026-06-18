'use strict';

// ============================================
// RESERVA FÁCIL IGUFOZ — PAINEL ADMINISTRATIVO
// ============================================

const Admin = {

    // === CONFIGURAÇÃO ===
    PASSWORD: 'igufoz2026',
    SESSION_KEY: 'igufoz_admin_session',
    DB_KEY: 'igufoz_db',
    SETTINGS_KEY: 'igufoz_settings',
    RESERVATIONS_KEY: 'igufoz_reservations',
    SEASONAL_KEY:     'igufoz_seasonal',

    // === DADOS PADRÃO (espelho do script.js) ===
    DEFAULT_DB: {
        categories: {
            'hatch_compact': { id: 'hatch_compact', name: 'GRUPO B',          price_per_day: 167.90, transmission: 'Manual',     quantity: 1, description: 'Hatch Compacto - Manual (Mobi, C3 ou similar): Compactos, econômicos e ágeis, perfeitos para o dia a dia na cidade.', maxPessoas: 5, maxCadeirinhas: 2 },
            'hatch_medium':  { id: 'hatch_medium',  name: 'GRUPO C',          price_per_day: 182.93, transmission: 'Manual',     quantity: 1, description: 'Hatch Médio - Manual (Onix, Argo, 208, Polo ou similar): Modernos e confortáveis, com mais espaço e desempenho.', maxPessoas: 5, maxCadeirinhas: 2 },
            'sedan_auto':    { id: 'sedan_auto',    name: 'GRUPO D+',         price_per_day: 249.96, transmission: 'Automático', quantity: 1, description: 'Sedan Automático (Cronos ou similar): Condução suave e conforto para o dia a dia.', maxPessoas: 5, maxCadeirinhas: 2 },
            'suv_mini':      { id: 'suv_mini',      name: 'GRUPO F',          price_per_day: 273.95, transmission: 'Automático', quantity: 1, description: 'SUV Mini Automático (Tera, Pulse ou similar): Robusto e tecnológico, ideal para a tríplice fronteira.', maxPessoas: 5, maxCadeirinhas: 2 },
            'sedan_medium':  { id: 'sedan_medium',  name: 'GRUPO I',          price_per_day: 289.90, transmission: 'Automático', quantity: 1, description: 'Sedan Médio Automático (Virtus, Onix Plus ou similar): Design moderno e tecnologia embarcada.', maxPessoas: 5, maxCadeirinhas: 2 },
            'suv_medium':    { id: 'suv_medium',    name: 'GRUPO G',          price_per_day: 369.90, transmission: 'Automático', quantity: 1, description: 'SUV Médio Automático (2008, Fastback ou similar): Versátil, com espaço e desempenho para qualquer passeio.', maxPessoas: 5, maxCadeirinhas: 2 },
            'suv_premium':   { id: 'suv_premium',   name: 'GRUPO J',          price_per_day: 402.93, transmission: 'Automático', quantity: 1, description: 'SUV Premium Automático (Tiggo 5x ou similar): Acabamento refinado e tecnologia de ponta.', maxPessoas: 5, maxCadeirinhas: 2 },
            '7_seats':       { id: '7_seats',       name: 'GRUPO H (7 LUGARES)', price_per_day: 496.98, transmission: 'Automático', quantity: 1, description: '7 Lugares Automático (Spin ou similar): Amplo e confortável para até 7 passageiros.', maxPessoas: 7, maxCadeirinhas: 4 }
        },
        protections: {
            'basic':   { id: 'basic',   name: 'PROTEÇÃO A TERCEIROS', price: 29.90, price_type: 'per_day', description: 'Cobertura: danos materiais ou pessoais causados a terceiros. Participação obrigatória: R$ 1.200,00 (em caso de sinistro). Pré-autorização: R$ 20.000,00. Recomendado para: quem utiliza a proteção do cartão de crédito.' },
            'plus':    { id: 'plus',    name: 'PROTEÇÃO PARCIAL + TERCEIROS', price: 65.90, price_type: 'per_day', description: 'Cobertura: colisão, furto, roubo, incêndio, perda total e danos a terceiros. Participação obrigatória: até 20% do valor FIPE do veículo. Pré-autorização: entre R$ 1.200,00 e R$ 2.000,00.' },
            'premium': { id: 'premium', name: 'PROTEÇÃO PLUS + TERCEIROS', price: 87.00, price_type: 'per_day', description: 'Cobertura: colisão, furto, roubo, incêndio, perda total e danos a terceiros. Participação obrigatória: até 10% do valor FIPE do veículo. Pré-autorização: entre R$ 1.200,00 e R$ 2.000,00.' }
        },
        additionals: {
            'bebe_conforto':        { id: 'bebe_conforto',        name: 'BEBÊ CONFORTO',            price: 30.00, price_type: 'per_day', description: '👶 0 a 1 ano | até 13 kg', allow_quantity: true,  isCadeirinha: true  },
            'cadeirinha_infantil':  { id: 'cadeirinha_infantil',  name: 'CADEIRINHA INFANTIL',       price: 30.00, price_type: 'per_day', description: '🧒 1 a 4 anos | 9 a 18 kg', allow_quantity: true,  isCadeirinha: true  },
            'assento_elevacao':     { id: 'assento_elevacao',     name: 'ASSENTO DE ELEVAÇÃO',       price: 30.00, price_type: 'per_day', description: '📏 4 a 7,5 anos | 15 a 36 kg', allow_quantity: true,  isCadeirinha: true  },
            'carta_verde_3dias':    { id: 'carta_verde_3dias',    name: 'Aut. Travessia + CV 3d',    price: 125.00, price_type: 'fixed', description: 'Autorização de travessia com Carta Verde de 3 dias para o Mercosul.', allow_quantity: false, isCadeirinha: false },
            'carta_verde_7dias':    { id: 'carta_verde_7dias',    name: 'Aut. Travessia + CV 7d',    price: 190.00, price_type: 'fixed', description: 'Autorização de travessia com Carta Verde de até 7 dias para o Mercosul.', allow_quantity: false, isCadeirinha: false },
            'devolucao_aeroporto':  { id: 'devolucao_aeroporto',  name: 'DEVOLUÇÃO NO AEROPORTO',    price: 50.00,  price_type: 'fixed', description: 'Devolução no estacionamento Leva e Trás 24h. Incluso translado até o aeroporto.', allow_quantity: false, isCadeirinha: false },
            'condutor_adicional':   { id: 'condutor_adicional',   name: 'CONDUTOR ADICIONAL',        price: 10.00, price_type: 'per_day', description: 'Valor Diário', allow_quantity: false, isCadeirinha: false },
            'lavagem_antecipada':   { id: 'lavagem_antecipada',   name: 'LAVAGEM ANTECIPADA',        price: 45.00,  price_type: 'fixed', description: 'Valor Único', allow_quantity: false, isCadeirinha: false },
            'protecao_pneus_vidros':{ id: 'protecao_pneus_vidros',name: 'PROTEÇÃO DE PNEUS E VIDROS',price: 24.90, price_type: 'per_day', description: 'Cobertura Exclusiva para Vidros, Pneus e Rodas.', allow_quantity: false, isCadeirinha: false }
        },
        accessories: {}
    },

    DEFAULT_SETTINGS: {
        whatsapp: '5545988182995',
        sheetsUrl: 'https://script.google.com/macros/s/AKfycbxJtSl1-QNUCBcGgoaxJP41K5NM6A06CR9dYI-vFUKDjekPnvLTjcRTtJgrrx2Ek_fnMQ/exec',
        maintenanceMode: false,
        maintenanceMessage: 'Sistema em manutenção. Volte em breve!',
        stock: { bebe_conforto: 5, cadeirinha_infantil: 9, assento_elevacao: 7 }
    },

    db: null,
    settings: null,
    currentPage: 'dashboard',
    modalSaveCallback: null,

    // ==========================================
    // INIT
    // ==========================================
    init() {
        this.loadData();
        if (this.checkAuth()) {
            this.showApp();
        } else {
            this.showLogin();
        }

        // Login form
        document.getElementById('login-form').addEventListener('submit', e => this.login(e));

        // Sidebar nav
        document.querySelectorAll('.nav-item[data-page]').forEach(el => {
            el.addEventListener('click', e => {
                e.preventDefault();
                this.navigate(el.dataset.page);
            });
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        // Modal buttons
        document.getElementById('modal-close-btn').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-cancel-btn').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-save-btn').addEventListener('click', () => this.saveModal());

        // Close modal on overlay click
        document.getElementById('modal-overlay').addEventListener('click', e => {
            if (e.target.id === 'modal-overlay') this.closeModal();
        });
    },

    // ==========================================
    // AUTH
    // ==========================================
    checkAuth() {
        try {
            const session = localStorage.getItem(this.SESSION_KEY);
            if (!session) return false;
            const { expires } = JSON.parse(session);
            return Date.now() < expires;
        } catch { return false; }
    },

    login(e) {
        e.preventDefault();
        const pwd = document.getElementById('login-password').value;
        const errEl = document.getElementById('login-error');
        if (pwd === this.PASSWORD) {
            errEl.style.display = 'none';
            localStorage.setItem(this.SESSION_KEY, JSON.stringify({ expires: Date.now() + 24 * 60 * 60 * 1000 }));
            this.showApp();
        } else {
            errEl.style.display = 'block';
            document.getElementById('login-password').value = '';
        }
    },

    logout() {
        if (!confirm('Deseja sair do painel?')) return;
        localStorage.removeItem(this.SESSION_KEY);
        location.reload();
    },

    showLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('admin-app').style.display = 'none';
    },

    showApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-app').style.display = 'flex';
        this.navigate('dashboard');
    },

    // ==========================================
    // DATA
    // ==========================================
    loadData() {
        // DB
        try {
            const stored = localStorage.getItem(this.DB_KEY);
            if (stored) {
                const custom = JSON.parse(stored);
                this.db = {
                    categories:  Object.assign({}, this.DEFAULT_DB.categories,  custom.categories  || {}),
                    protections: Object.assign({}, this.DEFAULT_DB.protections, custom.protections || {}),
                    additionals: Object.assign({}, this.DEFAULT_DB.additionals, custom.additionals || {}),
                    accessories: Object.assign({}, this.DEFAULT_DB.accessories, custom.accessories || {})
                };
            } else {
                this.db = JSON.parse(JSON.stringify(this.DEFAULT_DB));
            }
        } catch { this.db = JSON.parse(JSON.stringify(this.DEFAULT_DB)); }

        // Settings
        try {
            const stored = localStorage.getItem(this.SETTINGS_KEY);
            this.settings = stored ? Object.assign({}, this.DEFAULT_SETTINGS, JSON.parse(stored)) : Object.assign({}, this.DEFAULT_SETTINGS);
        } catch { this.settings = Object.assign({}, this.DEFAULT_SETTINGS); }
    },

    saveDB() {
        localStorage.setItem(this.DB_KEY, JSON.stringify({
            categories:  this.db.categories,
            protections: this.db.protections,
            additionals: this.db.additionals,
            accessories: this.db.accessories
        }));
    },

    saveSettings() {
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(this.settings));
    },

    getReservations() {
        try {
            return JSON.parse(localStorage.getItem(this.RESERVATIONS_KEY) || '[]');
        } catch { return []; }
    },

    getSeasonal() {
        try { return JSON.parse(localStorage.getItem(this.SEASONAL_KEY) || '[]'); }
        catch { return []; }
    },

    saveSeasonal(list) {
        localStorage.setItem(this.SEASONAL_KEY, JSON.stringify(list));
    },

    getRecentReservations(days) {
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        return this.getReservations().filter(r => {
            const ts = new Date(r.submittedAt || r.pickupDate).getTime();
            return ts >= cutoff;
        });
    },

    getTopVehicle(list) {
        if (!list.length) return null;
        const counts = {};
        list.forEach(r => { counts[r.category] = (counts[r.category] || 0) + 1; });
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    },

    // ==========================================
    // NAVIGATION
    // ==========================================
    navigate(page) {
        this.currentPage = page;
        document.querySelectorAll('.nav-item[data-page]').forEach(el => {
            el.classList.toggle('active', el.dataset.page === page);
        });
        this.renderPage(page);
        window.scrollTo(0, 0);
    },

    renderPage(page) {
        const el = document.getElementById('page-content');
        switch (page) {
            case 'dashboard':   el.innerHTML = this.renderDashboard(); break;
            case 'categories':  el.innerHTML = this.renderCategories(); break;
            case 'protections': el.innerHTML = this.renderProtections(); break;
            case 'additionals': el.innerHTML = this.renderAdditionals(); break;
            case 'seasonal':    el.innerHTML = this.renderSeasonal(); break;
            case 'accessories': el.innerHTML = this.renderAccessories(); break;
            case 'reservations':el.innerHTML = this.renderReservations(); this.bindReservationFilters(); break;
            case 'settings':    el.innerHTML = this.renderSettings(); this.bindSettingsForm(); break;
            default: el.innerHTML = '<p>Página não encontrada.</p>';
        }
    },

    // ==========================================
    // DASHBOARD
    // ==========================================
    renderDashboard() {
        const all  = this.getReservations();
        const now  = new Date().toISOString().slice(0, 10);
        const d30  = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
        const filtered = all.filter(r => {
            const d = (r.submittedAt || r.pickupDate || '').slice(0, 10);
            return d >= d30 && d <= now;
        });

        return `
        <div class="page-header">
            <h1>📊 Dashboard</h1>
            <button class="btn-secondary" onclick="Admin.navigate('dashboard')">🔄 Atualizar</button>
        </div>

        <div class="card dash-filter-card">
            <div class="dash-filter-row">
                <span class="dash-filter-label">📅 Período:</span>
                <input type="date" id="dash-from" value="${d30}">
                <span style="color:#64748b;font-size:13px">→</span>
                <input type="date" id="dash-to" value="${now}">
                <button class="btn-primary btn-sm" onclick="Admin.applyDashFilters()">Aplicar</button>
                <button class="btn-secondary btn-sm" onclick="Admin.setDashPeriod(7)">7 dias</button>
                <button class="btn-secondary btn-sm" onclick="Admin.setDashPeriod(30)">30 dias</button>
                <button class="btn-secondary btn-sm" onclick="Admin.setDashPeriod(90)">90 dias</button>
            </div>
        </div>

        <div id="dash-stats">${this.renderDashStats(filtered)}</div>
        <div id="dash-analytics">${this.renderDashAnalytics(filtered)}</div>

        <div class="card">
            <div class="card-header">
                <h3>Reservas Recentes</h3>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                    <input type="text" id="dash-search" placeholder="🔍 Buscar por nome, CPF, veículo..."
                           oninput="Admin.dashSearch(this.value)" class="dash-search-input">
                    <button class="btn-secondary" onclick="Admin.navigate('reservations')">Ver todas →</button>
                </div>
            </div>
            <div class="table-wrap" id="dash-reservations-table">
                ${this.renderReservationsTable([...all].reverse().slice(0, 10))}
            </div>
        </div>`;
    },

    renderDashStats(list) {
        const revenue   = list.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
        const confirmed = list.filter(r => r.status === 'Confirmada').length;
        const pending   = list.filter(r => !r.status || r.status === 'Pendente').length;
        const ongoing   = list.filter(r => r.status === 'Em andamento').length;
        const cancelled = list.filter(r => r.status === 'Cancelada').length;
        const topV      = this.getTopVehicle(list) || '—';

        return `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">📅</div>
                <div class="stat-info">
                    <div class="stat-value">${list.length}</div>
                    <div class="stat-label">Reservas no Período</div>
                </div>
            </div>
            <div class="stat-card accent">
                <div class="stat-icon">💰</div>
                <div class="stat-info">
                    <div class="stat-value" style="font-size:16px">${this.fmtMoney(revenue)}</div>
                    <div class="stat-label">Faturamento Estimado</div>
                </div>
            </div>
            <div class="stat-card success">
                <div class="stat-icon">✅</div>
                <div class="stat-info">
                    <div class="stat-value">${confirmed}</div>
                    <div class="stat-label">Confirmadas</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">⏳</div>
                <div class="stat-info">
                    <div class="stat-value">${pending}</div>
                    <div class="stat-label">Pendentes</div>
                </div>
            </div>
            <div class="stat-card" style="border-left-color:#f59e0b">
                <div class="stat-icon">🔄</div>
                <div class="stat-info">
                    <div class="stat-value">${ongoing}</div>
                    <div class="stat-label">Em andamento</div>
                </div>
            </div>
            <div class="stat-card" style="border-left-color:#ef4444">
                <div class="stat-icon">❌</div>
                <div class="stat-info">
                    <div class="stat-value">${cancelled}</div>
                    <div class="stat-label">Canceladas</div>
                </div>
            </div>
        </div>`;
    },

    renderDashAnalytics(list) {
        if (!list.length) return `
            <div class="card" style="margin-bottom:20px;padding:24px;text-align:center;color:#64748b;font-size:14px">
                Sem reservas no período selecionado.
            </div>`;

        // Categorias
        const catCounts = {}, catRevenue = {};
        list.forEach(r => {
            const k = r.category || 'Sem categoria';
            catCounts[k]   = (catCounts[k]   || 0) + 1;
            catRevenue[k]  = (catRevenue[k]  || 0) + (parseFloat(r.total) || 0);
        });
        const catEntries = Object.entries(catCounts).sort((a,b) => b[1]-a[1]);
        const maxCat = catEntries[0]?.[1] || 1;
        const maxRev = Math.max(...Object.values(catRevenue)) || 1;

        // Proteções
        const protCounts = {};
        list.forEach(r => {
            const k = r.protection || 'Sem proteção';
            protCounts[k] = (protCounts[k] || 0) + 1;
        });
        const protEntries = Object.entries(protCounts).sort((a,b) => b[1]-a[1]);
        const maxProt = protEntries[0]?.[1] || 1;

        // Adicionais
        const addCounts = {};
        list.forEach(r => {
            if (Array.isArray(r.additionals)) {
                r.additionals.forEach(a => {
                    const k = a.name || 'Adicional';
                    addCounts[k] = (addCounts[k] || 0) + 1;
                });
            }
        });
        const addEntries = Object.entries(addCounts).sort((a,b) => b[1]-a[1]).slice(0, 6);
        const maxAdd = addEntries[0]?.[1] || 1;

        const bar = (label, count, max, color, suffix = '') => `
            <div class="analytics-bar-row">
                <div class="analytics-bar-label">
                    <span class="analytics-bar-name">${label}</span>
                    <span class="analytics-bar-count">${typeof count === 'number' && count % 1 !== 0 ? this.fmtMoney(count) : count}${suffix}</span>
                </div>
                <div class="analytics-bar-track">
                    <div class="analytics-bar-fill" style="width:${Math.max(2,Math.round(count/max*100))}%;background:${color}"></div>
                </div>
            </div>`;

        return `
        <div class="analytics-grid">
            <div class="card analytics-card">
                <div class="card-header"><h3>🚗 Reservas por Categoria</h3></div>
                <div class="analytics-body">
                    ${catEntries.map(([k,v]) => bar(k, v, maxCat, '#FF6B00')).join('') || '<p class="analytics-empty-msg">Sem dados</p>'}
                </div>
            </div>
            <div class="card analytics-card">
                <div class="card-header"><h3>💰 Receita por Categoria</h3></div>
                <div class="analytics-body">
                    ${catEntries.map(([k]) => bar(k, catRevenue[k]||0, maxRev, '#0f2b4f')).join('') || '<p class="analytics-empty-msg">Sem dados</p>'}
                </div>
            </div>
            <div class="card analytics-card">
                <div class="card-header"><h3>🛡️ Proteções Contratadas</h3></div>
                <div class="analytics-body">
                    ${protEntries.map(([k,v]) => bar(k, v, maxProt, '#10b981', ` (${Math.round(v/list.length*100)}%)`)).join('') || '<p class="analytics-empty-msg">Sem dados</p>'}
                </div>
            </div>
            <div class="card analytics-card">
                <div class="card-header"><h3>➕ Adicionais mais Contratados</h3></div>
                <div class="analytics-body">
                    ${addEntries.length
                        ? addEntries.map(([k,v]) => bar(k, v, maxAdd, '#8b5cf6')).join('')
                        : '<p class="analytics-empty-msg">Nenhum adicional neste período.</p>'}
                </div>
            </div>
        </div>
        ${this.renderFleetDemand(list)}
        ${this.renderSeatDemand(list)}`;
    },

    renderFleetDemand(list) {
        const cats = Object.values(this.db.categories);
        const catCounts = {};
        list.forEach(r => { const k = r.category||''; if(k) catCounts[k] = (catCounts[k]||0)+1; });

        const rows = cats.map(c => {
            const reservas = catCounts[c.name] || 0;
            const frota    = parseInt(c.quantity) || 1;
            let badge, statusColor;
            if (reservas === 0) {
                badge = `<span class="demand-badge demand-badge--neutral">Sem reservas</span>`;
                statusColor = '#94a3b8';
            } else if (reservas <= frota) {
                badge = `<span class="demand-badge demand-badge--ok">✅ Dentro da frota</span>`;
                statusColor = '#22c55e';
            } else {
                const extra = reservas - frota;
                badge = `<span class="demand-badge demand-badge--alert">⚠️ +${extra} acima da frota</span>`;
                statusColor = '#ef4444';
            }
            const barW = frota > 0 ? Math.min(100, Math.round(reservas/frota*100)) : 0;
            return `
            <tr class="demand-row">
                <td style="font-weight:600">🚗 ${c.name}</td>
                <td style="text-align:center;font-weight:700;font-size:15px;color:#0f2b4f">${reservas}</td>
                <td style="text-align:center;font-weight:700;font-size:15px;color:#64748b">${frota}</td>
                <td style="min-width:120px">
                    ${reservas > 0 ? `<div class="analytics-bar-track" style="height:6px">
                        <div class="analytics-bar-fill" style="width:${barW}%;background:${statusColor}"></div>
                    </div>` : ''}
                </td>
                <td>${badge}</td>
            </tr>`;
        }).join('');

        return `
        <div class="card" style="margin-bottom:20px">
            <div class="card-header"><h3>🚗 Demanda de Veículos por Categoria</h3></div>
            <div style="overflow-x:auto">
                <table>
                    <thead><tr>
                        <th>Categoria</th>
                        <th style="text-align:center">Reservas<br><small style="font-weight:400">no período</small></th>
                        <th style="text-align:center">Frota<br><small style="font-weight:400">disponível</small></th>
                        <th>Ocupação</th>
                        <th>Situação</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <div style="padding:10px 16px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0">
                ℹ️ Reservas acima da frota não bloqueiam solicitações — use para planejamento.
                Atualize a frota de cada veículo na aba <strong>Veículos → Editar → Qtd. na Frota</strong>.
            </div>
        </div>`;
    },

    renderSeatDemand(list) {
        const stock = this.settings.stock || {};
        const seats = [
            { key: 'bebe_conforto',       name: 'Bebê Conforto',       icon: '👶', storedName: 'BEBÊ CONFORTO'       },
            { key: 'cadeirinha_infantil',  name: 'Cadeirinha Infantil', icon: '🧒', storedName: 'CADEIRINHA INFANTIL' },
            { key: 'assento_elevacao',     name: 'Assento de Elevação', icon: '📏', storedName: 'ASSENTO DE ELEVAÇÃO' }
        ];

        // Soma total de unidades solicitadas por tipo
        const demand = { bebe_conforto: 0, cadeirinha_infantil: 0, assento_elevacao: 0 };
        list.forEach(r => {
            if (!Array.isArray(r.additionals)) return;
            r.additionals.forEach(a => {
                const seat = seats.find(s => s.storedName === a.name);
                if (seat) demand[seat.key] += (parseInt(a.quantity) || 1);
            });
        });

        // Adicionar acessórios com estoque ao painel
        const accessories = Object.values(this.db.accessories || {});
        const accDemand = {};
        list.forEach(r => {
            if (!Array.isArray(r.additionals)) return;
            r.additionals.forEach(a => {
                const acc = accessories.find(x => x.name === a.name);
                if (acc) accDemand[acc.id] = (accDemand[acc.id]||0) + (parseInt(a.quantity)||1);
            });
        });

        const hasAnyDemand = Object.values(demand).some(v => v > 0) || Object.values(accDemand).some(v => v > 0);

        const demandRow = (icon, name, d, avail) => {
            const configured = avail > 0;
            let badge, statusColor;
            if (!configured) { badge = `<span class="demand-badge demand-badge--neutral">Estoque não configurado</span>`; statusColor = '#94a3b8'; }
            else if (d === 0) { badge = `<span class="demand-badge demand-badge--ok">Sem demanda</span>`; statusColor = '#22c55e'; }
            else if (d <= avail) { badge = `<span class="demand-badge demand-badge--ok">✅ Estoque suficiente</span>`; statusColor = '#22c55e'; }
            else { const f = d - avail; badge = `<span class="demand-badge demand-badge--alert">⚠️ Faltam ${f} unidade${f>1?'s':''}</span>`; statusColor = '#ef4444'; }
            const barW = avail > 0 ? Math.min(100, Math.round(d/avail*100)) : 0;
            return `<tr class="demand-row">
                <td style="font-weight:600">${icon} ${name}</td>
                <td style="text-align:center;font-weight:700;font-size:15px;color:#0f2b4f">${d}</td>
                <td style="text-align:center;font-weight:700;font-size:15px;color:#64748b">${avail > 0 ? avail : '—'}</td>
                <td style="min-width:120px">${avail > 0 && d > 0 ? `<div class="analytics-bar-track" style="height:6px"><div class="analytics-bar-fill" style="width:${barW}%;background:${statusColor}"></div></div>` : ''}</td>
                <td>${badge}</td>
            </tr>`;
        };

        const seatRows = seats.map(s => demandRow(s.icon, s.name, demand[s.key], parseInt(stock[s.key])||0)).join('');
        const accRows  = accessories.map(a => demandRow('🎒', a.name, accDemand[a.id]||0, parseInt(a.quantity)||0)).join('');
        const rows = seatRows + accRows;

        return `
        <div class="card" style="margin-bottom:20px">
            <div class="card-header">
                <h3>🪑 Demanda de Cadeirinhas e Equipamentos</h3>
                ${!hasAnyDemand ? '<span style="font-size:12px;color:#94a3b8">Nenhuma solicitação no período</span>' : ''}
            </div>
            <div style="overflow-x:auto">
                <table>
                    <thead><tr>
                        <th>Equipamento</th>
                        <th style="text-align:center">Solicitado<br><small style="font-weight:400">no período</small></th>
                        <th style="text-align:center">Disponível<br><small style="font-weight:400">em estoque</small></th>
                        <th>Ocupação</th>
                        <th>Situação</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <div style="padding:10px 16px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0">
                ℹ️ Demanda acima do estoque não bloqueia reservas — serve apenas para planejamento de compras.
                Configure o estoque disponível em <strong>Configurações → Estoque de Equipamentos</strong>.
            </div>
        </div>`;
    },

    applyDashFilters() {
        const from = document.getElementById('dash-from')?.value;
        const to   = document.getElementById('dash-to')?.value;
        const all  = this.getReservations();
        const filtered = all.filter(r => {
            const d = (r.submittedAt || r.pickupDate || '').slice(0, 10);
            return (!from || d >= from) && (!to || d <= to);
        });
        const sEl = document.getElementById('dash-stats');
        const aEl = document.getElementById('dash-analytics');
        if (sEl) sEl.innerHTML = this.renderDashStats(filtered);
        if (aEl) aEl.innerHTML = this.renderDashAnalytics(filtered);
    },

    setDashPeriod(days) {
        const now  = new Date().toISOString().slice(0, 10);
        const from = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
        const fEl = document.getElementById('dash-from');
        const tEl = document.getElementById('dash-to');
        if (fEl) fEl.value = from;
        if (tEl) tEl.value = now;
        this.applyDashFilters();
    },

    dashSearch(q) {
        q = q.toLowerCase().trim();
        const all  = this.getReservations().slice().reverse();
        const list = q ? all.filter(r =>
            (r.clientName     || '').toLowerCase().includes(q) ||
            (r.clientCPF      || '').replace(/\D/g,'').includes(q.replace(/\D/g,'')) ||
            (r.category       || '').toLowerCase().includes(q) ||
            (r.pickupDate     || '').includes(q) ||
            (r.clientWhatsapp || '').includes(q)
        ) : all.slice(0, 10);
        const wrap = document.getElementById('dash-reservations-table');
        if (wrap) wrap.innerHTML = this.renderReservationsTable(list.slice(0, 50));
    },

    // ==========================================
    // ACCESSORIES
    // ==========================================
    renderAccessories() {
        const rows = Object.values(this.db.accessories || {}).map(a => `
            <tr>
                <td class="td-name">${a.name}</td>
                <td class="td-price">${this.fmtMoney(a.price)}</td>
                <td><span class="td-badge ${a.price_type}">${a.price_type === 'per_day' ? 'Por dia' : 'Fixo'}</span></td>
                <td style="text-align:center;font-weight:700;font-size:15px;color:#0f2b4f">${a.quantity ?? 0}</td>
                <td>${a.allow_quantity ? '✅ Sim' : '—'}</td>
                <td style="font-size:12px;color:#64748b">${(a.description||'').substring(0,50)}</td>
                <td class="actions">
                    <button class="btn-icon" onclick="Admin.openAccessoryModal('${a.id}')">✏️ Editar</button>
                    <button class="btn-danger" onclick="Admin.deleteItem('accessories','${a.id}','${a.name}')">🗑️</button>
                </td>
            </tr>`).join('');

        return `
        <div class="page-header">
            <h1>🎒 Acessórios</h1>
            <button class="btn-primary" onclick="Admin.newAccessoryModal()">+ Novo Acessório</button>
        </div>
        <div class="alert alert-info" style="margin-bottom:20px">
            Acessórios aparecem no formulário de reserva junto com os demais itens opcionais.
            Defina a quantidade em estoque para acompanhar a demanda no Dashboard.
        </div>
        <div class="card">
            <div class="table-wrap">
                ${rows ? `
                <table>
                    <thead><tr>
                        <th>Nome</th><th>Preço</th><th>Tipo</th><th style="text-align:center">Estoque</th><th>Qtd variável?</th><th>Descrição</th><th>Ações</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>` : `
                <div class="empty-state">
                    <div class="empty-icon">🎒</div>
                    <p>Nenhum acessório cadastrado.</p>
                    <p style="margin-top:8px;font-size:12px">Adicione itens locados por diária como GPS, cadeira de praia, etc.</p>
                </div>`}
            </div>
        </div>`;
    },

    newAccessoryModal() {
        document.getElementById('modal-title').textContent = '🎒 Novo Acessório';
        document.getElementById('modal-body').innerHTML = `
            <div class="form-grid">
                <div class="form-group full">
                    <label>Nome</label>
                    <input type="text" id="f-name" placeholder="Ex: GPS PORTÁTIL">
                </div>
                <div class="form-group">
                    <label>Preço (R$)</label>
                    <input type="number" id="f-price" placeholder="0,00" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Tipo de Cobrança</label>
                    <select id="f-ptype">
                        <option value="per_day">Por dia</option>
                        <option value="fixed">Valor fixo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Qtd. em Estoque</label>
                    <input type="number" id="f-stock" value="1" min="0" placeholder="0">
                </div>
                <div class="form-group full">
                    <label>Descrição</label>
                    <textarea id="f-desc" rows="2" placeholder="Descreva o acessório..."></textarea>
                </div>
                <div class="form-group full">
                    <div class="checkbox-row">
                        <input type="checkbox" id="f-qty">
                        <span>Permite selecionar quantidade (cliente pode pedir mais de 1)</span>
                    </div>
                </div>
            </div>`;
        this.modalSaveCallback = () => {
            const name  = document.getElementById('f-name').value.trim();
            const price = parseFloat(document.getElementById('f-price').value);
            if (!name || isNaN(price) || price < 0) { this.showToast('Preencha nome e preço.', 'error'); return false; }
            const id = this.generateId(name);
            if (!this.db.accessories) this.db.accessories = {};
            this.db.accessories[id] = {
                id, name, price,
                price_type:     document.getElementById('f-ptype').value,
                quantity:       parseInt(document.getElementById('f-stock').value) || 0,
                description:    document.getElementById('f-desc').value.trim(),
                allow_quantity: document.getElementById('f-qty').checked,
                isAccessory:    true,
                isCadeirinha:   false
            };
            this.saveDB();
            return true;
        };
        this.openModal();
    },

    openAccessoryModal(id) {
        const a = this.db.accessories?.[id];
        if (!a) return;
        document.getElementById('modal-title').textContent = `✏️ Editar — ${a.name}`;
        document.getElementById('modal-body').innerHTML = `
            <div class="form-grid">
                <div class="form-group full">
                    <label>Nome</label>
                    <input type="text" id="f-name" value="${a.name}">
                </div>
                <div class="form-group">
                    <label>Preço (R$)</label>
                    <input type="number" id="f-price" value="${a.price}" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Tipo de Cobrança</label>
                    <select id="f-ptype">
                        <option value="per_day" ${a.price_type==='per_day'?'selected':''}>Por dia</option>
                        <option value="fixed"   ${a.price_type==='fixed'  ?'selected':''}>Valor fixo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Qtd. em Estoque</label>
                    <input type="number" id="f-stock" value="${a.quantity ?? 0}" min="0">
                </div>
                <div class="form-group full">
                    <label>Descrição</label>
                    <textarea id="f-desc" rows="2">${a.description || ''}</textarea>
                </div>
                <div class="form-group full">
                    <div class="checkbox-row">
                        <input type="checkbox" id="f-qty" ${a.allow_quantity?'checked':''}>
                        <span>Permite selecionar quantidade</span>
                    </div>
                </div>
            </div>`;
        this.modalSaveCallback = () => {
            const name  = document.getElementById('f-name').value.trim();
            const price = parseFloat(document.getElementById('f-price').value);
            if (!name || isNaN(price) || price < 0) { this.showToast('Preencha nome e preço.', 'error'); return false; }
            this.db.accessories[id] = Object.assign({}, a, {
                name, price,
                price_type:     document.getElementById('f-ptype').value,
                quantity:       parseInt(document.getElementById('f-stock').value) || 0,
                description:    document.getElementById('f-desc').value.trim(),
                allow_quantity: document.getElementById('f-qty').checked
            });
            this.saveDB();
            return true;
        };
        this.openModal();
    },

    // ==========================================
    // SEASONAL PRICING
    // ==========================================
    renderSeasonal() {
        const list = this.getSeasonal();
        const today = new Date().toISOString().slice(0, 10);

        const rows = list.map(s => {
            const isActive  = today >= s.from && today <= s.to;
            const overrides = Object.keys(s.prices || {}).filter(k => s.prices[k] !== '' && s.prices[k] != null).length;
            const badge     = isActive ? ' <span class="td-badge" style="background:#dcfce7;color:#166534;margin-left:6px">🟢 Ativa</span>' : '';
            return `
            <tr>
                <td class="td-name">${s.name}${badge}</td>
                <td>${this.fmtDateSimple(s.from)}</td>
                <td>${this.fmtDateSimple(s.to)}</td>
                <td>${overrides} categoria${overrides !== 1 ? 's' : ''} configurada${overrides !== 1 ? 's' : ''}</td>
                <td class="actions">
                    <button class="btn-icon" onclick="Admin.openSeasonalModal('${s.id}')">✏️ Editar</button>
                    <button class="btn-danger" onclick="Admin.deleteSeasonalPeriod('${s.id}','${s.name.replace(/'/g,"\\'").replace(/"/g,"&quot;")}')">🗑️</button>
                </td>
            </tr>`;
        }).join('');

        return `
        <div class="page-header">
            <h1>🗓️ Sazonalidade</h1>
            <button class="btn-primary" onclick="Admin.newSeasonalModal()">+ Novo Período</button>
        </div>
        <div class="alert alert-info" style="margin-bottom:20px">
            <strong>Como funciona:</strong> Configure preços específicos por período para cada grupo de veículo.
            O sistema aplica automaticamente o preço sazonal com base na <strong>data de retirada</strong> do cliente.
            Categorias sem preço configurado usam o valor padrão.
        </div>
        <div class="card">
            <div class="table-wrap">
                ${list.length ? `
                <table>
                    <thead><tr>
                        <th>Nome do Período</th><th>Início</th><th>Fim</th><th>Configuração</th><th>Ações</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>` : `
                <div class="empty-state">
                    <div class="empty-icon">🗓️</div>
                    <p>Nenhum período sazonal configurado.</p>
                    <p style="margin-top:8px;font-size:12px">Crie períodos para tarifas diferenciadas em alta temporada, feriados e férias.</p>
                </div>`}
            </div>
        </div>`;
    },

    _buildSeasonalForm(existing) {
        const priceInputs = Object.values(this.db.categories).map(c => {
            const val = (existing && existing.prices && existing.prices[c.id] != null) ? existing.prices[c.id] : '';
            return `
            <div class="seasonal-cat-row">
                <div>
                    <div class="seasonal-cat-name">${c.name}</div>
                    <div class="seasonal-cat-base">Padrão: ${this.fmtMoney(c.price_per_day)}/dia</div>
                </div>
                <input type="number" class="seasonal-price-input"
                       data-cat="${c.id}"
                       placeholder="${c.price_per_day.toFixed(2)}"
                       value="${val}"
                       step="0.01" min="0">
            </div>`;
        }).join('');

        return `
        <div class="form-grid">
            <div class="form-group full">
                <label>Nome do Período</label>
                <input type="text" id="f-sname" value="${existing ? existing.name : ''}" placeholder="Ex: Alta Temporada Julho 2026">
            </div>
            <div class="form-group">
                <label>Data Início</label>
                <input type="date" id="f-sfrom" value="${existing ? existing.from : ''}">
            </div>
            <div class="form-group">
                <label>Data Fim</label>
                <input type="date" id="f-sto" value="${existing ? existing.to : ''}">
            </div>
            <div class="form-group full">
                <label>Preço por Dia — por Categoria (deixe vazio para usar preço padrão)</label>
                <div class="seasonal-price-grid">${priceInputs}</div>
            </div>
        </div>`;
    },

    newSeasonalModal() {
        document.getElementById('modal-title').textContent = '🗓️ Novo Período Sazonal';
        document.getElementById('modal-body').innerHTML = this._buildSeasonalForm(null);
        this.modalSaveCallback = () => {
            const name = document.getElementById('f-sname').value.trim();
            const from = document.getElementById('f-sfrom').value;
            const to   = document.getElementById('f-sto').value;
            if (!name || !from || !to) { this.showToast('Preencha nome, data início e data fim.', 'error'); return false; }
            if (from > to) { this.showToast('Data início deve ser anterior à data fim.', 'error'); return false; }
            const prices = {};
            document.querySelectorAll('.seasonal-price-input').forEach(inp => {
                const v = inp.value.trim();
                if (v !== '') prices[inp.dataset.cat] = parseFloat(v);
            });
            const list = this.getSeasonal();
            list.push({ id: this.generateId(name), name, from, to, prices });
            this.saveSeasonal(list);
            return true;
        };
        this.openModal();
    },

    openSeasonalModal(id) {
        const list = this.getSeasonal();
        const s = list.find(x => x.id === id);
        if (!s) return;
        document.getElementById('modal-title').textContent = `✏️ Editar — ${s.name}`;
        document.getElementById('modal-body').innerHTML = this._buildSeasonalForm(s);
        this.modalSaveCallback = () => {
            const name = document.getElementById('f-sname').value.trim();
            const from = document.getElementById('f-sfrom').value;
            const to   = document.getElementById('f-sto').value;
            if (!name || !from || !to) { this.showToast('Preencha nome, data início e data fim.', 'error'); return false; }
            if (from > to) { this.showToast('Data início deve ser anterior à data fim.', 'error'); return false; }
            const prices = {};
            document.querySelectorAll('.seasonal-price-input').forEach(inp => {
                const v = inp.value.trim();
                if (v !== '') prices[inp.dataset.cat] = parseFloat(v);
            });
            const idx = list.findIndex(x => x.id === id);
            if (idx >= 0) list[idx] = { ...s, name, from, to, prices };
            this.saveSeasonal(list);
            return true;
        };
        this.openModal();
    },

    deleteSeasonalPeriod(id, name) {
        if (!confirm(`Excluir o período "${name}"?\nOs preços padrão serão restaurados para este período.`)) return;
        this.saveSeasonal(this.getSeasonal().filter(s => s.id !== id));
        this.showToast('Período excluído.', 'success');
        this.navigate('seasonal');
    },

    // ==========================================
    // CATEGORIES
    // ==========================================
    renderCategories() {
        const rows = Object.values(this.db.categories).map(c => `
            <tr>
                <td class="td-name">${c.name}</td>
                <td class="td-price">${this.fmtMoney(c.price_per_day)}<small>/dia</small></td>
                <td><span class="td-badge ${c.transmission === 'Manual' ? 'manual' : ''}">${c.transmission}</span></td>
                <td style="text-align:center;font-weight:700;font-size:15px;color:#0f2b4f">${c.quantity ?? 1}</td>
                <td>${c.maxPessoas || 5} pessoas</td>
                <td>${c.maxCadeirinhas || 2} cadeirinhas</td>
                <td class="actions">
                    <button class="btn-icon" onclick="Admin.openCategoryModal('${c.id}')">✏️ Editar</button>
                    <button class="btn-danger" onclick="Admin.deleteItem('categories','${c.id}','${c.name}')">🗑️</button>
                </td>
            </tr>`).join('');

        return `
        <div class="page-header">
            <h1>🚗 Veículos</h1>
            <button class="btn-primary" onclick="Admin.newCategoryModal()">+ Novo Veículo</button>
        </div>
        <div class="card">
            <div class="table-wrap">
                <table>
                    <thead><tr>
                        <th>Nome / Grupo</th><th>Preço por Dia</th><th>Câmbio</th><th style="text-align:center">Frota</th><th>Capacidade</th><th>Cadeirinhas</th><th>Ações</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
    },

    newCategoryModal() {
        document.getElementById('modal-title').textContent = '🚗 Novo Veículo';
        document.getElementById('modal-body').innerHTML = `
            <div class="form-grid">
                <div class="form-group">
                    <label>Nome / Grupo</label>
                    <input type="text" id="f-name" placeholder="Ex: GRUPO K">
                </div>
                <div class="form-group">
                    <label>Preço por Dia (R$)</label>
                    <input type="number" id="f-price" placeholder="0,00" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Câmbio</label>
                    <select id="f-transmission">
                        <option value="Manual">Manual</option>
                        <option value="Automático">Automático</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Máx. Pessoas</label>
                    <select id="f-maxpessoas">
                        <option value="5">5 pessoas</option>
                        <option value="7">7 pessoas</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Máx. Cadeirinhas</label>
                    <select id="f-maxcadeirinhas">
                        <option value="2">2 cadeirinhas</option>
                        <option value="4">4 cadeirinhas</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Qtd. na Frota</label>
                    <input type="number" id="f-qty" value="1" min="1" placeholder="1">
                </div>
                <div class="form-group full">
                    <label>Descrição</label>
                    <textarea id="f-desc" rows="3" placeholder="Descreva o veículo..."></textarea>
                </div>
            </div>`;
        this.modalSaveCallback = () => {
            const name  = document.getElementById('f-name').value.trim();
            const price = parseFloat(document.getElementById('f-price').value);
            if (!name || isNaN(price) || price < 0) {
                this.showToast('Preencha nome e preço corretamente.', 'error');
                return false;
            }
            const id = this.generateId(name);
            this.db.categories[id] = {
                id, name, price_per_day: price,
                transmission: document.getElementById('f-transmission').value,
                maxPessoas: parseInt(document.getElementById('f-maxpessoas').value),
                maxCadeirinhas: parseInt(document.getElementById('f-maxcadeirinhas').value),
                quantity: parseInt(document.getElementById('f-qty').value) || 1,
                description: document.getElementById('f-desc').value.trim()
            };
            this.saveDB();
            return true;
        };
        this.openModal();
    },

    openCategoryModal(id) {
        const c = this.db.categories[id];
        if (!c) return;
        document.getElementById('modal-title').textContent = `✏️ Editar — ${c.name}`;
        document.getElementById('modal-body').innerHTML = `
            <div class="form-grid">
                <div class="form-group">
                    <label>Nome / Grupo</label>
                    <input type="text" id="f-name" value="${c.name}">
                </div>
                <div class="form-group">
                    <label>Preço por Dia (R$)</label>
                    <input type="number" id="f-price" value="${c.price_per_day}" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Câmbio</label>
                    <select id="f-transmission">
                        <option value="Manual" ${c.transmission === 'Manual' ? 'selected' : ''}>Manual</option>
                        <option value="Automático" ${c.transmission === 'Automático' ? 'selected' : ''}>Automático</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Máx. Pessoas</label>
                    <select id="f-maxpessoas">
                        <option value="5" ${c.maxPessoas == 5 ? 'selected' : ''}>5 pessoas</option>
                        <option value="7" ${c.maxPessoas == 7 ? 'selected' : ''}>7 pessoas</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Máx. Cadeirinhas</label>
                    <select id="f-maxcadeirinhas">
                        <option value="2" ${c.maxCadeirinhas == 2 ? 'selected' : ''}>2 cadeirinhas</option>
                        <option value="4" ${c.maxCadeirinhas == 4 ? 'selected' : ''}>4 cadeirinhas</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Qtd. na Frota</label>
                    <input type="number" id="f-qty" value="${c.quantity ?? 1}" min="1">
                </div>
                <div class="form-group full">
                    <label>Descrição</label>
                    <textarea id="f-desc" rows="3">${c.description || ''}</textarea>
                </div>
            </div>`;

        this.modalSaveCallback = () => {
            const name  = document.getElementById('f-name').value.trim();
            const price = parseFloat(document.getElementById('f-price').value);
            if (!name || isNaN(price) || price < 0) {
                this.showToast('Preencha nome e preço corretamente.', 'error');
                return false;
            }
            this.db.categories[id] = Object.assign({}, c, {
                name,
                price_per_day: price,
                transmission: document.getElementById('f-transmission').value,
                maxPessoas: parseInt(document.getElementById('f-maxpessoas').value),
                maxCadeirinhas: parseInt(document.getElementById('f-maxcadeirinhas').value),
                quantity: parseInt(document.getElementById('f-qty').value) || 1,
                description: document.getElementById('f-desc').value.trim()
            });
            this.saveDB();
            return true;
        };
        this.openModal();
    },

    // ==========================================
    // PROTECTIONS
    // ==========================================
    renderProtections() {
        const rows = Object.values(this.db.protections).map(p => `
            <tr>
                <td class="td-name">${p.name}</td>
                <td class="td-price">${this.fmtMoney(p.price)}</td>
                <td><span class="td-badge ${p.price_type}">${p.price_type === 'per_day' ? 'Por dia' : 'Fixo'}</span></td>
                <td style="max-width:280px;font-size:12px;color:#64748b">${p.description?.substring(0, 80)}...</td>
                <td class="actions">
                    <button class="btn-icon" onclick="Admin.openProtectionModal('${p.id}')">✏️ Editar</button>
                    <button class="btn-danger" onclick="Admin.deleteItem('protections','${p.id}','${p.name}')">🗑️</button>
                </td>
            </tr>`).join('');

        return `
        <div class="page-header">
            <h1>🛡️ Proteções</h1>
            <button class="btn-primary" onclick="Admin.newProtectionModal()">+ Nova Proteção</button>
        </div>
        <div class="card">
            <div class="table-wrap">
                <table>
                    <thead><tr>
                        <th>Nome</th><th>Preço</th><th>Tipo</th><th>Descrição</th><th>Ações</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
    },

    newProtectionModal() {
        document.getElementById('modal-title').textContent = '🛡️ Nova Proteção';
        document.getElementById('modal-body').innerHTML = `
            <div class="form-grid">
                <div class="form-group full">
                    <label>Nome</label>
                    <input type="text" id="f-name" placeholder="Ex: PROTEÇÃO TOTAL">
                </div>
                <div class="form-group">
                    <label>Preço (R$)</label>
                    <input type="number" id="f-price" placeholder="0,00" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Tipo de Cobrança</label>
                    <select id="f-ptype">
                        <option value="per_day">Por dia</option>
                        <option value="fixed">Valor fixo</option>
                    </select>
                </div>
                <div class="form-group full">
                    <label>Descrição</label>
                    <textarea id="f-desc" rows="4" placeholder="Descreva as coberturas desta proteção..."></textarea>
                </div>
            </div>`;
        this.modalSaveCallback = () => {
            const name  = document.getElementById('f-name').value.trim();
            const price = parseFloat(document.getElementById('f-price').value);
            if (!name || isNaN(price) || price < 0) {
                this.showToast('Preencha nome e preço corretamente.', 'error');
                return false;
            }
            const id = this.generateId(name);
            this.db.protections[id] = {
                id, name, price,
                price_type: document.getElementById('f-ptype').value,
                description: document.getElementById('f-desc').value.trim()
            };
            this.saveDB();
            return true;
        };
        this.openModal();
    },

    openProtectionModal(id) {
        const p = this.db.protections[id];
        if (!p) return;
        document.getElementById('modal-title').textContent = `✏️ Editar — ${p.name}`;
        document.getElementById('modal-body').innerHTML = `
            <div class="form-grid">
                <div class="form-group full">
                    <label>Nome</label>
                    <input type="text" id="f-name" value="${p.name}">
                </div>
                <div class="form-group">
                    <label>Preço (R$)</label>
                    <input type="number" id="f-price" value="${p.price}" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Tipo de Cobrança</label>
                    <select id="f-ptype">
                        <option value="per_day" ${p.price_type === 'per_day' ? 'selected' : ''}>Por dia</option>
                        <option value="fixed"   ${p.price_type === 'fixed'   ? 'selected' : ''}>Valor fixo</option>
                    </select>
                </div>
                <div class="form-group full">
                    <label>Descrição — use *texto* para negrito e Enter para nova linha</label>
                    <textarea id="f-desc" rows="6" placeholder="Ex: *Cobertura:* danos a terceiros.&#10;*Participação:* R$ 1.200,00">${p.description || ''}</textarea>
                </div>
            </div>`;

        this.modalSaveCallback = () => {
            const name  = document.getElementById('f-name').value.trim();
            const price = parseFloat(document.getElementById('f-price').value);
            if (!name || isNaN(price) || price < 0) {
                this.showToast('Preencha nome e preço corretamente.', 'error');
                return false;
            }
            this.db.protections[id] = Object.assign({}, p, {
                name, price,
                price_type: document.getElementById('f-ptype').value,
                description: document.getElementById('f-desc').value.trim()
            });
            this.saveDB();
            return true;
        };
        this.openModal();
    },

    // ==========================================
    // ADDITIONALS
    // ==========================================
    renderAdditionals() {
        const rows = Object.values(this.db.additionals).map(a => `
            <tr>
                <td class="td-name">${a.name}</td>
                <td class="td-price">${this.fmtMoney(a.price)}</td>
                <td><span class="td-badge ${a.price_type}">${a.price_type === 'per_day' ? 'Por dia' : 'Fixo'}</span></td>
                <td>${a.allow_quantity ? '✅ Sim' : '—'}</td>
                <td style="font-size:12px;color:#64748b">${a.description?.substring(0, 50)}</td>
                <td class="actions">
                    <button class="btn-icon" onclick="Admin.openAdditionalModal('${a.id}')">✏️ Editar</button>
                    <button class="btn-danger" onclick="Admin.deleteItem('additionals','${a.id}','${a.name}')">🗑️</button>
                </td>
            </tr>`).join('');

        return `
        <div class="page-header">
            <h1>➕ Adicionais</h1>
            <button class="btn-primary" onclick="Admin.newAdditionalModal()">+ Novo Adicional</button>
        </div>
        <div class="card">
            <div class="table-wrap">
                <table>
                    <thead><tr>
                        <th>Nome</th><th>Preço</th><th>Tipo</th><th>Qtd variável?</th><th>Descrição</th><th>Ações</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
    },

    newAdditionalModal() {
        document.getElementById('modal-title').textContent = '➕ Novo Adicional';
        document.getElementById('modal-body').innerHTML = `
            <div class="form-grid">
                <div class="form-group full">
                    <label>Nome</label>
                    <input type="text" id="f-name" placeholder="Ex: GPS PORTÁTIL">
                </div>
                <div class="form-group">
                    <label>Preço (R$)</label>
                    <input type="number" id="f-price" placeholder="0,00" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Tipo de Cobrança</label>
                    <select id="f-ptype">
                        <option value="per_day">Por dia</option>
                        <option value="fixed">Valor fixo</option>
                    </select>
                </div>
                <div class="form-group full">
                    <label>Descrição</label>
                    <textarea id="f-desc" rows="3" placeholder="Descreva o serviço adicional..."></textarea>
                </div>
                <div class="form-group full">
                    <label>Opções</label>
                    <div class="checkbox-row">
                        <input type="checkbox" id="f-qty">
                        <span>Permite selecionar quantidade (ex: cadeirinhas)</span>
                    </div>
                </div>
            </div>`;
        this.modalSaveCallback = () => {
            const name  = document.getElementById('f-name').value.trim();
            const price = parseFloat(document.getElementById('f-price').value);
            if (!name || isNaN(price) || price < 0) {
                this.showToast('Preencha nome e preço corretamente.', 'error');
                return false;
            }
            const id = this.generateId(name);
            this.db.additionals[id] = {
                id, name, price,
                price_type: document.getElementById('f-ptype').value,
                description: document.getElementById('f-desc').value.trim(),
                allow_quantity: document.getElementById('f-qty').checked,
                isCadeirinha: false
            };
            this.saveDB();
            return true;
        };
        this.openModal();
    },

    openAdditionalModal(id) {
        const a = this.db.additionals[id];
        if (!a) return;
        document.getElementById('modal-title').textContent = `✏️ Editar — ${a.name}`;
        document.getElementById('modal-body').innerHTML = `
            <div class="form-grid">
                <div class="form-group full">
                    <label>Nome</label>
                    <input type="text" id="f-name" value="${a.name}">
                </div>
                <div class="form-group">
                    <label>Preço (R$)</label>
                    <input type="number" id="f-price" value="${a.price}" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Tipo de Cobrança</label>
                    <select id="f-ptype">
                        <option value="per_day" ${a.price_type === 'per_day' ? 'selected' : ''}>Por dia</option>
                        <option value="fixed"   ${a.price_type === 'fixed'   ? 'selected' : ''}>Valor fixo</option>
                    </select>
                </div>
                <div class="form-group full">
                    <label>Descrição</label>
                    <textarea id="f-desc" rows="3">${a.description || ''}</textarea>
                </div>
                <div class="form-group full">
                    <label>Opções</label>
                    <div class="checkbox-row">
                        <input type="checkbox" id="f-qty" ${a.allow_quantity ? 'checked' : ''}>
                        <span>Permite selecionar quantidade (ex: cadeirinhas)</span>
                    </div>
                </div>
            </div>`;

        this.modalSaveCallback = () => {
            const name  = document.getElementById('f-name').value.trim();
            const price = parseFloat(document.getElementById('f-price').value);
            if (!name || isNaN(price) || price < 0) {
                this.showToast('Preencha nome e preço corretamente.', 'error');
                return false;
            }
            this.db.additionals[id] = Object.assign({}, a, {
                name, price,
                price_type: document.getElementById('f-ptype').value,
                description: document.getElementById('f-desc').value.trim(),
                allow_quantity: document.getElementById('f-qty').checked
            });
            this.saveDB();
            return true;
        };
        this.openModal();
    },

    // ==========================================
    // RESERVATIONS
    // ==========================================
    renderReservations() {
        const all = this.getReservations();
        const categories = [...new Set(all.map(r => r.category).filter(Boolean))];

        return `
        <div class="page-header">
            <h1>📋 Reservas</h1>
            <div class="header-actions">
                <button class="btn-secondary" onclick="Admin.exportCSV()">📥 Exportar CSV</button>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <div class="filter-bar">
                    <input type="text" id="filter-name" placeholder="🔍 Nome / CPF / Veículo">
                    <input type="date" id="filter-date-from" title="Retirada — De">
                    <input type="date" id="filter-date-to"   title="Retirada — Até">
                    <select id="filter-vehicle">
                        <option value="">Todos os veículos</option>
                        ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                    <select id="filter-status">
                        <option value="">Todos os status</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Confirmada">Confirmada</option>
                        <option value="Em andamento">Em andamento</option>
                        <option value="Concluída">Concluída</option>
                        <option value="Cancelada">Cancelada</option>
                    </select>
                    <button class="btn-secondary" onclick="Admin.applyFilters()">Filtrar</button>
                    <button class="btn-secondary" onclick="Admin.clearFilters()">Limpar</button>
                </div>
            </div>
            <div class="table-wrap" id="reservations-table-wrap">
                ${this.renderReservationsTable(all.slice().reverse())}
            </div>
        </div>`;
    },

    renderReservationsTable(list) {
        if (!list.length) return `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <p>Nenhuma reserva encontrada.</p>
                <p style="margin-top:8px;font-size:12px">As reservas aparecem aqui após serem enviadas pelo formulário.</p>
            </div>`;

        const STATUS_COLORS = {
            'Pendente':      '#f59e0b',
            'Confirmada':    '#22c55e',
            'Em andamento':  '#FF6B00',
            'Concluída':     '#3b82f6',
            'Cancelada':     '#ef4444'
        };
        const STATUS_OPTS = ['Pendente','Confirmada','Em andamento','Concluída','Cancelada'];

        const rows = list.map(r => {
            const status = r.status || 'Pendente';
            const color  = STATUS_COLORS[status] || '#64748b';
            const opts   = STATUS_OPTS.map(s =>
                `<option value="${s}" ${s === status ? 'selected' : ''}>${s}</option>`
            ).join('');
            return `
            <tr>
                <td style="font-size:12px">${this.fmtDate(r.submittedAt || r.pickupDate)}</td>
                <td class="td-name">${r.clientName || '—'}</td>
                <td>${r.clientWhatsapp || '—'}</td>
                <td>${r.category || '—'}</td>
                <td class="td-price">${r.total ? this.fmtMoney(r.total) : '—'}</td>
                <td>${r.pickupDate || '—'}</td>
                <td>
                    <select class="status-select" style="border-color:${color};color:${color}"
                            onchange="Admin.updateReservationStatus('${r.id||''}', this.value); Admin.updateStatusSelectColor(this)"
                            ${!r.id ? 'disabled title="Reserva sem ID — use reimportar backup"' : ''}>
                        ${opts}
                    </select>
                </td>
            </tr>`;
        }).join('');

        return `<table>
            <thead><tr>
                <th>Enviado em</th><th>Cliente</th><th>WhatsApp</th><th>Veículo</th><th>Total</th><th>Retirada</th><th>Status</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
    },

    bindReservationFilters() { /* filters bound via onclick */ },

    applyFilters() {
        let list    = this.getReservations().slice().reverse();
        const name  = document.getElementById('filter-name')?.value.toLowerCase().trim();
        const from  = document.getElementById('filter-date-from')?.value;
        const to    = document.getElementById('filter-date-to')?.value;
        const veh   = document.getElementById('filter-vehicle')?.value;
        const stat  = document.getElementById('filter-status')?.value;

        if (name)  list = list.filter(r =>
            (r.clientName  || '').toLowerCase().includes(name) ||
            (r.clientCPF   || '').replace(/\D/g,'').includes(name.replace(/\D/g,'')) ||
            (r.category    || '').toLowerCase().includes(name)
        );
        if (veh)   list = list.filter(r => r.category === veh);
        if (stat)  list = list.filter(r => (r.status || 'Pendente') === stat);
        if (from)  list = list.filter(r => (r.pickupDate || '') >= from);
        if (to)    list = list.filter(r => (r.pickupDate || '') <= to);

        document.getElementById('reservations-table-wrap').innerHTML = this.renderReservationsTable(list);
    },

    clearFilters() {
        ['filter-name','filter-date-from','filter-date-to'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        ['filter-vehicle','filter-status'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.selectedIndex = 0;
        });
        this.applyFilters();
    },

    updateReservationStatus(id, newStatus) {
        if (!id) { this.showToast('ID da reserva não encontrado.', 'error'); return; }
        const reservations = this.getReservations();
        const idx = reservations.findIndex(r => r.id === id);
        if (idx === -1) { this.showToast('Reserva não encontrada.', 'error'); return; }
        reservations[idx].status = newStatus;
        localStorage.setItem(this.RESERVATIONS_KEY, JSON.stringify(reservations));
        this.showToast(`✅ Status: ${newStatus}`, 'success');
    },

    updateStatusSelectColor(sel) {
        const colors = {
            'Pendente': '#f59e0b', 'Confirmada': '#22c55e',
            'Em andamento': '#FF6B00', 'Concluída': '#3b82f6', 'Cancelada': '#ef4444'
        };
        const c = colors[sel.value] || '#64748b';
        sel.style.borderColor = c;
        sel.style.color = c;
    },

    exportCSV() {
        const list = this.getReservations();
        if (!list.length) { this.showToast('Sem reservas para exportar.', 'error'); return; }

        const header = ['Data','Cliente','WhatsApp','Email','CPF','Veículo','Proteção','Total','Retirada','Devolução','Status'];
        const rows = list.map(r => [
            this.fmtDate(r.submittedAt || r.pickupDate),
            r.clientName, r.clientWhatsapp, r.clientEmail, r.clientCPF,
            r.category, r.protection, r.total,
            `${r.pickupDate} ${r.pickupTime}`,
            `${r.returnDate} ${r.returnTime}`,
            r.status || 'Pendente'
        ].map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(';'));

        const csv = '\uFEFF' + [header.join(';'), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `reservas-igufoz-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('CSV exportado com sucesso!', 'success');
    },

    // ==========================================
    // SETTINGS
    // ==========================================
    renderSettings() {
        const s = this.settings;
        return `
        <div class="page-header"><h1>⚙️ Configurações</h1></div>

        <div class="settings-section">
            <h3>📱 Contato e Integração</h3>
            <div class="settings-form">
                <div class="form-group">
                    <label>Número do WhatsApp (com DDI+DDD, sem espaços)</label>
                    <input type="text" id="s-whatsapp" value="${s.whatsapp}" placeholder="5545988182995">
                </div>
                <div class="form-group">
                    <label>URL do Google Sheets (Web App)</label>
                    <input type="text" id="s-sheets" value="${s.sheetsUrl}" placeholder="https://script.google.com/...">
                </div>
            </div>
        </div>

        <div class="settings-section">
            <h3>🔧 Modo Manutenção</h3>
            <div class="settings-form">
                <div class="maintenance-toggle">
                    <input type="checkbox" id="s-maintenance" ${s.maintenanceMode ? 'checked' : ''} style="width:20px;height:20px;accent-color:#FF6B00;cursor:pointer">
                    <div>
                        <strong>Ativar modo manutenção</strong>
                        <p style="font-size:12px;color:#92400e;margin-top:2px">Quando ativo, o site principal exibe uma mensagem de manutenção.</p>
                    </div>
                </div>
                <div class="form-group">
                    <label>Mensagem de manutenção</label>
                    <input type="text" id="s-maint-msg" value="${s.maintenanceMessage}" placeholder="Sistema em manutenção. Volte em breve!">
                </div>
            </div>
        </div>

        <div class="settings-section">
            <h3>🪑 Estoque de Equipamentos</h3>
            <p style="font-size:13px;color:#64748b;margin-bottom:16px">
                Informe a quantidade de cada item disponível no seu estoque. Usado no Dashboard para análise de demanda por período e apoio à decisão de compra.
            </p>
            <div class="settings-form" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">
                <div class="form-group">
                    <label>👶 Bebê Conforto</label>
                    <input type="number" id="s-stock-bebe" value="${s.stock?.bebe_conforto ?? 0}" min="0" placeholder="0">
                </div>
                <div class="form-group">
                    <label>🧒 Cadeirinha Infantil</label>
                    <input type="number" id="s-stock-cadeirinha" value="${s.stock?.cadeirinha_infantil ?? 0}" min="0" placeholder="0">
                </div>
                <div class="form-group">
                    <label>📏 Assento de Elevação</label>
                    <input type="number" id="s-stock-elevacao" value="${s.stock?.assento_elevacao ?? 0}" min="0" placeholder="0">
                </div>
            </div>
        </div>

        <div class="settings-section">
            <h3>📦 Backup e Restauração</h3>
            <p style="font-size:13px;color:#64748b;margin-bottom:16px">
                Exporte um backup completo (reservas, veículos, proteções, adicionais e configurações) ou restaure a partir de um arquivo salvo.
            </p>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
                <button class="btn-primary" onclick="Admin.exportBackup()">⬇️ Exportar Backup JSON</button>
                <label class="btn-secondary" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px">
                    ⬆️ Importar Backup JSON
                    <input type="file" accept=".json" style="display:none" onchange="Admin.importBackup(this)">
                </label>
            </div>
        </div>

        <div class="settings-section">
            <h3>💾 Publicar Alterações</h3>
            <p style="font-size:13px;color:#64748b;margin-bottom:16px">
                Suas edições de preços já estão ativas localmente. Para publicar no site online (Netlify), baixe o arquivo atualizado e faça o upload novamente.
            </p>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
                <button class="btn-primary" id="save-settings-btn">💾 Salvar Configurações</button>
                <button class="btn-secondary" onclick="Admin.downloadDataJS()">📦 Baixar data.js Atualizado</button>
            </div>
        </div>`;
    },

    bindSettingsForm() {
        document.getElementById('save-settings-btn')?.addEventListener('click', () => {
            const whatsapp = document.getElementById('s-whatsapp').value.trim().replace(/\D/g,'');
            const sheetsUrl = document.getElementById('s-sheets').value.trim();
            if (!whatsapp) { this.showToast('Número do WhatsApp inválido.', 'error'); return; }
            this.settings = {
                whatsapp,
                sheetsUrl,
                maintenanceMode: document.getElementById('s-maintenance').checked,
                maintenanceMessage: document.getElementById('s-maint-msg').value.trim() || 'Sistema em manutenção. Volte em breve!',
                stock: {
                    bebe_conforto:      parseInt(document.getElementById('s-stock-bebe')?.value)       || 0,
                    cadeirinha_infantil: parseInt(document.getElementById('s-stock-cadeirinha')?.value) || 0,
                    assento_elevacao:   parseInt(document.getElementById('s-stock-elevacao')?.value)   || 0
                }
            };
            this.saveSettings();
            this.showToast('✅ Configurações salvas!', 'success');
        });
    },

    downloadDataJS() {
        const now = new Date().toLocaleString('pt-BR');
        const content = `// data.js — Gerado pelo Painel Admin IGUFOZ em ${now}
// Inclua este arquivo ANTES do script.js no index.html:
// <script src="data.js"><\/script>

window.__igufoz_data = ${JSON.stringify({ categories: this.db.categories, protections: this.db.protections, additionals: this.db.additionals, accessories: this.db.accessories }, null, 2)};

window.__igufoz_settings = ${JSON.stringify(this.settings, null, 2)};

window.__igufoz_seasonal = ${JSON.stringify(this.getSeasonal(), null, 2)};
`;
        const blob = new Blob([content], { type: 'text/javascript;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'data.js';
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('✅ data.js baixado! Faça upload no Netlify.', 'success');
    },

    exportBackup() {
        const backup = {
            exportedAt:   new Date().toISOString(),
            version:      '1.0',
            db:           this.db,
            settings:     this.settings,
            reservations: this.getReservations(),
            seasonal:     this.getSeasonal()
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        a.download = `backup-igufoz-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('✅ Backup exportado com sucesso!', 'success');
    },

    importBackup(input) {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const backup = JSON.parse(e.target.result);
                if (!backup.db) throw new Error('Formato inválido');
                const dateStr = backup.exportedAt
                    ? new Date(backup.exportedAt).toLocaleString('pt-BR')
                    : 'data desconhecida';
                if (!confirm(
                    `Importar backup de ${dateStr}?\n\n` +
                    `Isso substituirá TODOS os dados atuais:\n` +
                    `• Veículos, proteções e adicionais\n` +
                    `• Configurações (WhatsApp, Sheets)\n` +
                    `• ${Array.isArray(backup.reservations) ? backup.reservations.length : 0} reserva(s)\n\n` +
                    `Continuar?`
                )) { input.value = ''; return; }

                if (backup.db.categories)  this.db.categories  = backup.db.categories;
                if (backup.db.protections) this.db.protections = backup.db.protections;
                if (backup.db.additionals) this.db.additionals = backup.db.additionals;
                if (backup.db.accessories) this.db.accessories = backup.db.accessories;
                this.saveDB();

                if (backup.settings) {
                    this.settings = Object.assign({}, this.DEFAULT_SETTINGS, backup.settings);
                    this.saveSettings();
                }
                if (Array.isArray(backup.reservations)) {
                    localStorage.setItem(this.RESERVATIONS_KEY, JSON.stringify(backup.reservations));
                }
                this.showToast('✅ Backup importado com sucesso!', 'success');
                setTimeout(() => this.navigate('dashboard'), 800);
            } catch {
                this.showToast('❌ Erro ao importar: arquivo inválido ou corrompido.', 'error');
            }
            input.value = '';
        };
        reader.readAsText(file, 'UTF-8');
    },

    // ==========================================
    // MODAL
    // ==========================================
    openModal() {
        document.getElementById('modal-overlay').classList.add('open');
    },

    closeModal() {
        document.getElementById('modal-overlay').classList.remove('open');
        this.modalSaveCallback = null;
    },

    saveModal() {
        if (!this.modalSaveCallback) { this.closeModal(); return; }
        const ok = this.modalSaveCallback();
        if (ok !== false) {
            this.closeModal();
            this.showToast('✅ Alteração salva com sucesso!', 'success');
            this.navigate(this.currentPage);
        }
    },

    // ==========================================
    // UTILS
    // ==========================================
    generateId(name) {
        const base = name.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '')
            .substring(0, 30);
        return base + '_' + Date.now().toString().slice(-4);
    },

    deleteItem(type, id, name) {
        if (!confirm(`Excluir "${name}"?\n\nEsta ação não pode ser desfeita.`)) return;
        delete this.db[type][id];
        this.saveDB();
        this.showToast(`"${name}" excluído com sucesso.`, 'success');
        this.navigate(this.currentPage);
    },

    showToast(msg, type = 'info') {
        const el = document.getElementById('toast');
        el.textContent = msg;
        el.className = type;
        el.style.display = 'block';
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => { el.style.display = 'none'; }, 3500);
    },

    fmtMoney(val) {
        return 'R$ ' + parseFloat(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    fmtDate(str) {
        if (!str) return '—';
        try {
            const d = new Date(str);
            if (isNaN(d)) return str;
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch { return str; }
    }
};

document.addEventListener('DOMContentLoaded', () => Admin.init());
