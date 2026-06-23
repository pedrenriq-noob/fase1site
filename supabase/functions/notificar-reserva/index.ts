import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const RESEND_KEY    = 're_51Rozuwe_Mk85nNbiLfteKshDW64jgaeh'
const FROM_EMAIL    = 'Igufoz Reservas <onboarding@resend.dev>'
const CENTRAL_EMAIL = 'pedrenriq@gmail.com'
const SUPABASE_URL  = 'https://lxfnqzuzohudqwibgdic.supabase.co'
const SUPABASE_ANON = 'sb_publishable_lZYtlQFkZCgUE-ppawmXHA_CPo0tPUF'

const fmt = (v: number) =>
  'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtDate = (iso: string) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function calcDias(ret: string, dev: string): number {
  const diff = new Date(dev).getTime() - new Date(ret).getTime()
  return Math.max(1, Math.round(diff / 36e5 / 24 * 10) / 10)
}

function tabelaProdutos(cat: any, prot: any, itens: any[], dias: number): string {
  const trS = 'border-bottom:1px solid #e2e8f0'
  const tdL = 'padding:8px 6px;font-size:13px;color:#1a2332'
  const tdR = 'padding:8px 6px;font-size:13px;color:#1a2332;text-align:right'

  let rows = ''

  if (cat) {
    const precoDia = parseFloat(cat.preco_diaria || 0)
    rows += `<tr style="${trS}">
      <td style="${tdL}">${cat.nome} <span style="color:#94a3b8;font-size:11px">(${dias} diária${dias !== 1 ? 's' : ''})</span></td>
      <td style="${tdR}">${fmt(precoDia)}/dia</td>
      <td style="${tdR}">${fmt(precoDia * dias)}</td>
    </tr>`
  }

  if (prot) {
    const precoProt = parseFloat(prot.preco || 0)
    const totalProt = prot.tipo_preco === 'per_day' ? precoProt * dias : precoProt
    rows += `<tr style="${trS}">
      <td style="${tdL}">${prot.nome}</td>
      <td style="${tdR}">${fmt(precoProt)}${prot.tipo_preco === 'per_day' ? '/dia' : ''}</td>
      <td style="${tdR}">${fmt(totalProt)}</td>
    </tr>`
  }

  for (const i of (itens ?? [])) {
    const unit  = parseFloat(i.preco_unitario || 0)
    const qty   = i.quantidade || 1
    const total = i.tipo_preco === 'per_day' ? unit * qty * dias : unit * qty
    rows += `<tr style="${trS}">
      <td style="${tdL}">${i.adicionais?.nome ?? '—'}${qty > 1 ? ` (${qty}×)` : ''}</td>
      <td style="${tdR}">${fmt(unit)}${i.tipo_preco === 'per_day' ? '/dia' : ''}</td>
      <td style="${tdR}">${fmt(total)}</td>
    </tr>`
  }

  return `
  <table style="width:100%;border-collapse:collapse;margin-top:8px">
    <thead>
      <tr style="background:#f8fafc">
        <th style="text-align:left;padding:8px 6px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px">Produto</th>
        <th style="text-align:right;padding:8px 6px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px">Valor Unit.</th>
        <th style="text-align:right;padding:8px 6px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px">Total</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="3" style="text-align:center;padding:12px;color:#94a3b8">Sem itens</td></tr>'}</tbody>
  </table>`
}

