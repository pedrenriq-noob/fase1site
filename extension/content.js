// Injeta o sidebar Igufoz em qualquer aba
(function () {
  if (document.getElementById('igufoz-sidebar-root')) return

  // Wrapper que empurra o conteúdo da página para a esquerda
  const root = document.createElement('div')
  root.id = 'igufoz-sidebar-root'
  root.setAttribute('aria-label', 'Igufoz Cotação')

  // iframe isolado — não interfere com CSS/JS do site hospedeiro
  const frame = document.createElement('iframe')
  frame.id = 'igufoz-iframe'
  frame.src = chrome.runtime.getURL('sidebar.html')
  frame.setAttribute('title', 'Igufoz Cotação Rápida')
  root.appendChild(frame)

  document.body.appendChild(root)

  // Botão flutuante para abrir/fechar
  const toggle = document.createElement('button')
  toggle.id = 'igufoz-toggle'
  toggle.title = 'Igufoz Cotação'
  toggle.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18M3 9h6M3 15h6"/></svg>`
  document.body.appendChild(toggle)

  let open = false

  function setOpen(val) {
    open = val
    root.classList.toggle('igufoz-open', open)
    toggle.classList.toggle('igufoz-toggle-open', open)
    // Empurra body do site hospedeiro (best-effort)
    try {
      document.documentElement.style.marginRight = open ? '360px' : ''
    } catch (_) {}
    chrome.storage.local.set({ igufozOpen: open })
  }

  toggle.addEventListener('click', () => setOpen(!open))

  // Restaura estado anterior
  chrome.storage.local.get('igufozOpen', (r) => {
    if (r.igufozOpen) setOpen(true)
  })
})()
