// EmptyState — Design System Operacional do i-Frotas.
// Contrato: docs/ui/EmptyState.md
export function criarEmptyState(config) {
  let { icon, title, message } = config;
  const el = document.createElement('div');
  el.className = 'empty-state';

  function render() {
    el.innerHTML = `
      ${icon ? `<div class="empty-state-icon">${icon}</div>` : ''}
      <p class="empty-state-title">${title}</p>
      ${message ? `<p class="empty-state-msg">${message}</p>` : ''}
    `;
  }

  render();

  return {
    el,
    update(novoConfig) {
      ({ icon, title, message } = { icon, title, message, ...novoConfig });
      render();
    },
    destroy() { el.remove(); }
  };
}
