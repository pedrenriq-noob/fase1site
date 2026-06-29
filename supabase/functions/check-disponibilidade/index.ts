import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = 'https://lxfnqzuzohudqwibgdic.supabase.co'

// Mapeia slug do site → categoria em frota_veiculos
const SLUG_MAP: Record<string, string> = {
  grupo_b: 'B',
  grupo_c: 'C',
  grupo_d: 'D+',
  grupo_e: 'E',
  grupo_f: 'F',
  grupo_g: 'G',
  grupo_h: 'H',
  grupo_i: 'I',
  grupo_j: 'J',
  grupo_j_premium:  'J-PREMIUM',
  grupo_u:          'U-UTILITARIO',
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// Calcula quando o veículo fica disponível após retorno, considerando horário e dia da semana
function calcularDisponivel(retorno: Date): Date {
  const d = new Date(retorno.getTime())
  const dow = d.getDay() // 0 = domingo
  const h   = d.getHours()

  if (dow === 0) {
    // Retorno no domingo → disponível segunda às 12:00
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

  // Se o dia resultante cair no domingo, empurra para segunda às 12:00
  if (d.getDay() === 0) {
    d.setDate(d.getDate() + 1)
    d.setHours(12, 0, 0, 0)
  }

  return d
}

function calcularSaidaLavador(horaEntrada: string | null): Date | null {
  if (!horaEntrada) return null
  const hoje = new Date().toISOString().slice(0, 10)
  const entrada = new Date(`${hoje}T${horaEntrada}`)
  if (isNaN(entrada.getTime())) return null
  return new Date(entrada.getTime() + 3 * 60 * 60 * 1000)
}

export interface DisponibilidadeResult {
  disponivel: number | null
  total: number
  reservas_periodo: number
  fonte: 'frota' | 'sem_dados'
}

export async function checkDisponibilidade(
  sb: ReturnType<typeof createClient>,
  tenantId: string,
  categoriaSlug: string,
  dataSaida: Date,
  dataRetorno: Date,
): Promise<DisponibilidadeResult> {
  const categoria = SLUG_MAP[categoriaSlug]
  if (!categoria) throw new Error(`Slug desconhecido: ${categoriaSlug}`)

  const [{ data: veiculos, error: eV }, { data: reservas, error: eR }] = await Promise.all([
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

  // Reservas que se sobrepõem ao período solicitado
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
      const saida = calcularSaidaLavador(v.hora_entrada_lavador)
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const body = await req.json()
    const { tenant_id, categoria_slug, data_saida, data_retorno_prev } = body

    if (!tenant_id || !categoria_slug || !data_saida || !data_retorno_prev) {
      return json({ error: 'Campos obrigatórios: tenant_id, categoria_slug, data_saida, data_retorno_prev' }, 400)
    }

    const inicioD = new Date(data_saida)
    const fimD    = new Date(data_retorno_prev)

    if (isNaN(inicioD.getTime()) || isNaN(fimD.getTime()) || fimD <= inicioD) {
      return json({ error: 'Período inválido.' }, 400)
    }

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceKey) return json({ error: 'Configuração do servidor incorreta.' }, 500)
    const sb = createClient(SUPABASE_URL, serviceKey)

    const result = await checkDisponibilidade(sb, tenant_id, categoria_slug, inicioD, fimD)
    return json(result)

  } catch (e) {
    console.error(String(e))
    return json({ error: String(e) }, 500)
  }
})
