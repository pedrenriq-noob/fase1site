// Modal — Design System Operacional do i-Frotas.
// Contrato: docs/ui/Modal.md
// Substitui as 3 cópias de createModal (veiculo-detalhe.js, reservas.js, admin.js).
import { showToast } from '../utils.js';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function criarModal(config) {
  let { title, bodyHtml, onConfirm, onClose, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar' } = config;
  let destroyed = false;
  let confirming = false;
  const previouslyFocused = document.activeElement;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  function render() {
    const body = typeof bodyHtml === 'function' ? bodyHtml() : bodyHtml;
    overlay.innerHTML = `
      <div class="modal-content" role="dialog" aria-modal="true" aria-label="${escapeAttr(title)}">
        <div class="modal-header">
          <h2 class="modal-title">${escapeAttr(title)}</h2>
          <button class="modal-close" aria-label="Fechar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">${body}</div>
        <div class="modal-footer">
          <button class="btn btn-secondary modal-cancel">${escapeAttr(cancelLabel)}</button>
          <button class="btn btn-primary modal-confirm">${escapeAttr(confirmLabel)}</button>
        </div>
      </div>
    `;
    bind();
  }

  function escapeAttr(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function close() {
    if (destroyed) return;
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
    destroyed = true;
    if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    onClose?.();
  }

  function onKeydown(e) {
    if (confirming) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      const focusables = Array.from(overlay.querySelectorAll(FOCUSABLE)).filter((el) => !el.disabled);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function bind() {
    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.querySelector('.modal-cancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    const confirmBtn = overlay.querySelector('.modal-confirm');
    confirmBtn.addEventListener('click', async () => {
      confirming = true;
      confirmBtn.disabled = true;
      confirmBtn.classList.add('btn-loading');
      try {
        const result = await onConfirm();
        if (result !== false) close();
      } catch (err) {
        showToast('Erro ao salvar. Tente novamente.', 'error');
      } finally {
        confirming = false;
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('btn-loading');
      }
    });

    const firstFocusable = overlay.querySelector(FOCUSABLE);
    firstFocusable?.focus();
  }

  render();
  document.body.appendChild(overlay);
  document.addEventListener('keydown', onKeydown);

  return {
    el: overlay,
    update(novoConfig) {
      ({ title, bodyHtml, onConfirm, onClose, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar' } = { title, bodyHtml, onConfirm, onClose, confirmLabel, cancelLabel, ...novoConfig });
      render();
    },
    destroy: close
  };
}
