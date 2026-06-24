import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const payload = await req.json()
    const row = payload?.record as any
    if (!row?.id) return new Response('no record id', { status: 400, headers: CORS })

    console.log(JSON.stringify({ event: 'notificar-reserva', id: row.id, status: 'email_disabled' }))

    return new Response(JSON.stringify({ ok: true, email: 'disabled' }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(String(e))
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS })
  }
})
