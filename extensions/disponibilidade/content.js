// Injeta o sidebar de Disponibilidade Igufoz em qualquer aba
(function () {
  if (document.getElementById('igufoz-disp-root')) return

  // Wrapper que empurra o conteúdo da página para a esquerda
  const root = document.createElement('div')
  root.id = 'igufoz-disp-root'
  root.setAttribute('aria-label', 'Igufoz Disponibilidade')

  // iframe isolado — não interfere com CSS/JS do site hospedeiro
  const frame = document.createElement('iframe')
  frame.id = 'igufoz-disp-iframe'
  frame.src = chrome.runtime.getURL('sidebar.html')
  frame.setAttribute('title', 'Igufoz Disponibilidade')
  root.appendChild(frame)

  document.body.appendChild(root)

  // Botão flutuante para abrir/fechar
  const toggle = document.createElement('button')
  toggle.id = 'igufoz-disp-toggle'
  toggle.title = 'Igufoz Disponibilidade'
  toggle.innerHTML = `<span style="writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);font-size:13px;font-weight:900;letter-spacing:2px;color:#FF6B00;font-family:Arial,sans-serif;line-height:1">D.I.F</span>`
  document.body.appendChild(toggle)

  let open = false

  function setOpen(val) {
    open = val
    root.classList.toggle('igufoz-disp-open', open)
    toggle.classList.toggle('igufoz-disp-toggle-open', open)
    chrome.storage.local.set({ igufozDispOpen: open })
    // Recarrega dados ao abrir para refletir alterações do admin/sync
    if (open) frame.contentWindow?.postMessage({ igufozDispReload: true }, '*')
  }

  toggle.addEventListener('click', () => setOpen(!open))

  // Restaura estado anterior
  chrome.storage.local.get('igufozDispOpen', (r) => {
    if (r.igufozDispOpen) setOpen(true)
  })
})()
