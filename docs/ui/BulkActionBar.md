# BulkActionBar

## Objetivo

Barra contextual de ações em lote, exibida quando há uma seleção ativa (tipicamente vinda de um [SelectionController](SelectionController.md) — sem dependência de import, ver nota de acoplamento abaixo). Hoje não existe nenhuma ação em massa no sistema — toda operação é feita item por item.

## Propriedades (config de entrada)

| Propriedade | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `selectedCount` | `number` | sim | Quantidade de itens selecionados no momento |
| `actions` | `Array<{ label: string, onAction: (idsSelecionados: Set<string>) => Promise<void> }>` | sim | Ações disponíveis para o conjunto selecionado. Campo renomeado de `handler` para `onAction` na Architecture Validation de 2026-07-05 — nenhum callback público escapa da convenção `on<Evento>`, nem dentro de um array |
| `onCancelSelection` | `() => void` | sim | Chamado ao clicar em "Cancelar seleção" |

## Saída

`{ el, update(novoConfig), destroy() }`. Recomendação de comportamento: `el` só é visível (`display` diferente de `none`) quando `selectedCount > 0` — a barra existe sempre no DOM mas se auto-oculta, para não exigir da página lógica de show/hide.

## Eventos

- Cada `action.onAction(idsSelecionados)` é chamado ao clicar no botão correspondente.
- `onCancelSelection()`.

## Regras de comportamento

1. Não decide **quais** ações fazem sentido para a seleção atual — isso é responsabilidade da página, que monta o array `actions` de acordo com o contexto (ex: se a seleção mistura veículos em status incompatíveis, a própria ação/serviço deve validar e reportar erro, não a barra).
2. Durante a execução de um `onAction`, os botões da barra ficam desabilitados (evita duplo clique / ações concorrentes sobre a mesma seleção).
3. Erros de execução são reportados via `showToast` (padrão já existente) — a barra não fecha sozinha em caso de erro parcial (ex: 3 de 5 veículos atualizados com sucesso).
4. Ao concluir uma ação com sucesso, quem decide se a seleção é limpa é a página (normalmente sim, mas fica explícito e não é automático dentro do componente).

## Nota de acoplamento (Architecture Validation 2026-07-05)

`BulkActionBar` **não importa nem referencia** `SelectionController` — recebe apenas `selectedCount: number`, já calculado pela página a partir de `selection.getSelected().size`. A tabela de dependências em `docs/ui/README.md` foi corrigida para não sugerir uma dependência de import que não existe; os dois componentes são apenas usados em conjunto pela página, nunca acoplados entre si.

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
    { label: 'Marcar Limpo', onAction: (ids) => vehicleStatusService.marcarLimpoEmLote([...ids]) },
    { label: 'Mover Pátio', onAction: (ids) => showMoverPatioLoteModal([...ids]) }
  ],
  onCancelSelection: () => selection.clear()
});
```
