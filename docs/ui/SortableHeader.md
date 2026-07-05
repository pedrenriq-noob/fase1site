# SortableHeader

## Objetivo

Padronizar a ordenação de listagens (item 7 dos 18 Princípios de UX). Hoje **não existe** ordenação escolhida pelo operador em nenhuma tela — listas vêm na ordem fixa definida pela query (`order('placa')`, `order('data_saida', {ascending:false})` etc.). Este componente introduz a capacidade sem forçá-la a fazer parte do `ListView` diretamente — cada critério de ordenação é um `SortableHeader` independente.

## Propriedades (config de entrada)

| Propriedade | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `label` | `string` | sim | Texto do cabeçalho (ex: `"Placa"`) |
| `sortKey` | `string` | sim | Chave usada para identificar este critério no callback |
| `active` | `boolean` | não (default `false`) | Se este é o critério ativo no momento |
| `direction` | `'asc' \| 'desc' \| null` | não | Direção atual, se `active` |
| `onSort` | `(sortKey: string, direction: 'asc'\|'desc') => void` | sim | Chamado ao clicar; alterna asc → desc → (volta a asc, nunca remove ordenação) |

## Saída

`{ el, update(novoConfig), destroy() }`.

## Eventos

- `onSort(sortKey, direction)`.

## Regras de comportamento

1. Cada instância controla um único critério — uma listagem com "ordenar por placa, categoria ou retorno previsto" usa três instâncias, não uma configuração central. Isso é a aplicação direta do princípio de composabilidade: a página decide quais critérios existem e em que ordem aparecem.
2. Não ordena os dados — só emite a intenção (`sortKey` + `direction`). A ordenação real dos dados é feita por quem consome (a página, ou o comparador que o `ListView` recebe).
3. Indicador visual (seta) reflete `active`/`direction`; nenhum outro `SortableHeader` da mesma tela deve estar `active` ao mesmo tempo — a página garante isso ao gerenciar qual `sortKey` está ativo.

## Acessibilidade

- Renderizado como `<button aria-sort="ascending|descending|none">` (o atributo `aria-sort` é o padrão ARIA para cabeçalhos ordenáveis), navegável por Tab, ativável por Enter/Espaço.
- Direção comunicada também por texto/símbolo visível, nunca só pela cor.

## Exemplo de uso

```js
import { criarSortableHeader } from '../ui/sortable-header.js';

const headerPlaca = criarSortableHeader({
  label: 'Placa', sortKey: 'placa', active: _sort.key === 'placa', direction: _sort.dir,
  onSort: (key, dir) => { _sort = { key, dir }; renderGrid(); }
});
```
