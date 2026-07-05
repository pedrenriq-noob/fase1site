# Decision Log — i-Frotas

Pequenas decisões arquiteturais e de implementação que não justificam uma ADR, mas que não devem depender do histórico de conversas para serem lembradas. Cada entrada contém apenas: Data, Decisão, Justificativa, Impacto. Ordem cronológica, mais recente no topo.

---

**Data:** 2026-07-05
**Decisão:** `Modal` inicializa na ordem `document.body.appendChild(overlay)` antes de `render()`, não depois.
**Justificativa:** `render()` tenta focar o primeiro elemento focável; `.focus()` em elemento ainda não anexado ao DOM é *no-op* silencioso. Só foi descoberto testando de fato no navegador durante a Migração Piloto.
**Impacto:** Autofoco do `Modal` passou a funcionar em todas as instâncias (nenhuma mudança de API pública).

---

**Data:** 2026-07-05
**Decisão:** Autofoco inicial do `Modal` busca primeiro dentro de `.modal-body`, caindo para o modal inteiro só se o corpo não tiver elemento focável.
**Justificativa:** Sem essa restrição, o botão "Fechar" do cabeçalho (antes do corpo no DOM) roubava o foco do primeiro campo do formulário.
**Impacto:** Nenhuma mudança de contrato — corrige o comportamento para bater com o que `docs/ui/Modal.md` já dizia.

---

**Data:** 2026-07-05
**Decisão:** `ConfirmationDialog` fecha sempre ao confirmar; não expõe forma de manter aberto em caso de erro nem de customizar a mensagem de erro exibida.
**Justificativa:** É um componente de confirmação simples (sim/não), não um formulário com validação — esse papel já é coberto pelo `Modal`. Preservar mensagens de erro específicas por ação é responsabilidade da página, com seu próprio try/catch dentro de `onConfirm`.
**Impacto:** Migração de `veiculo-detalhe.js` manteve os 5 `try/catch` internos das ações que usavam `confirm()` nativo, em vez de deixar a exceção escapar para o toast genérico do `Modal`.

---

**Data:** 2026-07-05
**Decisão:** `FilterBar.onChange` renomeado para `onFilterChange`; `BulkActionBar.actions[].handler` renomeado para `onAction`.
**Justificativa:** Convenção `on<Evento>` deve ser universal em todo callback público do Design System, inclusive dentro de arrays — nenhuma exceção, mesmo que pareça pequena.
**Impacto:** Mudança de contrato aplicada antes de qualquer implementação existir (Fase 0 ainda), sem consumidores para migrar.

---

**Data:** 2026-07-05
**Decisão:** `ListView` recebe estado primitivo (`search.termo`, `filters.estado`) em vez da instância de `SearchBox`/`FilterBar`.
**Justificativa:** Receber a instância exigiria que `ListView` conhecesse a API interna de outro componente (ex: chamar `filterBar.getState()`), um acoplamento oculto que a ADR-006 pede para evitar. Também era assimétrico: `sort` já recebia estado primitivo, `search`/`filters` não.
**Impacto:** Contrato do `ListView` corrigido antes da implementação (Fase 0 ainda) — nenhum código a migrar.

---

**Data:** 2026-07-05
**Decisão:** "Migração Piloto" e "Validação em ambiente real" tratadas como uma única etapa do ciclo de vida de componentes (ADR-007), não duas sequenciais.
**Justificativa:** Na prática, migrar uma tela sem de fato executá-la no navegador não tem valor de validação — foi exatamente essa execução real que encontrou o bug de foco do `Modal`, não a leitura de código da etapa anterior.
**Impacto:** ADR-007 passou de 7 para 6 etapas; `docs/ui/COMPONENT_CHECKLIST.md` já refletia essa fusão (seção única "5. Integração”).

---

**Data:** 2026-07-05
**Decisão:** Storybook, testes de acessibilidade automatizados (axe-core) e versionamento semântico por componente não serão adotados agora.
**Justificativa:** Os dois primeiros exigiriam build tooling, contrariando a ADR-001 (sem bundler); o terceiro não tem necessidade real enquanto existe um único consumidor por componente.
**Impacto:** Nenhum — mantém o Design System dentro das restrições arquiteturais já decididas. Revisitar apenas se surgir necessidade concreta (ex: múltiplos consumidores com ciclos de deploy independentes).
