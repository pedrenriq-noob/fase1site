import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL  = 'https://lxfnqzuzohudqwibgdic.supabase.co'
const SUPABASE_ANON = 'sb_publishable_lZYtlQFkZCgUE-ppawmXHA_CPo0tPUF'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mesma fórmula de site/script.js — fonte da verdade agora é aqui
function calcDias(ret: string, dev: string): number {
  const diffH = (new Date(dev).getTime() - new Date(ret).getTime()) / 3600000
  if (diffH <= 0) return 0
  const full  = Math.floor(diffH / 24)
  const resto = diffH % 24
  if (resto <= 1) return Math.max(1, full)
  if (resto > 4)  return full + 1
  return full + Math.floor(resto * 2) / 8
}

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const body = await req.json()

    // ── Validação de campos obrigatórios ────────────────────
    const required = [
      'tenant_id', 'categoria_id', 'cliente_nome', 'cliente_email',
      'cliente_whatsapp', 'data_retirada', 'data_devolucao',
      'local_retirada', 'local_devolucao',
    ]
    for (const f of required) {
      if (!body[f]) return err(`Campo obrigatório ausente: ${f}`)
    }

    const dias = calcDias(body.data_retirada, body.data_devolucao)
    if (dias <= 0) return err('Período inválido: devolução deve ser após a retirada.')

    // ── Cliente Supabase com service_role (bypassa RLS) ─────
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? SUPABASE_ANON
    const sb = createClient(SUPABASE_URL, serviceKey)

    // ── Valida tenant ────────────────────────────────────────
    const { data: tenant } = await sb.from('tenants').select('id').eq('id', body.tenant_id).eq('ativo', true).single()
    if (!tenant) return err('Tenant inválido.')

    // ── Busca preços reais do banco ──────────────────────────
    const [{ data: cat }, { data: prot }] = await Promise.all([
      sb.from('categorias')
        .select('id, slug, preco_diaria, ativo')
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

    if (!cat?.ativo) return err('Categoria inválida ou inativa.')
    if (body.protecao_id && !prot?.ativo) return err('Proteção inválida ou inativa.')

    // ── Aplica sazonalidade (server-side) ───────────────────
    const dataRet = body.data_retirada.slice(0, 10)
    const { data: sazon } = await sb.from('sazonalidade')
      .select('precos')
      .eq('tenant_id', body.tenant_id)
      .eq('ativo', true)
      .lte('data_inicio', dataRet)
      .gte('data_fim', dataRet)
      .limit(1)

    let precoCat = parseFloat(cat.preco_diaria)
    if (sazon?.length) {
      const pr = (sazon[0].precos ?? {})[cat.slug]
      if (pr != null) precoCat = Number(pr)
    }

    // ── Calcula valores server-side ──────────────────────────
    const baseCat  = precoCat * dias
    const baseProt = prot
      ? (prot.tipo_preco === 'per_day' ? parseFloat(prot.preco) * dias : parseFloat(prot.preco))
      : 0

    // Valida e recalcula adicionais
    let totalAdd = 0
    const itensInsert: any[] = []
    if (body.itens?.length) {
      const ids = body.itens.map((i: any) => i.adicional_id)
      const { data: adicionais } = await sb.from('adicionais')
        .select('id, preco, tipo_preco, ativo')
        .eq('tenant_id', body.tenant_id)
        .in('id', ids)

      for (const item of body.itens) {
        const a = adicionais?.find((x: any) => x.id === item.adicional_id)
        if (!a?.ativo) continue
        const qty      = Math.max(1, parseInt(item.quantidade) || 1)
        const subtotal = a.tipo_preco === 'per_day'
          ? parseFloat(a.preco) * qty * dias
          : parseFloat(a.preco) * qty
        totalAdd += subtotal
        itensInsert.push({
          adicional_id:   a.id,
          quantidade:     qty,
          preco_unitario: parseFloat(a.preco),
          tipo_preco:     a.tipo_preco,
        })
      }
    }

    const valor_estimado = Math.round((baseCat + baseProt + totalAdd) * 100) / 100

    // ── Monta observações ────────────────────────────────────
    const obsCompleto = [
      body.observacoes     || null,
      body.companhia_aerea ? `Cia: ${body.companhia_aerea}` : null,
      body.numero_voo      ? `Voo: ${body.numero_voo}`      : null,
      body.horario_pouso   ? `Pouso: ${body.horario_pouso}` : null,
      `Pessoas: ${body.pessoas ?? 1}`,
    ].filter(Boolean).join(' | ') || null

    // ── Insere solicitação ───────────────────────────────────
    const { data: sol, error: solErr } = await sb.from('solicitacoes').insert({
      tenant_id:        body.tenant_id,
      categoria_id:     body.categoria_id,
      protecao_id:      body.protecao_id      ?? null,
      cliente_nome:     body.cliente_nome,
      cliente_email:    body.cliente_email,
      cliente_whatsapp: body.cliente_whatsapp,
      cliente_cpf:      body.cliente_cpf      ?? null,
      companhia_aerea:  body.companhia_aerea  ?? null,
      data_retirada:    body.data_retirada,
      data_devolucao:   body.data_devolucao,
      local_retirada:   body.local_retirada,
      local_devolucao:  body.local_devolucao,
      valor_estimado,
      pessoas:          body.pessoas          ?? 1,
      numero_voo:       body.numero_voo       ?? null,
      horario_pouso:    body.horario_pouso    ?? null,
      observacoes:      obsCompleto,
      status:           'solicitada',
    }).select('id, numero').single()

    if (solErr) throw new Error(solErr.message)

    // ── Insere itens ─────────────────────────────────────────
    if (itensInsert.length > 0) {
      const { error: itErr } = await sb.from('solicitacao_itens').insert(
        itensInsert.map(i => ({ ...i, solicitacao_id: sol.id }))
      )
      if (itErr) throw new Error(itErr.message)
    }

    console.log(JSON.stringify({ event: 'criar-solicitacao', id: sol.id, numero: sol.numero, valor_estimado }))

    return new Response(JSON.stringify({ ok: true, id: sol.id, numero: sol.numero, valor_estimado }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (e) {
    console.error(String(e))
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
