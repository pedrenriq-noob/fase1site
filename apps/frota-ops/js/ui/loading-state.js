// LoadingState — Design System Operacional do i-Frotas.
// Contrato: docs/ui/LoadingState.md
export function criarLoadingState(config = {}) {
  const { minHeight = '20vh' } = config;
  const el = document.createElement('div');
  el.className = 'loading-screen';
  el.style.minHeight = minHeight;
  el.innerHTML = `<div class="spinner"></div>`;

  return {
    el,
    destroy() { el.remove(); }
  };
}
