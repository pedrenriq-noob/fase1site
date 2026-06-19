import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const RESEND_KEY    = 're_51Rozuwe_Mk85nNbiLfteKshDW64jgaeh'
const FROM_EMAIL    = 'Igufoz Reservas <onboarding@resend.dev>'
const CENTRAL_EMAIL = 'reservasigufoz@gmail.com'

const fmtDate = (iso: string) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const fmtMoeda = (v: number) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function htmlCliente(row: Record<string, unknown>) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<style>
body{font-family:Arial,sans-serif;background:#f4f6fb;margin:0;padding:0}
.wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
.hdr{background:#0f1f3c;padding:28px 32px;text-align:center}
.hdr h1{color:#fff;margin:0;font-size:22px}
.hdr p{color:#a0b0cc;margin:6px 0 0;font-size:13px}
.bdy{padding:28px 32px}
.bdy h2{font-size:18px;color:#1a2332;margin:0 0 10px}
.bdy p{font-size:14px;color:#374151;line-height:1.65;margin:0 0 16px}
.card{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:16px}
.cr{display:flex;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px solid #f0f0f0}
.cr:last-child{border-bottom:none}
.lbl{color:#6b7280}.val{color:#1a2332;font-weight:600}
.tot{background:#fff3ea;border:1.5px solid #FF6B00;border-radius:10px;padding:14px 20px;display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#FF6B00;margin-bottom:20px}
.btn{display:block;background:#25D366;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:700;margin:0 auto 8px}
.ftr{background:#f8fafc;padding:18px 32px;text-align:center;font-size:12px;color:#9ca3af}
</style></head><body>
<div class="wrap">
  <div class="hdr"><h1>igufoz</h1><p>aluguel de veículos · foz do iguaçu</p></div>
  <div class="bdy">
    <h2>Solicitação recebida! ✅</h2>
    <p>Olá, <strong>${String(row.cliente_nome ?? 'cliente').split(' ')[0]}</strong>! Sua solicitação foi recebida com sucesso. Nossa equipe entrará em contato em breve para confirmar.</p>
    <div class="card">
      <div class="cr"><span class="lbl">📅 Retirada</span><span class="val">${fmtDate(String(row.data_retirada ?? ''))}</span></div>
      <div class="cr"><span class="lbl">📅 Devolução</span><span class="val">${fmtDate(String(row.data_devolucao ?? ''))}</span></div>
      <div class="cr"><span class="lbl">📍 Local retirada</span><span class="val">${row.local_retirada ?? '—'}</span></div>
      <div class="cr"><span class="lbl">📍 Local devolução</span><span class="val">${row.local_devolucao ?? '—'}</span></div>
    </div>
    <div class="tot"><span>Valor Estimado</span><span>${fmtMoeda(Number(row.valor_estimado ?? 0))}</span></div>
    <p style="font-size:13px;color:#6b7280">Em caso de dúvidas, entre em contato pelo WhatsApp:</p>
    <a class="btn" href="https://wa.me/554599999999">💬 Falar no WhatsApp</a>
  </div>
  <div class="ftr">Igufoz Aluguel de Veículos · Foz do Iguaçu · PR<br>Este e-mail foi gerado automaticamente.</div>
</div></body></html>`
}

function htmlCentral(row: Record<string, unknown>) {
  const vooHtml = row.numero_voo ? `
    <div class="sec"><h3>VOO</h3>
      <div class="row"><span class="lbl">Número</span><span class="val">${row.numero_voo}</span></div>
      <div class="row"><span class="lbl">Pouso previsto</span><span class="val">${row.horario_pouso ?? '—'}</span></div>
    </div>` : ''
  const obsHtml = row.observacoes ? `
    <div class="sec"><h3>OBSERVAÇÕES</h3>
      <p style="font-size:13px;color:#374151;margin:0">${row.observacoes}</p>
    </div>` : ''
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<style>
body{font-family:Arial,sans-serif;background:#f4f6fb;margin:0;padding:0}
.wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
.hdr{background:#FF6B00;padding:22px 32px}
.hdr h1{color:#fff;margin:0;font-size:20px}
.hdr p{color:rgba(255,255,255,.8);margin:4px 0 0;font-size:13px}
.bdy{padding:24px 32px}
.sec{margin-bottom:20px}
.sec h3{font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;margin:0 0 10px}
.row{display:flex;justify-content:space-between;font-size:14px;padding:6px 0;border-bottom:1px solid #f0f0f0}
.row:last-child{border-bottom:none}
.lbl{color:#6b7280}.val{color:#1a2332;font-weight:600;max-width:300px;text-align:right}
.tot{background:#f0fdf4;border:1.5px solid #22c55e;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#16a34a;margin-top:16px}
.ftr{background:#f8fafc;padding:14px 32px;text-align:center;font-size:12px;color:#9ca3af}
</style></head><body>
<div class="wrap">
  <div class="hdr"><h1>🔔 Nova Solicitação de Reserva</h1><p>ID: ${row.id}</p></div>
  <div class="bdy">
    <div class="sec"><h3>CLIENTE</h3>
      <div class="row"><span class="lbl">Nome</span><span class="val">${row.cliente_nome ?? '—'}</span></div>
      <div class="row"><span class="lbl">WhatsApp</span><span class="val">${row.cliente_whatsapp ?? '—'}</span></div>
      <div class="row"><span class="lbl">E-mail</span><span class="val">${row.cliente_email ?? '—'}</span></div>
      <div class="row"><span class="lbl">CPF</span><span class="val">${row.cliente_cpf ?? '—'}</span></div>
      <div class="row"><span class="lbl">Pessoas</span><span class="val">${row.pessoas ?? 1}</span></div>
    </div>
    <div class="sec"><h3>PERÍODO</h3>
      <div class="row"><span class="lbl">Retirada</span><span class="val">${fmtDate(String(row.data_retirada ?? ''))}</span></div>
      <div class="row"><span class="lbl">Devolução</span><span class="val">${fmtDate(String(row.data_devolucao ?? ''))}</span></div>
      <div class="row"><span class="lbl">Local retirada</span><span class="val">${row.local_retirada ?? '—'}</span></div>
      <div class="row"><span class="lbl">Local devolução</span><span class="val">${row.local_devolucao ?? '—'}</span></div>
    </div>
    ${vooHtml}${obsHtml}
    <div class="tot"><span>Valor Estimado</span><span>${fmtMoeda(Number(row.valor_estimado ?? 0))}</span></div>
  </div>
  <div class="ftr">Igufoz · Sistema de Reservas · gerado automaticamente</div>
</div></body></html>`
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  const body = await res.json()
  console.log(JSON.stringify({ to, status: res.status, resend: body }))
  return res.ok
}

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json()
    const row = payload?.record as Record<string, unknown>
    if (!row) return new Response('no record', { status: 400 })

    console.log(JSON.stringify({ event: 'notificar-reserva', id: row.id }))

    const tasks: Promise<boolean>[] = [
      sendEmail(CENTRAL_EMAIL, `🔔 Nova reserva — ${row.cliente_nome ?? 'cliente'}`, htmlCentral(row)),
    ]
    if (row.cliente_email) {
      tasks.push(sendEmail(String(row.cliente_email), '✅ Igufoz — Solicitação de reserva recebida', htmlCliente(row)))
    }

    await Promise.allSettled(tasks)
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error(String(e))
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
