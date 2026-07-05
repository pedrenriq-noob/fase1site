# SelectionController

## Objetivo

Padronizar a seleção múltipla de itens de uma lista (item 9 dos 18 Princípios de UX). Hoje **não existe** em nenhuma tela. Isolado como capacidade própria (não embutida no `ListView`) para poder ser usado também fora de listagens, se necessário no futuro (ex: seleção em um grid de cards).

## Propriedades (config de entrada)

| Propriedade | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `onSelectionChange` | `(selecionados: Set<string>) => void` | sim | Chamado a cada mudança na seleção |

Config puramente estática (`onSelectionChange` não muda depois de criado) — **sem `update()`**, deliberadamente (ver regra "Quando um componente precisa de `update()`" em `docs/ui/README.md`).

**Revisão de contrato de 2026-07-05 (antes de qualquer implementação):** a versão anterior deste contrato incluía `getItemId: (item) => string` como propriedade obrigatória, mas nenhum método da Saída jamais a invoca — toda a API opera diretamente sobre `string` ids, nunca sobre objetos de item. Era uma prop recebida e nunca usada internamente. Removida agora, para não introduzir uma abstração prematura (um método de conveniência tipo `toggleItem(item)` que a consumisse não existe ainda). Se a necessidade real aparecer quando este componente for adotado por uma tela (Camada 4), `getItemId` volta junto com o método que efetivamente a use.

## Saída

`{ toggle(id), selectAll(ids), clear(), isSelected(id), getSelected(), destroy() }` — **não** retorna `el`: este componente não renderiza nada sozinho (nenhum checkbox próprio); ele é o estado/lógica de seleção que outros componentes (item da lista, `BulkActionBar`) consultam via `isSelected()`/`toggle()`.

`toggle()`, `selectAll()` e `clear()` **sempre** disparam `onSelectionChange(selecionados)` quando efetivamente mudam o conteúdo da seleção (chamar `clear()` com a seleção já vazia não dispara o evento novamente).

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
  onSelectionChange: (ids) => bulkBar.update({ selectedCount: ids.size })
});

// a página extrai o id do item (ex: v.placa) antes de consultar/alterar a seleção —
// SelectionController nunca vê o objeto `v`, só a string.
// no template de cada card:
`<input type="checkbox" ${selection.isSelected(v.placa) ? 'checked' : ''} data-placa="${v.placa}" />`

// no handler de clique do checkbox:
checkbox.addEventListener('change', () => selection.toggle(v.placa));
```
