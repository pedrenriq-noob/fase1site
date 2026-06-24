import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = 'https://lxfnqzuzohudqwibgdic.supabase.co'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function fmtBR(d: string) {
  return new Date(d).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtMoney(v: number) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

    const resendKey  = Deno.env.get('RESEND_API_KEY')
    const notifEmail = Deno.env.get('NOTIF_EMAIL') ?? 'pedrenriq@gmail.com'

    if (!resendKey) {
      // Não bloqueia — apenas loga. Configure RESEND_API_KEY nos secrets do projeto.
      console.warn('[notificar-reserva] RESEND_API_KEY não configurada — notificação por email pulada')
      return new Response(
        JSON.stringify({ ok: true, aviso: 'RESEND_API_KEY não configurada' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceKey) {
      console.error('[notificar-reserva] SUPABASE_SERVICE_ROLE_KEY não configurada')
      return new Response(JSON.stringify({ error: 'Erro de configuração' }), { status: 500, headers: CORS })
    }

    const sb = createClient(SUPABASE_URL, serviceKey)
    const { data: sol, error } = await sb
      .from('solicitacoes')
      .select(`
        numero, status, cliente_nome, cliente_email, cliente_whatsapp,
        cliente_cpf, estrangeiro, cliente_doc,
        data_retirada, data_devolucao, local_retirada, local_devolucao,
        valor_estimado, pessoas, observacoes,
        categorias(nome), protecoes(nome),
        solicitacao_itens(quantidade, adicionais(nome))
      `)
      .eq('id', row.id)
      .single()

    if (error || !sol) {
      console.error('[notificar-reserva] erro ao buscar solicitação:', error?.message)
      return new Response(JSON.stringify({ error: 'Reserva não encontrada' }), { status: 404, headers: CORS })
    }

    const numero    = sol.numero ? `#${String(sol.numero).padStart(4, '0')}` : row.id.slice(0, 8)
    const categoria = (sol as any).categorias?.nome ?? '—'
    const protecao  = (sol as any).protecoes?.nome  ?? 'Sem proteção'
    const itens     = ((sol as any).solicitacao_itens ?? []) as any[]
    const docInfo   = sol.estrangeiro
      ? `<tr><td><strong>Documento</strong></td><td>${sol.cliente_doc ?? '—'} <em>(Estrangeiro)</em></td></tr>`
      : sol.cliente_cpf ? `<tr><td><strong>CPF</strong></td><td>${sol.cliente_cpf}</td></tr>` : ''

    const itensHtml = itens.length
      ? `<tr><td><strong>Adicionais</strong></td><td>${itens.map((i: any) => `${i.quantidade}× ${i.adicionais?.nome ?? '?'}`).join(', ')}</td></tr>`
      : ''

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Nova Reserva ${numero}</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b">
  <div style="background:#f97316;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0">
    <h2 style="margin:0">🚗 Nova Reserva ${numero}</h2>
    <p style="margin:4px 0 0;opacity:.85;font-size:14px">Solicitação recebida — ação necessária</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:24px">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr style="background:#f8fafc"><td style="padding:8px 12px;width:160px"><strong>Cliente</strong></td><td style="padding:8px 12px">${sol.cliente_nome}</td></tr>
      <tr><td style="padding:8px 12px"><strong>E-mail</strong></td><td style="padding:8px 12px"><a href="mailto:${sol.cliente_email}">${sol.cliente_email}</a></td></tr>
      <tr style="background:#f8fafc"><td style="padding:8px 12px"><strong>WhatsApp</strong></td><td style="padding:8px 12px"><a href="https://wa.me/${sol.cliente_whatsapp?.replace(/\D/g,'')}">${sol.cliente_whatsapp}</a></td></tr>
      ${docInfo}
      <tr style="background:#f8fafc"><td style="padding:8px 12px"><strong>Categoria</strong></td><td style="padding:8px 12px">${categoria}</td></tr>
      <tr><td style="padding:8px 12px"><strong>Proteção</strong></td><td style="padding:8px 12px">${protecao}</td></tr>
      ${itensHtml}
      <tr style="background:#f8fafc"><td style="padding:8px 12px"><strong>Retirada</strong></td><td style="padding:8px 12px">${fmtBR(sol.data_retirada)}<br><span style="color:#64748b">${sol.local_retirada}</span></td></tr>
      <tr><td style="padding:8px 12px"><strong>Devolução</strong></td><td style="padding:8px 12px">${fmtBR(sol.data_devolucao)}<br><span style="color:#64748b">${sol.local_devolucao}</span></td></tr>
      <tr style="background:#f8fafc"><td style="padding:8px 12px"><strong>Pessoas</strong></td><td style="padding:8px 12px">${sol.pessoas ?? 1}</td></tr>
      <tr><td style="padding:8px 12px"><strong>Valor estimado</strong></td><td style="padding:8px 12px;font-size:18px;font-weight:700;color:#f97316">${fmtMoney(parseFloat(sol.valor_estimado))}</td></tr>
      ${sol.observacoes ? `<tr style="background:#f8fafc"><td style="padding:8px 12px"><strong>Observações</strong></td><td style="padding:8px 12px">${sol.observacoes}</td></tr>` : ''}
    </table>
    <div style="margin-top:24px;text-align:center">
      <a href="https://igufoz-admin.vercel.app" style="background:#f97316;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
        Abrir Painel Admin →
      </a>
    </div>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">Igufoz Locadora · Foz do Iguaçu</p>
</body>
</html>`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Igufoz Locadora <reservas@igufoz.com.br>',
        to: [notifEmail],
        subject: `🚗 Nova Reserva ${numero} — ${sol.cliente_nome}`,
        html,
      }),
    })

    if (!resendRes.ok) {
      const body = await resendRes.text()
      console.error('[notificar-reserva] Resend erro:', resendRes.status, body)
      return new Response(JSON.stringify({ error: 'Falha ao enviar email', detalhe: body }), {
        status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    console.log(JSON.stringify({ event: 'notificar-reserva', id: row.id, numero, para: notifEmail }))

    return new Response(JSON.stringify({ ok: true, numero, para: notifEmail }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (e) {
    console.error('[notificar-reserva]', String(e))
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