function htmlCliente(row: any): string {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<style>
body{font-family:Arial,sans-serif;background:#f4f6fb;margin:0;padding:0}
.wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
.hdr{background:#0f1f3c;padding:28px 32px;text-align:center}
.hdr h1{color:#fff;margin:0;font-size:22px}.hdr p{color:#a0b0cc;margin:6px 0 0;font-size:13px}
.bdy{padding:28px 32px}
.card{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:14px 18px;margin-bottom:16px}
.cr{display:flex;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px solid #f0f0f0}
.cr:last-child{border-bottom:none}.lbl{color:#6b7280}.val{color:#1a2332;font-weight:600}
.tot{background:#fff3ea;border:1.5px solid #FF6B00;border-radius:10px;padding:14px 18px;display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#FF6B00;margin:16px 0}
.btn{display:block;background:#25D366;color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:10px;font-size:15px;font-weight:700}
.ftr{background:#f8fafc;padding:16px 32px;text-align:center;font-size:12px;color:#9ca3af}
</style></head><body>
<div class="wrap">
  <div class="hdr"><h1>igufoz</h1><p>aluguel de veículos · foz do iguaçu</p></div>
  <div class="bdy">
    <h2 style="font-size:18px;color:#1a2332;margin:0 0 10px">Solicitação recebida! ✅</h2>
    <p style="font-size:13px;color:#FF6B00;font-weight:700;margin:0 0 8px;letter-spacing:.5px">RESERVA #${String(row.numero ?? '—').padStart(4, '0')}</p>
    <p style="font-size:14px;color:#374151;line-height:1.65;margin:0 0 16px">
      Olá, <strong>${String(row.cliente_nome ?? 'cliente').split(' ')[0]}</strong>! Sua solicitação foi recebida. Nossa equipe entrará em contato em breve para confirmar.
    </p>
    <div class="card">
      <div class="cr"><span class="lbl">📅 Retirada</span><span class="val">${fmtDate(row.data_retirada)}</span></div>
      <div class="cr"><span class="lbl">📅 Devolução</span><span class="val">${fmtDate(row.data_devolucao)}</span></div>
      <div class="cr"><span class="lbl">📍 Local retirada</span><span class="val">${row.local_retirada ?? '—'}</span></div>
      <div class="cr"><span class="lbl">📍 Local devolução</span><span class="val">${row.local_devolucao ?? '—'}</span></div>
    </div>
    <div class="tot"><span>Valor Estimado</span><span>${fmt(row.valor_estimado ?? 0)}</span></div>
    <p style="font-size:13px;color:#6b7280;margin-bottom:10px">Em caso de dúvidas, entre em contato pelo WhatsApp:</p>
    <a class="btn" href="https://wa.me/554599999999">💬 Falar no WhatsApp</a>
  </div>
  <div class="ftr">Igufoz Aluguel de Veículos · Foz do Iguaçu · PR<br>Este e-mail foi gerado automaticamente.</div>
</div></body></html>`
}

function htmlCentral(row: any, cat: any, prot: any, itens: any[]): string {
  const dias = calcDias(row.data_retirada, row.data_devolucao)
  const tabela = tabelaProdutos(cat, prot, itens, dias)
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
.wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
.hdr{background:#FF6B00;padding:22px 32px}
.hdr h1{color:#fff;margin:0;font-size:20px}.hdr p{color:rgba(255,255,255,.8);margin:4px 0 0;font-size:13px}
.bdy{padding:24px 32px}
.sec{margin-bottom:18px}
.sec h3{font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;margin:0 0 8px;padding-bottom:4px;border-bottom:1px solid #e2e8f0}
.row{display:flex;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px solid #f5f5f5}
.row:last-child{border-bottom:none}
.lbl{color:#6b7280}.val{color:#1a2332;font-weight:600;text-align:right;max-width:60%}
.tot{background:#f0fdf4;border:1.5px solid #22c55e;border-radius:8px;padding:14px 18px;display:flex;justify-content:space-between;font-size:17px;font-weight:700;color:#16a34a;margin-top:16px}
.ftr{background:#f8fafc;padding:14px 32px;text-align:center;font-size:12px;color:#9ca3af}
</style></head><body>
<div class="wrap">
  <div class="hdr">
    <h1>🔔 Nova Solicitação de Reserva</h1>
    <p>Reserva <strong>#${String(row.numero ?? '?').padStart(4, '0')}</strong> · Enviado em ${fmtDate(row.criado_em ?? new Date().toISOString())}</p>
  </div>
  <div class="bdy">
    <div class="sec"><h3>Cliente</h3>
      <div class="row"><span class="lbl">Nome</span><span class="val">${row.cliente_nome ?? '—'}</span></div>
      <div class="row"><span class="lbl">WhatsApp</span><span class="val">${row.cliente_whatsapp ?? '—'}</span></div>
      <div class="row"><span class="lbl">E-mail</span><span class="val">${row.cliente_email ?? '—'}</span></div>
      <div class="row"><span class="lbl">CPF</span><span class="val">${row.cliente_cpf ?? '—'}</span></div>
      <div class="row"><span class="lbl">Pessoas</span><span class="val">${row.pessoas ?? 1}</span></div>
    </div>
    <div class="sec"><h3>Período</h3>
      <div class="row"><span class="lbl">Retirada</span><span class="val">${fmtDate(row.data_retirada)}</span></div>
      <div class="row"><span class="lbl">Devolução</span><span class="val">${fmtDate(row.data_devolucao)}</span></div>
      <div class="row"><span class="lbl">Local retirada</span><span class="val">${row.local_retirada ?? '—'}</span></div>
      <div class="row"><span class="lbl">Local devolução</span><span class="val">${row.local_devolucao ?? '—'}</span></div>
    </div>
    ${vooHtml}${obsHtml}
    <div class="sec"><h3>Produtos e Valores</h3>
      ${tabela}
    </div>
    <div class="tot"><span>TOTAL ESTIMADO</span><span>${fmt(row.valor_estimado ?? 0)}</span></div>
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
    if (!row) return new Response('no record', { status: 400, headers: CORS })

    console.log(JSON.stringify({ event: 'notificar-reserva', id: row.id }))

    // Busca categoria, proteção e adicionais para montar tabela de valores
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? SUPABASE_ANON
    const sb = createClient(SUPABASE_URL, serviceKey)
    const [{ data: solRow }, { data: cat }, { data: prot }, { data: itens }] = await Promise.all([
      sb.from('solicitacoes').select('numero').eq('id', row.id).single(),
      row.categoria_id
        ? sb.from('categorias').select('nome, preco_diaria').eq('id', row.categoria_id).single()
        : Promise.resolve({ data: null, error: null }),
      row.protecao_id
        ? sb.from('protecoes').select('nome, preco, tipo_preco').eq('id', row.protecao_id).single()
        : Promise.resolve({ data: null, error: null }),
      sb.from('solicitacao_itens')
        .select('quantidade, preco_unitario, tipo_preco, adicionais(nome)')
        .eq('solicitacao_id', row.id),
    ])

    if (solRow?.numero) row.numero = solRow.numero

    const tasks: Promise<boolean>[] = [
      sendEmail(
        CENTRAL_EMAIL,
        `🔔 Nova reserva — ${row.cliente_nome ?? 'cliente'}`,
        htmlCentral(row, cat, prot, itens ?? [])
      ),
    ]
    if (row.cliente_email) {
      tasks.push(sendEmail(
        String(row.cliente_email),
        '✅ Igufoz — Solicitação de reserva recebida',
        htmlCliente(row)
      ))
    }

    await Promise.allSettled(tasks)
    return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error(String(e))
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }
})
