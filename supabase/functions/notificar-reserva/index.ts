import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

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
      return new Response('no record id', { status: 400, headers: CORS })
    }

    // Provedor de e-mail removido (Resend descontinuado). Notificação pendente
    // até a escolha de uma nova plataforma — não bloqueia o fluxo de reservas.
    console.warn('[notificar-reserva] envio de e-mail desativado — provedor pendente de definição')
    return new Response(
      JSON.stringify({ ok: true, aviso: 'Notificação por e-mail pendente — provedor não configurado' }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (e) {
    console.error('[notificar-reserva]', String(e))
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: CORS,
    })
  }
})
