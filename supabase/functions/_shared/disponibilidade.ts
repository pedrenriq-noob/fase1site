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
  grupo_j_premium: 'J - PREMIUM',
  grupo_u:         'U - UTILITARIO',
}

export interface DisponibilidadeResult {
  disponivel: number | null
  total: number
  reservas_periodo: number
  fonte: 'frota' | 'sem_dados'
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

export async function checkDisponibilidade(
  sb: ReturnType<typeof createClient>,
  tenantId: string,
  categoriaSlug: string,
  dataSaida: Date,
  dataRetorno: Date,
): Promise<DisponibilidadeResult> {
  const categoria = SLUG_MAP[categoriaSlug]
  if (!categoria) throw new Error('Categoria inválida')

  const [{ data: veiculos, error: eV }, { data: reservas }] = await Promise.all([
    sb.from('frota_veiculos')
      .select('placa, status, limpo, prev_retorno, hora_entrada_lavador')
      .eq('tenant_id', tenantId)
      .eq('categoria', categoria),
    sb.from('frota_reservas')
      .select('placa_atribuida, status, data_saida, data_retorno_prev')
      .eq('tenant_id', tenantId)
      .eq('categoria', categoria)
      .in('status', ['PREVISTO', 'CONFIRMADO']),
  ])

  if (eV) throw eV

  if (!veiculos || veiculos.length === 0) {
    return { disponivel: null, total: 0, reservas_periodo: 0, fonte: 'sem_dados' }
  }

  const reservasNoPeriodo = (reservas ?? []).filter(r => {
    const rS = new Date(r.data_saida)
    const rR = new Date(r.data_retorno_prev)
    return rS < dataRetorno && rR > dataSaida
  })

  const placasReservadas = new Set(
    reservasNoPeriodo.filter(r => r.placa_atribuida).map(r => r.placa_atribuida)
  )
  let reservasSemAtribuicao = reservasNoPeriodo.filter(r => !r.placa_atribuida).length

  const poolDisponivel: string[] = []

  for (const v of veiculos) {
    if (placasReservadas.has(v.placa)) continue

    if (v.status === 'LOCADO') {
      const prevRetorno = v.prev_retorno ? new Date(v.prev_retorno) : null
      if (!prevRetorno || prevRetorno > dataSaida) continue
      if (calcularDisponivel(prevRetorno) > dataSaida) continue
      poolDisponivel.push(v.placa)
      continue
    }

    if (v.status === 'DEVOLVIDO' && !v.limpo) continue

    if (v.status === 'NO_LAVADOR') {
      const saida = calcularSaidaLavador(v.hora_entrada_lavador, new Date())
      if (saida && saida > dataSaida) continue
      poolDisponivel.push(v.placa)
      continue
    }

    if (v.status === 'MANUTENCAO') continue

    poolDisponivel.push(v.placa)
  }

  const disponivel = Math.max(0, poolDisponivel.length - reservasSemAtribuicao)

  return {
    disponivel,
    total: veiculos.length,
    reservas_periodo: reservasNoPeriodo.length,
    fonte: 'frota',
  }
}
