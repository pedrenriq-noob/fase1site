import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { checkDisponibilidade } from '../_shared/disponibilidade.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const body = await req.json()
    const { tenant_id, categoria_slug, data_saida, data_retorno_prev } = body

    if (!tenant_id || !categoria_slug || !data_saida || !data_retorno_prev) {
      return json({ error: 'Campos obrigatórios: tenant_id, categoria_slug, data_saida, data_retorno_prev' }, 400)
    }

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRe.test(tenant_id)) return json({ error: 'tenant_id inválido' }, 400)

    const inicioD = new Date(data_saida)
    const fimD    = new Date(data_retorno_prev)

    if (isNaN(inicioD.getTime()) || isNaN(fimD.getTime()) || fimD <= inicioD) {
      return json({ error: 'Período inválido.' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) return json({ error: 'Configuração do servidor incorreta.' }, 500)
    const sb = createClient(supabaseUrl, serviceKey)

    const result = await checkDisponibilidade(sb, tenant_id, categoria_slug, inicioD, fimD)
    return json(result)

  } catch (e) {
    console.error('[check-disponibilidade]', String(e))
    return json({ error: 'Erro interno. Tente novamente.' }, 500)
  }
})
