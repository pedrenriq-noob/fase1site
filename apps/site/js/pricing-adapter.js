// ── PRICE HELPERS ──────────────────────────────────────────
// Regras de precificação vêm do módulo canônico ../shared/pricing.js
// (cópia byte-idêntica de supabase/functions/_shared/pricing.js, garantida
// por tests/pricing-parity.test.js). Estes wrappers só adaptam o estado S —
// não têm regra de negócio própria.
import { S } from './state.js'
import {
  calcDias as calcDiasCanonico,
  precoDiariaComSazonalidade,
  calcSubtotal as calcSubtotalCanonico,
} from '../shared/pricing.js'

export function getPreco(cat) {
  return precoDiariaComSazonalidade(cat, S.retData, S.sazonalidade)
}

export function calcSubtotal(a, qty) {
  return calcSubtotalCanonico(a.tipo_preco, a.preco, qty, S.dias || 1)
}

export function calcDias() {
  if (!S.retData || !S.devData) { S.dias = 0; return }
  S.dias = calcDiasCanonico(
    `${S.retData}T${S.retHora || '08:00'}`,
    `${S.devData}T${S.devHora || '08:00'}`,
  )
  // Recalcular subtotais dos adicionais já selecionados
  S.adicionais_sel.forEach(sel => {
    const a = S.adicionais.find(x => x.id === sel.id)
    if (a) sel.subtotal = calcSubtotal(a, sel.quantidade)
  })
}

export function getTotalCad() {
  return S.adicionais_sel
    .filter(x => (S.adicionais.find(a => a.id === x.id)?.is_cadeirinha))
    .reduce((s, x) => s + x.quantidade, 0)
}
