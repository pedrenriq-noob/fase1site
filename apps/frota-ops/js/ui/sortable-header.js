// SortableHeader — Design System Operacional do i-Frotas.
// Contrato: docs/ui/SortableHeader.md
// Config dinâmica (active/direction mudam quando o critério de ordenação da
// tela muda) — por isso o próprio contrato já previa update() desde a Fase 0.
// Cada instância controla um único critério; não sabe ordenar dados, nem
// sabe da existência de outras instâncias na mesma tela (isso é
// responsabilidade da página — ver regra de comportamento #3 do contrato).
export function criarSortableHeader(config) {
  let { label, sortKey, active = false, direction = null, onSort } = config;

  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'sortable-header';

  function render() {
    const ariaSort = active ? (direction === 'desc' ? 'descending' : 'ascending') : 'none';
    el.setAttribute('aria-sort', ariaSort);
    el.classList.toggle('active', active);
    const arrow = active ? (direction === 'desc' ? ' ▼' : ' ▲') : '';
    el.textContent = `${label}${arrow}`;
  }

  el.addEventListener('click', () => {
    // Alterna asc → desc → asc, nunca remove a ordenação (regra de comportamento #-).
    // Primeiro clique num header ainda não ativo sempre começa em 'asc'.
    const novaDirecao = !active ? 'asc' : (direction === 'asc' ? 'desc' : 'asc');
    onSort(sortKey, novaDirecao);
  });

  render();

  return {
    el,
    update(novoConfig) {
      ({ label, sortKey, active, direction, onSort } = { label, sortKey, active, direction, onSort, ...novoConfig });
      render();
    },
    destroy() {
      el.remove();
    }
  };
}
