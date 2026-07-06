# Design System Operacional do i-Frotas

Ver [ADR-006](../adr/ADR-006-design-system-operacional-ifrotas.md) para a decisão e motivação, e [ADR-007](../adr/ADR-007-processo-evolucao-design-system.md) para o ciclo de vida obrigatório de todo componente (Contrato → Implementação → Code Review Arquitetural → Migração Piloto validada em ambiente real → Lições aprendidas → Stable). O checklist operacional desse ciclo está em [COMPONENT_CHECKLIST.md](COMPONENT_CHECKLIST.md), e o critério objetivo de conclusão em [../DEFINITION_OF_DONE.md](../DEFINITION_OF_DONE.md). Pequenas decisões que não justificam ADR ficam em [../DECISION_LOG.md](../DECISION_LOG.md).

## Princípios (permanentes, ver ADR-006)

1. Contrato documentado antes de qualquer implementação.
2. Consistência de comportamento e visual em toda a plataforma — nenhuma tela reimplementa um componente equivalente.
3. Composabilidade: capacidades pequenas e combináveis, não componentes grandes. `ListView` não embute pesquisa/filtro/ordenação/seleção — ele as compõe.
4. Migração incremental: sistema sempre funcional, tela por tela, sem reescritas completas.

## Padrão de API

Todo componente é uma função-fábrica (JS vanilla, sem framework — ver ADR-001):

```js
function criarNomeDoComponente(config) {
  // ...monta um elemento DOM interno...
  return {
    el,                 // nó DOM a inserir na página
    update(novoEstado),  // re-renderiza com novo estado
    destroy()             // remove listeners e nó do DOM
  };
}
```

Eventos são callbacks passados em `config` (ex: `onSearch`, `onSelectionChange`), não `CustomEvent` — mantém o padrão de `addEventListener` já usado em todo o código atual, sem introduzir um mecanismo novo de comunicação.

Nenhum componente importa `supabase` ou qualquer serviço de `js/services/`. Quem busca dados e decide o que fazer com eventos é sempre a página (`pages/*.js`).

### Convenção de nomenclatura de eventos (obrigatória, validada 2026-07-05)

Todo callback público é nomeado `on<Evento>`, em camelCase, descrevendo **o que aconteceu**, nunca uma instrução do tipo "faça isto":

- Correto: `onSearch`, `onFilterChange`, `onSort`, `onSelectionChange`, `onCancelSelection`, `onConfirm`, `onCancel`, `onClose`, `onAction`.
- Incorreto: `handler`, `callback`, `onClick` (nome de evento de baixo nível do DOM, não da intenção do componente).

Correção aplicada nesta validação: `FilterBar.onChange` → `FilterBar.onFilterChange` (mais específico, no mesmo padrão de `onSearch`/`onSort`); `BulkActionBar.actions[].handler` → `BulkActionBar.actions[].onAction` (nenhum callback deve escapar do prefixo `on`, mesmo dentro de um array).

### Contrato de `update(novoEstado)`

**Merge raso (shallow merge) com o estado/config anterior, nunca substituição total.** `update({ items: novaLista })` não apaga `renderItem`, `emptyState`, etc. já configurados — só substitui as chaves informadas. Dentro de uma chave, o valor novo substitui o antigo por inteiro (arrays e objetos não são mesclados profundamente — `update({ items: [...] })` troca o array inteiro, não faz merge item a item). Isso é consistente em todos os componentes do Design System; qualquer exceção deve ser documentada explicitamente no contrato do componente.

### Quando um componente precisa de `update()` (regra permanente, adicionada na revisão de contrato do FilterBar, 2026-07-05)

Nem todo componente precisa de `update()` — depende da natureza da sua config:

- **Config estática** (não muda depois que o componente é criado, ex: `placeholder`/`debounceMs` do `SearchBox`, `minHeight` do `LoadingState`): **não precisa** de `update()`. Documentar explicitamente essa ausência no contrato do componente, com o motivo (para não parecer omissão acidental).
- **Config dinâmica** (representa um estado derivado de dados que evoluem durante o uso — contagens, listas, rótulos que mudam com busca/realtime/importação, ex: `groups`/`options` do `FilterBar`, `items` do `ListView`): **precisa** de `update()`, e esse `update()` deve preservar o máximo possível do contexto do usuário — nunca destruir e recriar o componente como estratégia de atualização.

Quando um `update()` é necessário, ele garante, no mínimo:
1. Atualiza só os dados que mudaram — nunca reconstrói o componente inteiro internamente.
2. Preserva o estado de interação do usuário que ainda for válido (seleção ativa, filtro aplicado, texto digitado) — só descarta o que genuinamente deixou de existir nos novos dados.
3. Preserva o foco do usuário quando o elemento focado continuar existindo após o `update()`.
4. Não recria listeners de elementos que não mudaram — só o DOM efetivamente alterado é tocado.

Esta regra existe porque destruir/recriar um componente para refletir um dado novo é, na prática, o mesmo erro que a correção do `ListView` (Architecture Validation) e a decisão de estabilidade de foco do `Modal` (Migração Piloto) já resolveram em outros contextos: perder o contexto do operador no meio do uso viola um princípio permanente do i-Frotas (ver `project_principios_ux_produto_ifrotas`, item de continuidade operacional).

### Garantias mínimas de `destroy()`

