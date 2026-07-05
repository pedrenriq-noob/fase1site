// FilterBar — Design System Operacional do i-Frotas.
// Contrato: docs/ui/FilterBar.md
// Config dinâmica (contagens mudam com os dados) — update() preserva seleção,
// foco e listeners: nunca reconstrói o componente inteiro (ver docs/ui/README.md,
// "Quando um componente precisa de update()").
export function criarFilterBar(config) {
  let { groups, onFilterChange } = config;
  const selected = new Map();
  for (const g of groups) selected.set(g.key, new Set());

  const el = document.createElement('div');
  el.className = 'filter-bar-groups';

  function escapeHtml(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function emit() {
    const estado = {};
    for (const [key, set] of selected) estado[key] = [...set];
    onFilterChange(estado);
  }

  function toggle(groupKey, value, multi) {
    const set = selected.get(groupKey);
    if (!set) return;
    if (multi) {
      if (set.has(value)) set.delete(value); else set.add(value);
    } else {
      if (set.has(value)) set.clear(); else { set.clear(); set.add(value); }
    }
    render();
    emit();
  }

  function render() {
    // Poda seleções cujas opções deixaram de existir (única forma de uma
    // seleção ser removida automaticamente pelo update() — ver contrato).
    let prunedAny = false;
    for (const g of groups) {
      const valid = new Set(g.options.map((o) => o.value));
      const set = selected.get(g.key) ?? new Set();
      for (const v of [...set]) {
        if (!valid.has(v)) { set.delete(v); prunedAny = true; }
      }
      selected.set(g.key, set);
    }
    for (const key of [...selected.keys()]) {
      if (!groups.find((g) => g.key === key)) { selected.delete(key); prunedAny = true; }
    }

    // Captura o foco atual (grupo + valor) para restaurar depois, se a opção sobreviver.
    const active = document.activeElement;
    let focusedGroupKey = null, focusedValue = null;
    if (active && el.contains(active) && active.dataset?.value != null) {
      focusedGroupKey = active.closest('[data-group]')?.dataset.group ?? null;
      focusedValue = active.dataset.value;
    }

    const existingGroupEls = new Map();
    el.querySelectorAll(':scope > [data-group]').forEach((g) => existingGroupEls.set(g.dataset.group, g));

    const wantedKeys = groups.map((g) => g.key);
    for (const [key, node] of existingGroupEls) {
      if (!wantedKeys.includes(key)) node.remove();
    }

    groups.forEach((g) => {
      let groupEl = existingGroupEls.get(g.key);
      if (!groupEl) {
        groupEl = document.createElement('div');
        groupEl.className = 'filter-bar';
        groupEl.setAttribute('role', 'group');
        groupEl.dataset.group = g.key;
      }
      groupEl.setAttribute('aria-label', g.label);
      el.appendChild(groupEl); // appendChild em nó existente só reordena — preserva identidade/listeners

      const existingBtns = new Map();
      groupEl.querySelectorAll('button[data-value]').forEach((b) => existingBtns.set(b.dataset.value, b));

      const set = selected.get(g.key) ?? new Set();
      const wantedValues = g.options.map((o) => o.value);

      for (const [value, btn] of existingBtns) {
        if (!wantedValues.includes(value)) btn.remove();
      }

      g.options.forEach((opt) => {
        let btn = existingBtns.get(opt.value);
        const isNew = !btn;
        if (isNew) {
          btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'filter-chip';
          btn.dataset.value = opt.value;
          btn.addEventListener('click', () => toggle(g.key, opt.value, !!g.multi));
        }
        groupEl.appendChild(btn); // reordena sem recriar

        const isActive = set.has(opt.value);
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));

        const countHtml = opt.count != null ? ` <span class="chip-count">${escapeHtml(String(opt.count))}</span>` : '';
        btn.innerHTML = `${escapeHtml(opt.label)}${countHtml}`;
      });
    });

    if (focusedGroupKey != null) {
      const btn = el.querySelector(
        `[data-group="${CSS.escape(focusedGroupKey)}"] button[data-value="${CSS.escape(focusedValue)}"]`
      );
      if (btn) btn.focus();
    }

    if (prunedAny) emit();
  }

  render();

  return {
    el,
    update(novoConfig) {
      ({ groups, onFilterChange } = { groups, onFilterChange, ...novoConfig });
      render();
    },
    reset() {
      for (const set of selected.values()) set.clear();
      render();
      emit();
    },
    getState() {
      const estado = {};
      for (const [key, set] of selected) estado[key] = [...set];
      return estado;
    },
    destroy() {
      el.remove();
    }
  };
}
