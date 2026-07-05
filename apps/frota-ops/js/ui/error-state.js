// ErrorState — Design System Operacional do i-Frotas.
// Contrato: docs/ui/ErrorState.md
// Deliberadamente sem retry: representar o erro é a única responsabilidade.
export function criarErrorState(config) {
  let { message } = config;
  const el = document.createElement('div');
  el.className = 'alert alert-error';
  el.setAttribute('role', 'alert');

  function render() {
    el.textContent = message;
  }

  render();

  return {
    el,
    update(novoConfig) {
      ({ message } = { message, ...novoConfig });
      render();
    },
    destroy() { el.remove(); }
  };
}
