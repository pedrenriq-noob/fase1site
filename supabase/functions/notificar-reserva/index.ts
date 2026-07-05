import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { errJson, okJson } from '../_shared/http.ts'
import { criarLogger } from '../_shared/logger.ts'

const logger = criarLogger('notificar-reserva')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const payload = await req.json()
    const row = payload?.record as any
    if (!row?.id) {
      logger.warn('payload sem record.id')
      return errJson('missing_record_id', 'Payload sem record.id', 400, CORS)
    }

    // Provedor de e-mail removido (Resend descontinuado). Notificação pendente
    // até a escolha de uma nova plataforma — não bloqueia o fluxo de reservas.
    logger.warn('envio de e-mail desativado — provedor pendente de definição')
    return okJson(
      { ok: true, aviso: 'Notificação por e-mail pendente — provedor não configurado' },
      CORS,
    )

  } catch (e) {
    logger.error(String(e))
    return errJson('internal_error', 'Erro interno.', 500, CORS)
  }
})
