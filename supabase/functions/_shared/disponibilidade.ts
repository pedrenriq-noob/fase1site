import { createClient } from 'jsr:@supabase/supabase-js@2'

// Mapeia slug do site → categoria em frota_veiculos
export const SLUG_MAP: Record<string, string> = {
  grupo_b:         'B',
  grupo_c:         'C',
  grupo_d:         'D+',
  grupo_e:         'E',
  grupo_f:         'F',
  grupo_g:         'G',
  grupo_h:         'H',
  grupo_i:         'I',
  grupo_j:         'J',
  grupo_u:         'U - UTILITARIO',
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
  const categoria = SLUG_MAP[categoriaSlug]
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

  const reservasNoPeriodo = (reservas ?? []).filter(r => {
    const rS = new Date(r.data_saida)
    const rR = new Date(r.data_retorno_prev)
    return rS < dataRetorno && rR > dataSaida
  })

  if (!veiculos || veiculos.length === 0) {
    // Sem Frota importada para a categoria ainda é possível prever
    // overbooking: se já existem contratos/reservas ativos, todos eles
    // excedem uma frota de tamanho zero.
    const ocupadosSemFrota = reservasNoPeriodo.length
    const overbookingSemFrota = ocupadosSemFrota > 0
    return {
      disponivel: null, total: 0, reservas_periodo: ocupadosSemFrota, fonte: 'sem_dados',
      overbooking: overbookingSemFrota,
      overbooking_categoria: overbookingSemFrota ? categoria : null,
      overbooking_qtd: ocupadosSemFrota,
      alerta: null,
      reservas_conflito: overbookingSemFrota ? reservasNoPeriodo.map(mapReservaConflito) : [],
    }
  }

  const total = veiculos.length
  const ocupados = reservasNoPeriodo.length
  const disponivel = Math.max(0, total - ocupados)
  const overbookingQtd = Math.max(0, ocupados - total)
  const overbooking = overbookingQtd > 0
  const alerta = disponivel === 0 ? 'sem_veiculos' : disponivel === 1 ? 'ultimo_veiculo' : null

  return {
    disponivel,
    total,
    reservas_periodo: ocupados,
    fonte: 'frota',
    overbooking,
    overbooking_categoria: overbooking ? categoria : null,
    overbooking_qtd: overbookingQtd,
    alerta,
    reservas_conflito: overbooking ? reservasNoPeriodo.map(mapReservaConflito) : [],
  }
}

function mapReservaConflito(r: {
  locacao_numero: string | null
  cliente: string | null
  status: string
  data_saida: string
  data_retorno_prev: string
  placa_atribuida: string | null
}): ReservaConflito {
  return {
    locacao_numero: r.locacao_numero,
    cliente: r.cliente,
    status: r.status,
    data_saida: r.data_saida,
    data_retorno_prev: r.data_retorno_prev,
    placa_atribuida: r.placa_atribuida,
  }
}
