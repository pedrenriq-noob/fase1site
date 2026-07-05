// EmptyState — Design System Operacional do i-Frotas.
// Contrato: docs/ui/EmptyState.md
import { escapeHtml } from '../utils.js';

export function criarEmptyState(config) {
  let { icon, title, message } = config;
  const el = document.createElement('div');
  el.className = 'empty-state';

  function render() {
    // icon é SVG confiável fornecido pela página (mesmo tratamento do bodyHtml
    // do Modal); title/message são escapados por poderem um dia incorporar
    // dado dinâmico (ex: termo de busca no texto de "nenhum resultado").
    el.innerHTML = `
      ${icon ? `<div class="empty-state-icon">${icon}</div>` : ''}
      <p class="empty-state-title">${escapeHtml(title)}</p>
      ${message ? `<p class="empty-state-msg">${escapeHtml(message)}</p>` : ''}
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
