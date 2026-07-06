// BulkActionBar — Design System Operacional do i-Frotas.
// Contrato: docs/ui/BulkActionBar.md
// Não conhece ids, veículos, nem qualquer estrutura de dados de seleção —
// só sinaliza qual ação (por id) foi escolhida. Não importa nem referencia
// SelectionController (ver Nota de acoplamento do contrato).
import { showToast } from '../utils.js';

export function criarBulkActionBar(config) {
  let { selectedCount, actions, onAction, onCancelSelection } = config;

  const el = document.createElement('div');
  el.className = 'bulk-action-bar';
  el.setAttribute('role', 'toolbar');
  el.setAttribute('aria-label', 'Ações em massa');

  let executing = false;

  function escapeHtml(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function render() {
    el.style.display = selectedCount > 0 ? '' : 'none';
    el.innerHTML = `
      <span class="bulk-action-bar__count" aria-live="polite">${selectedCount} selecionado${selectedCount === 1 ? '' : 's'}</span>
      <div class="bulk-action-bar__actions">
        ${actions.map((a) => `<button type="button" class="btn btn-sm btn-secondary" data-action-id="${escapeHtml(a.id)}" ${executing ? 'disabled' : ''}>${escapeHtml(a.label)}</button>`).join('')}
      </div>
      <button type="button" class="btn btn-sm btn-secondary bulk-action-bar__cancel" ${executing ? 'disabled' : ''}>Cancelar seleção</button>
    `;

    el.querySelectorAll('button[data-action-id]').forEach((btn) => {
      btn.addEventListener('click', () => runAction(btn.dataset.actionId));
    });
    el.querySelector('.bulk-action-bar__cancel').addEventListener('click', () => onCancelSelection());
  }

  async function runAction(actionId) {
    if (executing) return;
    executing = true;
    render();
    try {
      await onAction(actionId);
    } catch (err) {
      showToast('Erro ao executar ação. Tente novamente.', 'error');
    } finally {
      executing = false;
      render();
    }
  }

  render();

  return {
    el,
    update(novoConfig) {
      ({ selectedCount, actions, onAction, onCancelSelection } = { selectedCount, actions, onAction, onCancelSelection, ...novoConfig });
      render();
    },
    destroy() {
      el.remove();
    }
  };
}
