// SearchBox — Design System Operacional do i-Frotas.
// Contrato: docs/ui/SearchBox.md
// Não sabe em quais campos buscar nem como comparar — só emite o termo
// digitado (trim + minúsculas), após debounce. Client-side, sem fetch.
export function criarSearchBox(config) {
  const { placeholder = 'Buscar...', debounceMs = 150, onSearch } = config;

  let debounceTimer = null;

  const el = document.createElement('div');
  el.className = 'search-wrapper';
  el.innerHTML = `
    <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    <input
      class="form-input search-input"
      type="search"
      aria-label="${escapeAttr(placeholder)}"
      placeholder="${escapeAttr(placeholder)}"
      autocomplete="off"
    />
  `;

  function escapeAttr(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const input = el.querySelector('input');

  function emit(rawValue) {
    onSearch(rawValue.trim().toLowerCase());
  }

  input.addEventListener('input', () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const value = input.value;
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      emit(value);
    }, debounceMs);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      clear();
    }
  });

  function clear() {
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
    input.value = '';
    emit('');
  }

  function destroy() {
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
    el.remove();
  }

  return { el, clear, destroy };
}
