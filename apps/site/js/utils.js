// ── UTILS ──────────────────────────────────────────────────
// Helpers puros, sem dependência de S nem de outros módulos do wizard.

export function isSunday(d) { return !!d && new Date(d + 'T12:00:00').getDay() === 0 }

export function minDate() {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function pad(n) { return String(n).padStart(2, '0') }

export function timeOpts(from, to, sel) {
  let s = '<option value="">Hora</option>'
  for (let h = from; h <= to; h++)
    for (let m = 0; m < 60; m += 30) {
      const v = pad(h) + ':' + pad(m)
      s += `<option${v === sel ? ' selected' : ''}>${v}</option>`
    }
  return s
}

export function fmtN(n) {
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function esc(s) {
  if (!s) return ''
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

export function maskCPF(v) {
  v = v.replace(/\D/g, '').slice(0, 11)
  if (v.length > 9) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4')
  if (v.length > 6) return v.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3')
  if (v.length > 3) return v.replace(/(\d{3})(\d{0,3})/, '$1.$2')
  return v
}

export function maskWpp(v) {
  v = v.replace(/\D/g, '').slice(0, 11)
  if (v.length > 10) return v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (v.length > 6)  return v.replace(/(\d{2})(\d{4,5})(\d{0,4})/, '($1) $2-$3')
  if (v.length > 2)  return v.replace(/(\d{2})(\d{0,5})/, '($1) $2')
  return v
}

export function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '')
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
  let add = 0
  for (let i = 0; i < 9; i++) add += parseInt(cpf[i]) * (10 - i)
  let rev = 11 - (add % 11); if (rev >= 10) rev = 0
  if (rev !== parseInt(cpf[9])) return false
  add = 0
  for (let i = 0; i < 10; i++) add += parseInt(cpf[i]) * (11 - i)
  rev = 11 - (add % 11); if (rev >= 10) rev = 0
  return rev === parseInt(cpf[10])
}
