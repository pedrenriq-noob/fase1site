// SelectionController — Design System Operacional do i-Frotas.
// Contrato: docs/ui/SelectionController.md
// Config estática (onSelectionChange não muda depois de criado) — sem
// update(), deliberadamente. Estado puro sobre identificadores (string),
// nunca guarda referência a objetos de item. Não renderiza nada — não
// retorna `el`.
export function criarSelectionController(config) {
  const { onSelectionChange } = config;

  const selecionados = new Set();

  function emit() {
    onSelectionChange(new Set(selecionados));
  }

  function toggle(id) {
    if (selecionados.has(id)) selecionados.delete(id); else selecionados.add(id);
    emit();
  }

  function selectAll(ids) {
    let changed = false;
    for (const id of ids) {
      if (!selecionados.has(id)) { selecionados.add(id); changed = true; }
    }
    if (changed) emit();
  }

  function clear() {
    if (selecionados.size === 0) return;
    selecionados.clear();
    emit();
  }

  function isSelected(id) {
    return selecionados.has(id);
  }

  function getSelected() {
    return new Set(selecionados);
  }

  function destroy() {
    selecionados.clear();
  }

  return { toggle, selectAll, clear, isSelected, getSelected, destroy };
}
