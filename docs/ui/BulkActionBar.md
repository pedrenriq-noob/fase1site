# BulkActionBar

## Objetivo

Barra contextual de ações em lote, exibida quando há uma seleção ativa (tipicamente vinda de um [SelectionController](SelectionController.md) — sem dependência de import, ver nota de acoplamento abaixo). Hoje não existe nenhuma ação em massa no sistema — toda operação é feita item por item.

## Propriedades (config de entrada)

| Propriedade | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `selectedCount` | `number` | sim | Quantidade de itens selecionados no momento (dinâmico — muda a cada seleção/deseleção) |
| `actions` | `Array<{ id: string, label: string }>` | sim | Ações disponíveis, identificadas por `id` — **sem** função própria por ação (ver revisão de contrato abaixo) |
| `onAction` | `(actionId: string) => void \| Promise<void>` | sim | Chamado com o `id` da ação clicada. A página decide o que fazer — obtém os ids selecionados do seu próprio `SelectionController` (por closure) e chama o serviço de domínio apropriado |
| `onCancelSelection` | `() => void` | sim | Chamado ao clicar em "Cancelar seleção" |

### Revisão de contrato de 2026-07-05 (antes de qualquer implementação)

A versão anterior deste contrato pedia que cada ação tivesse sua própria `onAction(idsSelecionados: Set<string>)`, mas a config só recebia `selectedCount: number` — o componente nunca teria de onde tirar os ids reais para repassar. Em vez de simplesmente corrigir isso adicionando os ids à config (o que exporia a estrutura de dados do `SelectionController` na API pública do `BulkActionBar`), a revisão adotou uma simplificação mais profunda: **o componente não manipula nem repassa ids em nenhum momento.** Ele só informa qual ação (por `id`) foi escolhida — quem obtém os ids selecionados (via seu próprio `SelectionController`, por closure) e decide o que fazer é sempre a página. Isso reduz ainda mais o acoplamento: `BulkActionBar` não conhece veículos, não conhece ids, não conhece o `Set`/array/qualquer estrutura de dados de seleção — apenas representa e sinaliza escolha de ação.

## Saída

`{ el, update(novoConfig), destroy() }`. Recomendação de comportamento: `el` só é visível (`display` diferente de `none`) quando `selectedCount > 0` — a barra existe sempre no DOM mas se auto-oculta, para não exigir da página lógica de show/hide.

## Eventos

- `onAction(actionId)` — disparado ao clicar em qualquer botão de ação, com o `id` correspondente.
- `onCancelSelection()`.

## Regras de comportamento

1. Não decide **quais** ações fazem sentido para a seleção atual — isso é responsabilidade da página, que monta o array `actions` de acordo com o contexto.
2. Durante a execução de `onAction` (enquanto a Promise retornada não resolve), **todos** os botões de ação ficam desabilitados — evita disparar uma segunda ação concorrente sobre a mesma seleção enquanto a primeira ainda está em andamento.
3. Se `onAction` lançar/rejeitar, o componente mostra um erro genérico (mesmo padrão do `Modal`, via `showToast`) e reabilita os botões — a barra não fecha sozinha em caso de erro. Mensagens de erro específicas por ação são responsabilidade da própria página (que pode capturar o erro internamente dentro do handler de `onAction`, sem deixá-lo escapar, se quiser uma mensagem customizada — mesmo padrão já adotado para `ConfirmationDialog` na Migração Piloto).
4. Ao concluir uma ação com sucesso, quem decide se a seleção é limpa é a página (normalmente sim, mas fica explícito e não é automático dentro do componente).

## Nota de acoplamento (Architecture Validation 2026-07-05, reforçada na revisão de 2026-07-05)

`BulkActionBar` **não importa, não referencia e não manipula** nada do `SelectionController` — nem instância, nem ids, nem contagem calculada a partir de ids. Recebe apenas `selectedCount: number`, já calculado pela página. Os dois componentes são usados em conjunto pela página, nunca acoplados entre si.

## Acessibilidade

- `role="toolbar"` no contêiner da barra, com `aria-label="Ações em massa"`.
- Anúncio de contagem via região `aria-live="polite"` (leitor de tela informa "3 selecionados" sem precisar de foco manual).
- Botões de ação e "Cancelar seleção" navegáveis por Tab, ativáveis por Enter/Espaço; `disabled` (não apenas visual) durante execução de uma ação, para bloquear ativação repetida também via teclado.

## Exemplo de uso

```js
import { criarBulkActionBar } from '../ui/bulk-action-bar.js';

const bulkBar = criarBulkActionBar({
  selectedCount: 0,
  actions: [
    { id: 'marcar-limpo', label: 'Marcar Limpo' },
    { id: 'mover-patio', label: 'Mover Pátio' }
  ],
  onAction: async (actionId) => {
    const ids = [...selection.getSelected()]; // a página já tem o SelectionController
    if (actionId === 'marcar-limpo') await vehicleStatusService.marcarLimpoEmLote(ids);
    if (actionId === 'mover-patio') await showMoverPatioLoteModal(ids);
  },
  onCancelSelection: () => selection.clear()
});

selection = criarSelectionController({
  onSelectionChange: (ids) => bulkBar.update({ selectedCount: ids.size })
});
```
