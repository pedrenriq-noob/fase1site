# SelectionController

## Objetivo

Padronizar a seleção múltipla de itens de uma lista (item 9 dos 18 Princípios de UX). Hoje **não existe** em nenhuma tela. Isolado como capacidade própria (não embutida no `ListView`) para poder ser usado também fora de listagens, se necessário no futuro (ex: seleção em um grid de cards).

## Propriedades (config de entrada)

| Propriedade | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `getItemId` | `(item) => string` | sim | Extrai o identificador único de um item (ex: `v => v.placa`) |
| `onSelectionChange` | `(selecionados: Set<string>) => void` | sim | Chamado a cada mudança na seleção |

## Saída

`{ toggle(id), selectAll(ids), clear(), isSelected(id), getSelected(), destroy() }` — **não** retorna `el`: este componente não renderiza nada sozinho (nenhum checkbox próprio); ele é o estado/lógica de seleção que outros componentes (item da lista, `BulkActionBar`) consultam via `isSelected()`/`toggle()`.

## Eventos

- `onSelectionChange(selecionados)`.

## Regras de comportamento

1. Seleção permanece ativa até o operador concluir a ação ou explicitamente cancelar (`clear()`) — nunca é limpa automaticamente por um re-render de dados (ex: chegada de evento realtime), conforme princípio #9 dos 18 Princípios de UX.
2. Não sabe desenhar checkbox — a página (ou o item renderizado dentro do `ListView`) é quem decide onde e como mostrar o estado de seleção, chamando `isSelected(id)`.
3. Puramente sobre identificadores (`string`), nunca guarda referência aos objetos de item — evita estado desatualizado se os dados forem recarregados.

## Acessibilidade

Este componente não renderiza nada (ver Saída), então a responsabilidade de acessibilidade é de quem desenha o checkbox usando `isSelected()`/`toggle()`: usar `<input type="checkbox">` nativo (foco e ativação por teclado vêm de graça) em vez de uma `<div>` estilizada, e garantir `aria-label` identificando o item (ex: `aria-label="Selecionar veículo ABC-1234"`).

## Exemplo de uso

```js
import { criarSelectionController } from '../ui/selection-controller.js';

const selection = criarSelectionController({
  getItemId: (v) => v.placa,
  onSelectionChange: (ids) => bulkBar.update({ selectedCount: ids.size })
});

// no template de cada card:
`<input type="checkbox" ${selection.isSelected(v.placa) ? 'checked' : ''} data-placa="${v.placa}" />`
```
