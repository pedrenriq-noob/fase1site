// ── STATE ──────────────────────────────────────────────────
// Fonte única de verdade do wizard. Mutável de propósito: todos os módulos
// importam o mesmo objeto S e leem/escrevem diretamente nele — não há
// getters/setters porque o app inteiro roda numa única aba, sem concorrência.
export const S = {
  step: 1,
  maxStep: 1, // maior step já alcançado nesta sessão — habilita navegação clicável na steps-bar
  // datas / horários / locais
  retData: '', retHora: '',
  devData: '', devHora: '',
  retLocal: '', devLocal: '',
  dias: 0,
  // dados carregados do Supabase
  categorias: [], protecoes: [], adicionais: [], sazonalidade: [], locais: [],
  // seleções
  catId: null,
  protId: null,
  adicionais_sel: [],   // [{id, nome, preco, quantidade, tipo_preco, subtotal, auto}]
  // cliente
  nome: '', cpf: '', whatsapp: '', email: '',
  voo: '', companhia: '', pouso: '', pessoas: 1, obs: '',
  termos: false, estrangeiro: false,
}

// ── SESSION PERSISTENCE ────────────────────────────────────
const SESSION_KEY = 'igufoz_rascunho'

export function saveSession() {
  const data = {
    step: S.step, maxStep: S.maxStep, retData: S.retData, retHora: S.retHora,
    devData: S.devData, devHora: S.devHora, retLocal: S.retLocal,
    devLocal: S.devLocal, dias: S.dias, catId: S.catId,
    protId: S.protId, adicionais_sel: S.adicionais_sel,
  }
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)) } catch (_) {}
}

export function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY) } catch (_) {}
}

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) Object.assign(S, JSON.parse(raw))

    // Pré-preenchimento vindo do formulário de busca rápida da landing.
    // Só se aplica ao INICIAR uma reserva do zero (sem rascunho salvo ainda) —
    // nunca sobre uma sessão já em andamento. Sem essa guarda, um reload da
    // página em qualquer step com essas chaves ainda em sessionStorage (ex.:
    // o cliente abriu a landing numa aba/momento anterior) sobrescrevia
    // silenciosamente retData/devData de uma reserva já preenchida, mantendo
    // categoria/proteção/adicionais intactos — reserva e valor exibido
    // ficavam descolados do período real.
    const qsRet   = sessionStorage.getItem('qs_retData')
    const qsDev   = sessionStorage.getItem('qs_devData')
    const qsLocal = sessionStorage.getItem('qs_local')
    if (!raw && (qsRet || qsDev || qsLocal)) {
      if (qsRet)   S.retData  = qsRet
      if (qsDev)   S.devData  = qsDev
      if (qsLocal) S.retLocal = qsLocal
    }
    sessionStorage.removeItem('qs_retData')
    sessionStorage.removeItem('qs_devData')
    sessionStorage.removeItem('qs_local')
  } catch (_) {}
}
