// ── ENTRY POINT ─────────────────────────────────────────────
// script.js só cuida do boot (carregar dados + primeiro render). Toda a
// lógica do wizard vive em apps/site/js/ — ver DECISION_LOG.md para o
// racional da divisão em módulos.
import { supabase, TENANT_ID } from './supabase.js'
import { S, loadSession } from './js/state.js'
import { calcDias } from './js/pricing-adapter.js'
import { minDate } from './js/utils.js'
import { renderStep } from './js/render.js'
import { bindCloseHoraPickerOnOutsideClick } from './js/render/hora-picker.js'
import './js/navigation.js' // registra window.nextStep/prevStep/goToStep

async function loadData() {
  const [rC, rP, rA, rS, rL] = await Promise.all([
    supabase.from('categorias').select('*').eq('tenant_id', TENANT_ID).eq('ativo', true).order('ordem'),
    supabase.from('protecoes').select('*').eq('tenant_id', TENANT_ID).eq('ativo', true).order('ordem'),
    supabase.from('adicionais').select('*').eq('tenant_id', TENANT_ID).eq('ativo', true).order('ordem'),
    supabase.from('sazonalidade').select('*').eq('tenant_id', TENANT_ID).order('data_inicio'),
    supabase.from('locais').select('*').eq('tenant_id', TENANT_ID).eq('ativo', true).order('ordem'),
  ])
  if (rC.error || rP.error || rA.error || rS.error) {
    document.getElementById('content').innerHTML =
      `<div style="padding:40px;text-align:center;color:#ef4444">Erro ao carregar dados. Tente recarregar a página.</div>`
    return false
  }
  S.categorias   = rC.data ?? []
  S.protecoes    = rP.data ?? []
  S.adicionais   = rA.data ?? []
  S.sazonalidade = rS.data ?? []
  // locais: se a tabela ainda não existe no banco, usa lista de fallback
  S.locais = (!rL.error && rL.data && rL.data.length > 0) ? rL.data : [
    { nome: 'Av. Brasil, 90 — Centro',                        permite_retirada: true, permite_devolucao: true, hora_retirada_inicio: '08:00', hora_retirada_fim: '18:00', hora_devolucao_inicio: '08:00', hora_devolucao_fim: '18:00', disponivel_domingo: false, is_aeroporto: false },
    { nome: 'Av. das Cataratas, 1419 — Vila Yolanda',         permite_retirada: true, permite_devolucao: true, hora_retirada_inicio: '08:00', hora_retirada_fim: '18:00', hora_devolucao_inicio: '08:00', hora_devolucao_fim: '18:00', disponivel_domingo: true,  is_aeroporto: false },
    { nome: 'Estacionamento Leva e Trás 24h — Aeroporto',     permite_retirada: false, permite_devolucao: true, hora_retirada_inicio: null,    hora_retirada_fim: null,    hora_devolucao_inicio: null,    hora_devolucao_fim: null,    disponivel_domingo: true,  is_aeroporto: true  },
  ]
  return true
}

// ── BOOT ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  loadSession()
  if (!S.retData) S.retData = minDate()
  const loaded = await loadData()
  if (!loaded) return
  // Pré-seleciona categoria vinda do card da frota na landing
  try {
    const qsCat = sessionStorage.getItem('qs_cat')
    if (qsCat) {
      const match = S.categorias.find(c => c.slug === qsCat)
      if (match) S.catId = match.id
      sessionStorage.removeItem('qs_cat')
    }
  } catch (_) {}
  calcDias() // recalcula a partir do que foi restaurado, não confia no S.dias persistido
  renderStep()
  bindCloseHoraPickerOnOutsideClick()
})