Todo `destroy()` garante, no mínimo:

1. Remoção do nó `el` do DOM (se já estiver anexado).
2. Remoção de todos os `addEventListener` registrados pelo próprio componente (nunca depende de o nó ser coletado pelo garbage collector para isso).
3. Cancelamento de qualquer `setTimeout`/`setInterval`/debounce interno (ex: `SearchBox` cancela o timer de debounce pendente).
4. Encerramento de qualquer subscription que o componente eventualmente tenha criado — hoje nenhum componente de `docs/ui/` cria subscriptions (realtime é sempre gerenciado pela página via `js/realtime.js`), mas a garantia fica registrada para quando/se algum componente futuro vier a precisar.

Chamar `destroy()` mais de uma vez nunca lança exceção (idempotente).

## Inventário de componentes

| Componente | Capacidade | Depende de |
|---|---|---|
| [Modal](Modal.md) | Diálogo modal genérico | nenhum |
| [ConfirmationDialog](ConfirmationDialog.md) | Confirmação de ação destrutiva/importante | Modal |
| [EmptyState](EmptyState.md) | Estado vazio padronizado | nenhum |
| [LoadingState](LoadingState.md) | Estado de carregamento padronizado | nenhum |
| [ErrorState](ErrorState.md) | Estado de erro padronizado (sem retry embutido) | nenhum |
| [StatusBadge](StatusBadge.md) | Exibição de status (veículo/reserva) | `utils.js` (labels/cores existentes) |
| [SearchBox](SearchBox.md) ✅ implementado (2026-07-05, Fase 1B/Camada 1) | Busca em tempo real | nenhum |
| [FilterBar](FilterBar.md) ✅ implementado (2026-07-05, Fase 1B/Camada 1) | Filtros simples e combináveis | nenhum |
| [SortableHeader](SortableHeader.md) ✅ implementado (2026-07-05, Fase 1B/Camada 1) | Ordenação por critério, asc/desc | nenhum |
| [SelectionController](SelectionController.md) ✅ implementado (2026-07-05, Fase 1B/Camada 1 — Camada 1 concluída) | Seleção múltipla de itens de uma lista | nenhum |
| [BulkActionBar](BulkActionBar.md) ✅ implementado (2026-07-05, Fase 1B/Camada 2 — Camada 2 concluída) | Barra de ações em lote sobre a seleção ativa | nenhum (usado em conjunto com SelectionController pela página, sem import direto) |
| [ListView](ListView.md) | Orquestra os componentes acima em uma listagem | nenhum em tempo de execução — recebe apenas estado primitivo de SearchBox/FilterBar/SortableHeader, nunca a instância (corrigido nesta validação, ver ListView.md) |

## Status de adoção (atualizar a cada migração)

| Tela | Modal | ConfirmationDialog | SearchBox | FilterBar | SortableHeader | SelectionController | BulkActionBar | StatusBadge | ErrorState |
|---|---|---|---|---|---|---|---|---|---|
| veiculos.js | — | — | próprio (a migrar) | chips próprios (a migrar) | — | — | — | — | — |
| veiculo-detalhe.js | **migrado** (2026-07-05, piloto) | **migrado** (2026-07-05, piloto) | — | — | — | — | — | próprio (a migrar) | — |
| reservas.js | **migrado** (2026-07-05, Ação #5 da Technical Audit) | **migrado** (2026-07-05) | — | tabs próprias (a migrar) | — | — | — | próprio (a migrar) | — |
| admin.js | próprio (a migrar) | `confirm()`/`prompt()` nativo (a migrar) | — | — | — | — | — | — | — |
| dashboard.js, patio.js, disponibilidade.js, ociosidade.js | — | — | — | — | — | — | — | (candidatos quando ganharem ação de status) | inline (a migrar) |

Esta tabela é o rastreamento explícito mencionado na ADR-006 — atualizar a cada componente adotado por uma tela, para a duplicação temporária durante a transição não virar dívida esquecida.

Ver `docs/ui/MIGRATION_LOG.md` para o relato detalhado de cada migração (problemas encontrados, ajustes, lições aprendidas).

## Critério de Stable

Quando um componente for usado por **pelo menos 3 telas sem necessidade de alteração na sua API pública**, ele passa a ser considerado **Stable**. A partir desse momento, mudanças na API pública desse componente são tratadas como mudanças arquiteturais relevantes (exigem o mesmo rigor de uma ADR), não como ajuste incremental.

| Componente | Telas adotantes | Status |
|---|---|---|
| Modal | veiculo-detalhe.js, reservas.js (2/3) | Em validação |
| ConfirmationDialog | veiculo-detalhe.js, reservas.js (2/3) | Em validação |
| EmptyState, LoadingState, ErrorState, StatusBadge, SearchBox, FilterBar, SortableHeader, SelectionController, BulkActionBar, ListView | nenhuma ainda | Não iniciado |

## Acessibilidade (RF-06, obrigatória em todo componente interativo)

Todo componente que recebe interação do usuário (clique, teclado) documenta, na sua própria página, uma seção "Acessibilidade" com: papel ARIA, atributos obrigatórios, e quais teclas ativam/fecham/navegam o componente. Ver `Modal.md`, `ConfirmationDialog.md`, `SearchBox.md`, `FilterBar.md`, `SortableHeader.md`, `SelectionController.md`, `BulkActionBar.md`.
