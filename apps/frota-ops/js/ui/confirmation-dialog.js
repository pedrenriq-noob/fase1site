// ConfirmationDialog — Design System Operacional do i-Frotas.
// Contrato: docs/ui/ConfirmationDialog.md
// Caso de uso específico de Modal — substitui confirm() nativo.
import { criarModal } from './modal.js';

export function criarConfirmationDialog(config) {
  const { message, onConfirm, onCancel, tone = 'default' } = config;

  const modal = criarModal({
    title: 'Confirmação',
    bodyHtml: `<p class="text-sm">${message}</p>`,
    onConfirm: async () => {
      await onConfirm();
      return true;
    },
    onClose: onCancel
  });

  if (tone === 'danger') {
    const confirmBtn = modal.el.querySelector('.modal-confirm');
    confirmBtn?.classList.remove('btn-primary');
    confirmBtn?.classList.add('btn-danger');
  }

  return modal;
}
