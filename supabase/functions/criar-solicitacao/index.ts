import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { checkDisponibilidade } from '../_shared/disponibilidade.ts'
import { errJson, okJson } from '../_shared/http.ts'
// @ts-ignore — módulo JS canônico compartilhado (ver _shared/pricing.js)
import { calcDias, precoDiariaComSazonalidade, calcSubtotal } from '../_shared/pricing.js'

const ALLOWED_ORIGINS_RAW = Deno.env.get('ALLOWED_ORIGINS')
const ALLOWED_ORIGINS = ALLOWED_ORIGINS_RAW ? ALLOWED_ORIGINS_RAW.split(',').map(s => s.trim()) : null

function getCors(origin: string | null) {
  if (!ALLOWED_ORIGINS) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }
  }
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }
}

const RATE_LIMIT = 10
const RATE_WINDOW = 60

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}

function validarWhatsApp(wpp: string): boolean {
  const digits = wpp.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 13
}

function validarCPF(cpf: string): boolean {
  const c = cpf.replace(/\D/g, '')
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i)
  let r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  if (r !== parseInt(c[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i)
  r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  return r === parseInt(c[10])
}

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  const CORS = getCors(origin)

  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    console.error('[criar-solicitacao] env vars não configuradas')
    return errJson('server_misconfigured', 'Erro de configuração do servidor. Contate o suporte.', 500, CORS)
  }
  const sb = createClient(supabaseUrl, serviceKey)

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { data: permitido, error: rlErr } = await sb.rpc('fn_checar_rate_limit', {
    p_chave: `criar-solicitacao:${ip}`,
    p_limite: RATE_LIMIT,
    p_janela_segundos: RATE_WINDOW,
  })
  if (rlErr) {
    console.error('[criar-solicitacao] rate limit check falhou:', rlErr.message)
    // Falha no rate limiter não bloqueia a requisição legítima.
  } else if (permitido === false) {
    return errJson('rate_limited', 'Muitas requisições. Tente novamente em 1 minuto.', 429, CORS)
  }

  try {
    const body = await req.json()

    const required = [
      'tenant_id', 'categoria_id', 'cliente_nome', 'cliente_email',
      'cliente_whatsapp', 'data_retirada', 'data_devolucao',
      'local_retirada', 'local_devolucao',
    ]
    for (const f of required) {
      if (!body[f]) return errJson('missing_field', `Campo obrigatório ausente: ${f}`, 400, CORS)
    }

    // Limite de tamanho nos campos de texto livre — mitiga payloads
    // desproporcionais e reduz a superfície de conteúdo malicioso que
    // acaba renderizado sem escape em telas administrativas (defesa em
    // profundidade; a correção primária é escapar no ponto de renderização).
    const maxLengths: Record<string, number> = {
      cliente_nome: 120, observacoes: 1000, companhia_aerea: 80,
      numero_voo: 20, horario_pouso: 20, local_retirada: 120, local_devolucao: 120,
    }
    for (const [campo, max] of Object.entries(maxLengths)) {
      if (typeof body[campo] === 'string' && body[campo].length > max) {
        return errJson('field_too_long', `Campo ${campo} excede o tamanho máximo de ${max} caracteres.`, 400, CORS)
      }
    }

    if (!uuidRe.test(body.tenant_id))    return errJson('invalid_tenant_id', 'tenant_id inválido.', 400, CORS)
    if (!uuidRe.test(body.categoria_id)) return errJson('invalid_categoria_id', 'categoria_id inválido.', 400, CORS)

    if (!validarEmail(body.cliente_email)) return errJson('invalid_email', 'E-mail inválido.', 400, CORS)
    if (!validarWhatsApp(body.cliente_whatsapp)) {
      return errJson('invalid_whatsapp', 'WhatsApp inválido. Informe DDD + número (10 a 13 dígitos).', 400, CORS)
    }

    if (!body.estrangeiro && body.cliente_cpf) {
      const cpfLimpo = String(body.cliente_cpf).replace(/\D/g, '')
      if (cpfLimpo.length > 0 && !validarCPF(cpfLimpo)) return errJson('invalid_cpf', 'CPF inválido.', 400, CORS)
    }

    const pessoas = parseInt(body.pessoas) || 1
    if (pessoas < 1 || pessoas > 20) return errJson('invalid_pessoas', 'Número de pessoas inválido.', 400, CORS)

    const retDate = new Date(body.data_retirada)
    const devDate = new Date(body.data_devolucao)
    if (isNaN(retDate.getTime()) || isNaN(devDate.getTime())) {
      return errJson('invalid_dates', 'Datas inválidas.', 400, CORS)
    }

    const dias = calcDias(body.data_retirada, body.data_devolucao)
    if (dias <= 0) return errJson('invalid_period', 'Período inválido: devolução deve ser após a retirada.', 400, CORS)

    const { data: tenant } = await sb.from('tenants').select('id').eq('id', body.tenant_id).eq('ativo', true).single()
    if (!tenant) return errJson('invalid_tenant', 'Tenant inválido.', 400, CORS)

    const [{ data: cat }, { data: prot }] = await Promise.all([
      sb.from('categorias')
        .select('id, slug, preco_diaria, ativo, max_cadeirinhas')
        .eq('id', body.categoria_id)
        .eq('tenant_id', body.tenant_id)
        .single(),
      body.protecao_id
        ? sb.from('protecoes')
            .select('id, preco, tipo_preco, ativo')
            .eq('id', body.protecao_id)
            .eq('tenant_id', body.tenant_id)
            .single()
        : Promise.resolve({ data: null }),
    ])

    if (!cat?.ativo) return errJson('invalid_categoria', 'Categoria inválida ou inativa.', 400, CORS)
    if (body.protecao_id && !prot?.ativo) return errJson('invalid_protecao', 'Proteção inválida ou inativa.', 400, CORS)

    // ── Validação de local e janela de horário ─────────────────────────
    const [{ data: localRet }, { data: localDev }] = await Promise.all([
      sb.from('locais').select('*').eq('tenant_id', body.tenant_id).eq('nome', body.local_retirada).single(),
      sb.from('locais').select('*').eq('tenant_id', body.tenant_id).eq('nome', body.local_devolucao).single(),
    ])

    if (!localRet?.ativo || !localRet.permite_retirada) {
      return errJson('invalid_local_retirada', 'Local de retirada inválido ou indisponível para retirada.', 400, CORS)
    }
    if (!localDev?.ativo || !localDev.permite_devolucao) {
      return errJson('invalid_local_devolucao', 'Local de devolução inválido ou indisponível para devolução.', 400, CORS)
    }

    const horaDentroJanela = (data: Date, inicio: string | null, fim: string | null): boolean => {
      if (!inicio || !fim) return true
      const hhmm = `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}:00`
      return hhmm >= inicio && hhmm <= fim
    }

    if (!horaDentroJanela(retDate, localRet.hora_retirada_inicio, localRet.hora_retirada_fim)) {
      return errJson('invalid_horario_retirada', 'Horário de retirada fora do funcionamento do local.', 400, CORS)
    }
    if (!horaDentroJanela(devDate, localDev.hora_devolucao_inicio, localDev.hora_devolucao_fim)) {
      return errJson('invalid_horario_devolucao', 'Horário de devolução fora do funcionamento do local.', 400, CORS)
    }
    if (retDate.getDay() === 0 && !localRet.disponivel_domingo) {
      return errJson('local_fechado_domingo', 'Local de retirada não funciona aos domingos.', 400, CORS)
    }
    if (devDate.getDay() === 0 && !localDev.disponivel_domingo) {
      return errJson('local_fechado_domingo', 'Local de devolução não funciona aos domingos.', 400, CORS)
    }

    // ── Verificação de disponibilidade em tempo real ──────────────────
    try {
      const disp = await checkDisponibilidade(
        sb,
        body.tenant_id,
        cat.slug,
        retDate,
        devDate,
      )
      if (disp.fonte === 'frota' && disp.disponivel === 0) {
        return errJson(
          'sem_disponibilidade',
          'Não há veículos disponíveis para esta categoria no período solicitado. Escolha outra categoria ou período.',
          409, CORS,
        )
      }
    } catch (dispErr) {
      // Falha na verificação não bloqueia (sistema de solicitações com aprovação manual)
      console.warn('[criar-solicitacao] check-disp falhou:', String(dispErr))
    }

    const dataRet = body.data_retirada.slice(0, 10)
    const { data: sazon } = await sb.from('sazonalidade')
      .select('precos, data_inicio, data_fim')
      .eq('tenant_id', body.tenant_id)
      .eq('ativo', true)
      .lte('data_inicio', dataRet)
      .gte('data_fim', dataRet)
      .limit(1)

    const precoCat = precoDiariaComSazonalidade(cat, dataRet, sazon ?? [])

    const baseCat  = precoCat * dias
    const baseProt = prot ? calcSubtotal(prot.tipo_preco, prot.preco, 1, dias) : 0

    let totalAdd = 0
    let qtdCadeirinhas = 0
    const itensInsert: any[] = []
    if (body.itens?.length) {
      const ids = body.itens.map((i: any) => i.adicional_id)
      const { data: adicionais } = await sb.from('adicionais')
        .select('id, preco, tipo_preco, ativo, is_cadeirinha')
        .eq('tenant_id', body.tenant_id)
        .in('id', ids)

      for (const item of body.itens) {
        const a = adicionais?.find((x: any) => x.id === item.adicional_id)
        if (!a?.ativo) continue
        const qty      = Math.max(1, parseInt(item.quantidade) || 1)
        const subtotal = calcSubtotal(a.tipo_preco, a.preco, qty, dias)
        totalAdd += subtotal
        if (a.is_cadeirinha) qtdCadeirinhas += qty
        itensInsert.push({
          adicional_id:   a.id,
          quantidade:     qty,
          preco_unitario: parseFloat(a.preco),
          tipo_preco:     a.tipo_preco,
        })
      }
    }

    if (qtdCadeirinhas > (cat.max_cadeirinhas ?? 0)) {
      return errJson(
        'limite_cadeirinhas_excedido',
        `Esta categoria comporta no máximo ${cat.max_cadeirinhas ?? 0} cadeirinha(s).`,
        400, CORS,
      )
    }

    const valor_estimado = Math.round((baseCat + baseProt + totalAdd) * 100) / 100

    const obsCompleto = [
      body.observacoes     || null,
      body.companhia_aerea ? `Cia: ${body.companhia_aerea}` : null,
      body.numero_voo      ? `Voo: ${body.numero_voo}`      : null,
      body.horario_pouso   ? `Pouso: ${body.horario_pouso}` : null,
      `Pessoas: ${pessoas}`,
      body.estrangeiro ? '[ESTRANGEIRO]' : null,
    ].filter(Boolean).join(' | ') || null

    const { data: result, error: rpcErr } = await sb.rpc('inserir_solicitacao_completa', {
      p_sol: {
        tenant_id:        body.tenant_id,
        categoria_id:     body.categoria_id,
        protecao_id:      body.protecao_id      ?? null,
        cliente_nome:     body.cliente_nome,
        cliente_email:    body.cliente_email,
        cliente_whatsapp: body.cliente_whatsapp,
        cliente_cpf:      body.cliente_cpf      ?? null,
        estrangeiro:      body.estrangeiro      ?? false,
        cliente_doc:      body.cliente_doc      ?? null,
        companhia_aerea:  body.companhia_aerea  ?? null,
        data_retirada:    body.data_retirada,
        data_devolucao:   body.data_devolucao,
        local_retirada:   body.local_retirada,
        local_devolucao:  body.local_devolucao,
        valor_estimado,
        pessoas,
        numero_voo:       body.numero_voo       ?? null,
        horario_pouso:    body.horario_pouso    ?? null,
        observacoes:      obsCompleto,
      },
      p_itens: itensInsert,
    })

    if (rpcErr) throw new Error(rpcErr.message)

    const sol = result as { id: string; numero: number }

    console.log(JSON.stringify({ event: 'criar-solicitacao', id: sol.id, numero: sol.numero, valor_estimado }))

    return okJson({ ok: true, id: sol.id, numero: sol.numero, valor_estimado }, CORS)

  } catch (e) {
    console.error('[criar-solicitacao]', String(e))
    return errJson('internal_error', 'Erro interno. Tente novamente.', 500, CORS)
  }
})
