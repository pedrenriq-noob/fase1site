import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { checkDisponibilidade } from '../_shared/disponibilidade.ts'
import { errJson, okJson } from '../_shared/http.ts'
import { criarLogger } from '../_shared/logger.ts'

const logger = criarLogger('check-disponibilidade')

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const body = await req.json()
    const { tenant_id, categoria_slug, data_saida, data_retorno_prev } = body

    if (!tenant_id || !categoria_slug || !data_saida || !data_retorno_prev) {
      return errJson(
        'missing_fields',
        'Campos obrigatórios: tenant_id, categoria_slug, data_saida, data_retorno_prev',
        400, CORS,
      )
    }

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRe.test(tenant_id)) return errJson('invalid_tenant_id', 'tenant_id inválido', 400, CORS)

    const inicioD = new Date(data_saida)
    const fimD    = new Date(data_retorno_prev)

    if (isNaN(inicioD.getTime()) || isNaN(fimD.getTime()) || fimD <= inicioD) {
      return errJson('invalid_period', 'Período inválido.', 400, CORS)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      return errJson('server_misconfigured', 'Configuração do servidor incorreta.', 500, CORS)
    }
    const sb = createClient(supabaseUrl, serviceKey)

    const result = await checkDisponibilidade(sb, tenant_id, categoria_slug, inicioD, fimD)
    return okJson(result, CORS)

  } catch (e) {
    logger.error(String(e))
    return errJson('internal_error', 'Erro interno. Tente novamente.', 500, CORS)
  }
})
