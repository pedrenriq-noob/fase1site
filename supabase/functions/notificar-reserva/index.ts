import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { errJson, okJson } from '../_shared/http.ts'

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
      console.warn('[notificar-reserva] payload sem record.id')
      return errJson('missing_record_id', 'Payload sem record.id', 400, CORS)
    }

    // Provedor de e-mail removido (Resend descontinuado). Notificação pendente
    // até a escolha de uma nova plataforma — não bloqueia o fluxo de reservas.
    console.warn('[notificar-reserva] envio de e-mail desativado — provedor pendente de definição')
    return okJson(
      { ok: true, aviso: 'Notificação por e-mail pendente — provedor não configurado' },
      CORS,
    )

  } catch (e) {
    console.error('[notificar-reserva]', String(e))
    return errJson('internal_error', 'Erro interno.', 500, CORS)
  }
})
