/* ===== Logging ===== */
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LEVEL = LOG_LEVELS.warn;

export const logger = {
  debug: (...a) => CURRENT_LEVEL <= LOG_LEVELS.debug && console.debug('[I-Frotas]', ...a),
  info:  (...a) => CURRENT_LEVEL <= LOG_LEVELS.info  && console.info('[I-Frotas]', ...a),
  warn:  (...a) => CURRENT_LEVEL <= LOG_LEVELS.warn  && console.warn('[I-Frotas]', ...a),
  error: (...a) => CURRENT_LEVEL <= LOG_LEVELS.error && console.error('[I-Frotas]', ...a)
};

/* ===== Date Formatting ===== */
export function formatDate(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateShort(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export function formatTime(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function isOverdue(date) {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  return d < new Date();
}

export function isToday(date) {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth() === now.getMonth() &&
         d.getDate() === now.getDate();
}

export function isTomorrow(date) {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return d.getFullYear() === tomorrow.getFullYear() &&
         d.getMonth() === tomorrow.getMonth() &&
         d.getDate() === tomorrow.getDate();
}

/* ===== Business Logic: Buffer de tempo pós-retorno =====
   Seg-Sáb, retorno até 12:00        → disponível mesmo dia às 16:00
   Seg-Sáb, retorno 12:01–14:00      → disponível dia seguinte às 08:00
   Seg-Sáb, retorno após 14:00       → disponível dia seguinte às 10:00
   Domingo, qualquer horário          → disponível segunda-feira às 12:00
*/
export function calcularDisponivel(dataRetorno) {
  const d = dataRetorno instanceof Date ? new Date(dataRetorno) : new Date(dataRetorno);
  if (isNaN(d)) return null;

  const diaSemana = d.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
  const hora = d.getHours() + d.getMinutes() / 60;

  const resultado = new Date(d);

  if (diaSemana === 0) {
    // Domingo → segunda às 12:00
    const diasAteSegunda = 1;
    resultado.setDate(resultado.getDate() + diasAteSegunda);
    resultado.setHours(12, 0, 0, 0);
    return resultado;
  }

  // Seg–Sáb
  if (hora <= 12) {
    resultado.setHours(16, 0, 0, 0);
    return resultado;
  }

  if (hora <= 14) {
    resultado.setDate(resultado.getDate() + 1);
    resultado.setHours(8, 0, 0, 0);
    // Se cair no domingo, vai para segunda
    if (resultado.getDay() === 0) {
      resultado.setDate(resultado.getDate() + 1);
      resultado.setHours(12, 0, 0, 0);
    }
    return resultado;
  }

  // Após 14:00
  resultado.setDate(resultado.getDate() + 1);
  resultado.setHours(10, 0, 0, 0);
  if (resultado.getDay() === 0) {
    resultado.setDate(resultado.getDate() + 1);
    resultado.setHours(12, 0, 0, 0);
  }
  return resultado;
}

/* ===== Regra do Lavador: disponível 3h após entrada ===== */
export function calcularSaidaLavador(horaEntrada) {
  if (!horaEntrada) return null;
  const d = horaEntrada instanceof Date ? new Date(horaEntrada) : new Date(horaEntrada);
  if (isNaN(d)) return null;
  d.setTime(d.getTime() + 3 * 60 * 60 * 1000);
  return d;
}

/* ===== Status Labels & Colors ===== */
const STATUS_LABELS = {
  DISPONIVEL:  'Disponível',
  LOCADO:      'Locado',
  DEVOLVIDO:   'Devolvido',
  NO_LAVADOR:  'No Lavador',
  MANUTENCAO:  'Manutenção'
};

const RESERVA_STATUS_LABELS = {
  PREVISTO:   'Previsto',
  CONFIRMADO: 'Confirmado',
  CONCLUIDO:  'Concluído',
  CANCELADO:  'Cancelado'
};

export function statusLabel(status) {
  return STATUS_LABELS[status] ?? status ?? '—';
}

export function reservaStatusLabel(status) {
  return RESERVA_STATUS_LABELS[status] ?? status ?? '—';
}

export function statusColor(status) {
  const map = {
    DISPONIVEL: 'disponivel',
    LOCADO:     'locado',
    DEVOLVIDO:  'devolvido',
    NO_LAVADOR: 'lavador',
    MANUTENCAO: 'manutencao'
  };
  return map[status] ?? 'gray';
}

export function reservaStatusColor(status) {
  const map = {
    PREVISTO:   'previsto',
    CONFIRMADO: 'confirmado',
    CONCLUIDO:  'concluido',
    CANCELADO:  'cancelado'
  };
  return map[status] ?? 'gray';
}

/* ===== Categoria Labels ===== */
export function categoriaLabel(cat) {
  if (!cat) return '—';
  const map = {
    B:  'Grupo B',
    C:  'Grupo C',
    D:  'Grupo D',
    'D+': 'Grupo D+',
    E:  'Grupo E',
    F:  'Grupo F',
    G:  'Grupo G',
    H:  'Grupo H',
    I:  'Grupo I',
    J:  'Grupo J'
  };
  return map[cat] ?? `Grupo ${cat}`;
}

/* ===== Disponibilidade Calculation =====
   Returns { disponivel: number, total: number, detalhes: array }
   detalhes items: { placa, modelo, status, disponivel: bool, motivo }
*/
export function calcularDisponibilidade(categoria, inicio, fim, veiculos, reservas) {
  const agora = new Date();
  const inicioD = inicio instanceof Date ? inicio : new Date(inicio);
  const fimD = fim instanceof Date ? fim : new Date(fim);

  const veiculosCat = veiculos.filter((v) => v.categoria === categoria);
  const reservasCat = reservas.filter(
    (r) => r.categoria === categoria &&
           ['PREVISTO', 'CONFIRMADO'].includes(r.status)
  );

  const detalhes = veiculosCat.map((v) => {
    // Veículo locado cujo retorno previsto é após o início da reserva desejada
    if (v.status === 'LOCADO') {
      const prevRetorno = v.prev_retorno ? new Date(v.prev_retorno) : null;
      if (!prevRetorno || prevRetorno > inicioD) {
        return { placa: v.placa, modelo: v.modelo, status: v.status, disponivel: false, motivo: 'Locado — retorno previsto após início' };
      }
      // Retorno antes do início — checar buffer
      const dispApos = calcularDisponivel(prevRetorno);
      if (dispApos && dispApos > inicioD) {
        return { placa: v.placa, modelo: v.modelo, status: v.status, disponivel: false, motivo: `Em preparo — disponível ${formatDate(dispApos)}` };
      }
    }

    // Devolvido/sujo que não estará limpo antes do início
    if (v.status === 'DEVOLVIDO' && !v.limpo) {
      return { placa: v.placa, modelo: v.modelo, status: v.status, disponivel: false, motivo: 'Devolvido — aguardando limpeza' };
    }

    // No lavador — checar se sai antes do início
    if (v.status === 'NO_LAVADOR') {
      const saidaLavador = calcularSaidaLavador(v.hora_entrada_lavador);
      if (saidaLavador && saidaLavador > inicioD) {
        return { placa: v.placa, modelo: v.modelo, status: v.status, disponivel: false, motivo: `No lavador — sai ${formatTime(saidaLavador)}` };
      }
    }

    // Manutenção
    if (v.status === 'MANUTENCAO') {
      return { placa: v.placa, modelo: v.modelo, status: v.status, disponivel: false, motivo: 'Em manutenção' };
    }

    // Verificar conflito com reservas existentes
    const conflito = reservasCat.find((r) => {
      if (r.placa_atribuida && r.placa_atribuida !== v.placa) return false;
      const rSaida = new Date(r.data_saida);
      const rRetorno = new Date(r.data_retorno_prev);
      return rSaida < fimD && rRetorno > inicioD;
    });

    if (conflito) {
      return { placa: v.placa, modelo: v.modelo, status: v.status, disponivel: false, motivo: `Reservado — locação ${conflito.locacao_numero}` };
    }

    return { placa: v.placa, modelo: v.modelo, status: v.status, disponivel: true, motivo: 'Disponível' };
  });

  const disponivel = detalhes.filter((d) => d.disponivel).length;

  return { disponivel, total: veiculosCat.length, detalhes };
}

/* ===== Toast Notifications ===== */
export function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `${icons[type] ?? icons.info}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'none';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ===== Pontos ===== */
export const PONTOS = ['Oklahoma', 'Brasil', 'Garagem', 'Lavador', 'Aeroporto', 'Hotel'];

export const CATEGORIAS = ['B', 'C', 'D', 'D+', 'E', 'F', 'G', 'H', 'I', 'J'];

/* ===== HTML Escaping ===== */
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ===== Relative time ===== */
export function relativeTime(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  const diff = Date.now() - d.getTime();
  const abs = Math.abs(diff);
  const future = diff < 0;

  if (abs < 60000) return 'agora';
  if (abs < 3600000) {
    const m = Math.round(abs / 60000);
    return future ? `em ${m}min` : `${m}min atrás`;
  }
  if (abs < 86400000) {
    const h = Math.round(abs / 3600000);
    return future ? `em ${h}h` : `${h}h atrás`;
  }
  return formatDateShort(d);
}
