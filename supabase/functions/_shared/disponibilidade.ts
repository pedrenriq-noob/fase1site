import { createClient } from 'jsr:@supabase/supabase-js@2'
// @ts-ignore — módulo JS canônico compartilhado (ver disponibilidade-core.js)
import { filtrarReservasNoPeriodo, calcularNucleoDisponibilidade, mapReservaConflito } from './disponibilidade-core.js'

// Mapeia slug do site (categorias.slug) → categoria de frota
// (frota_veiculos.categoria/frota_reservas.categoria). Fonte de verdade
// única: tabela `categoria_frota_map` (criada em sql/027, já usada pelo
// trigger de sincronização solicitacoes→frota_reservas) — antes deste
// commit havia um segundo mapeamento hardcoded aqui (`SLUG_MAP`), mantido
// manualmente em paralelo, o mesmo tipo de risco de divergência que já
// causou o bug histórico do GRUPO J (categoria "some" da disponibilidade
// por erro de grafia). U-UTILITARIO propositalmente não tem entrada em
// `categoria_frota_map` — é categoria exclusiva de um cliente específico,
// nunca ofertada ao público (ver apps/frota-ops/pages/admin.js).
async function resolverCategoriaFrota(
  sb: ReturnType<typeof createClient>,
  tenantId: string,
  categoriaSlug: string,
): Promise<string | null> {
  const { data, error } = await sb
    .from('categorias')
    .select('categoria_frota_map(frota_categoria)')
    .eq('slug', categoriaSlug)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error) throw error
  const mapa = data?.categoria_frota_map as { frota_categoria: string } | { frota_categoria: string }[] | null
  if (!mapa) return null
  return Array.isArray(mapa) ? (mapa[0]?.frota_categoria ?? null) : mapa.frota_categoria
}

export interface ReservaConflito {
  locacao_numero: string | null
  cliente: string | null
  status: string
  data_saida: string
  data_retorno_prev: string
  placa_atribuida: string | null
}

export interface DisponibilidadeResult {
  disponivel: number | null
  total: number
  reservas_periodo: number
  fonte: 'frota' | 'sem_dados'
  overbooking: boolean
  overbooking_categoria: string | null
  overbooking_qtd: number
  /** 'sem_veiculos' quando disponivel=0, 'ultimo_veiculo' quando disponivel=1. null caso contrário. */
  alerta: 'sem_veiculos' | 'ultimo_veiculo' | null
  /** Reservas que se sobrepõem ao período — populado apenas quando overbooking=true (Especificação Motor de Disponibilidade, item 2). */
  reservas_conflito: ReservaConflito[]
}

/**
 * Calcula quando um veículo fica disponível após retorno.
 * Buffer: < 12h → 16h mesmo dia | 12-14h → dia seguinte 8h | > 14h → dia seguinte 10h
 * Domingo sempre empurra para segunda 12h.
 */
export function calcularDisponivel(retorno: Date): Date {
  const d   = new Date(retorno.getTime())
  const dow = d.getDay()
  const h   = d.getHours()

  if (dow === 0) {
    d.setDate(d.getDate() + 1)
    d.setHours(12, 0, 0, 0)
    return d
  }

  if (h < 12) {
    d.setHours(16, 0, 0, 0)
  } else if (h < 14) {
    d.setDate(d.getDate() + 1)
    d.setHours(8, 0, 0, 0)
  } else {
    d.setDate(d.getDate() + 1)
    d.setHours(10, 0, 0, 0)
  }

  // Resultado caiu no domingo → segunda 12h
  if (d.getDay() === 0) {
    d.setDate(d.getDate() + 1)
    d.setHours(12, 0, 0, 0)
  }

  return d
}

/**
 * Calcula quando o veículo sai do lavador (+3h da entrada).
 * @param dataReferencia data base para combinar com hora (usa data atual se null)
 */
export function calcularSaidaLavador(horaEntrada: string | null, dataReferencia?: Date): Date | null {
  if (!horaEntrada) return null
  const base = dataReferencia ?? new Date()
  const dateStr = base.toISOString().slice(0, 10)
  const entrada = new Date(`${dateStr}T${horaEntrada}`)
  if (isNaN(entrada.getTime())) return null
  return new Date(entrada.getTime() + 3 * 60 * 60 * 1000)
}

/**
 * Fonte de verdade única: cruzamento entre o cadastro de Frota (total de
 * veículos por categoria) e as reservas ativas em frota_reservas —
 * "Reservas Futuras" (status PREVISTO, sem placa atribuída) e "Contratos
 * Abertos" (status CONFIRMADO, com placa) — que se sobrepõem ao período
 * consultado. Não considera mais status físico do veículo (LOCADO/
 * NO_LAVADOR/MANUTENCAO/limpo) nem buffers de horário: esses sinais
 * continuam existindo em frota_veiculos para operação do pátio, mas não
 * entram no cálculo de disponibilidade.
 */
export async function checkDisponibilidade(
  sb: ReturnType<typeof createClient>,
  tenantId: string,
  categoriaSlug: string,
  dataSaida: Date,
  dataRetorno: Date,
): Promise<DisponibilidadeResult> {
  const categoria = await resolverCategoriaFrota(sb, tenantId, categoriaSlug)
  if (!categoria) throw new Error('Categoria inválida')

  const [{ data: veiculos, error: eV }, { data: reservas, error: eR }] = await Promise.all([
    sb.from('frota_veiculos')
      .select('placa')
      .eq('tenant_id', tenantId)
      .eq('categoria', categoria),
    sb.from('frota_reservas')
      .select('locacao_numero, cliente, status, data_saida, data_retorno_prev, placa_atribuida')
      .eq('tenant_id', tenantId)
      .eq('categoria', categoria)
      .in('status', ['PREVISTO', 'CONFIRMADO']),
  ])

  if (eV) throw eV
  if (eR) throw eR

  const reservasNoPeriodo = filtrarReservasNoPeriodo(reservas ?? [], dataSaida, dataRetorno)
  const totalVeiculos = veiculos?.length ?? 0
  const nucleo = calcularNucleoDisponibilidade(totalVeiculos, reservasNoPeriodo)

  if (totalVeiculos === 0) {
    // Sem Frota importada para a categoria ainda é possível prever
    // overbooking: se já existem contratos/reservas ativos, todos eles
    // excedem uma frota de tamanho zero.
    return {
      disponivel: null, total: 0, reservas_periodo: nucleo.ocupados, fonte: 'sem_dados',
      overbooking: nucleo.overbooking,
      overbooking_categoria: nucleo.overbooking ? categoria : null,
      overbooking_qtd: nucleo.overbookingQtd,
      alerta: null,
      reservas_conflito: nucleo.overbooking ? reservasNoPeriodo.map(mapReservaConflito) : [],
    }
  }

  return {
    disponivel: nucleo.disponivel,
    total: nucleo.total,
    reservas_periodo: nucleo.ocupados,
    fonte: 'frota',
    overbooking: nucleo.overbooking,
    overbooking_categoria: nucleo.overbooking ? categoria : null,
    overbooking_qtd: nucleo.overbookingQtd,
    alerta: nucleo.alerta,
    reservas_conflito: nucleo.overbooking ? reservasNoPeriodo.map(mapReservaConflito) : [],
  }
}
