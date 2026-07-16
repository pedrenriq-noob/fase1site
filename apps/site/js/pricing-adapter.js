// ── PRICE HELPERS ──────────────────────────────────────────
// Regras de precificação vêm do módulo canônico ../shared/pricing.js
// (cópia byte-idêntica de supabase/functions/_shared/pricing.js, garantida
// por tests/pricing-parity.test.js). Estes wrappers só adaptam o estado S —
// não têm regra de negócio própria.
import { S } from './state.js'
import {
  calcDias as calcDiasCanonico,
  calcDiasItem,
  precoDiariaComSazonalidade,
  calcSubtotal as calcSubtotalCanonico,
} from '../shared/pricing.js'

export function getPreco(cat) {
  return precoDiariaComSazonalidade(cat, S.retData, S.sazonalidade)
}

// Diária de um item específico (proteção/adicional), segundo o
// regra_hora_extra configurado nele (painel admin) — não a diária global
// da categoria (S.dias). Ver docs/DECISION_LOG.md 2026-07-14.
function diasDoItem(item) {
  if (!S.retData || !S.devData) return 0
  return calcDiasItem(
    `${S.retData}T${S.retHora || '08:00'}`,
    `${S.devData}T${S.devHora || '08:00'}`,
    item.regra_hora_extra,
  )
}

export function calcSubtotal(a, qty) {
  return calcSubtotalCanonico(a.tipo_preco, a.preco, qty, diasDoItem(a) || 1)
}

// Subtotal da proteção escolhida — mesma lógica de calcSubtotal, mas para
// o objeto de proteção (que não passa pelo array adicionais_sel).
export function calcBaseProtecao(prot) {
  if (!prot) return 0
  return calcSubtotalCanonico(prot.tipo_preco, prot.preco, 1, diasDoItem(prot) || 1)
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
