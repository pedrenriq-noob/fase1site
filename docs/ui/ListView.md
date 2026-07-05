# ListView

## Objetivo

Contêiner enxuto que orquestra listagens. **Não implementa** pesquisa, filtro, ordenação, seleção ou ações em massa internamente — compõe [SearchBox](SearchBox.md), [FilterBar](FilterBar.md), [SortableHeader](SortableHeader.md), [SelectionController](SelectionController.md) e [BulkActionBar](BulkActionBar.md) como capacidades **opcionais e plugáveis**. Uma tela pode usar `ListView` só com `EmptyState`/`LoadingState`/`ErrorState`, sem pesquisa nem seleção, se for tudo que precisar.

Esta é a aplicação direta da regra de composabilidade da ADR-006: o erro a evitar é o `ListView` se tornar um componente grande que decide por todas as telas quais capacidades elas devem ter.

> **Correção aplicada na Architecture Validation de 2026-07-05:** a versão anterior deste contrato recebia a *instância* de `SearchBox`/`FilterBar` (`search: { instance, fields }`), o que obrigava o `ListView` a conhecer a forma interna da API desses componentes (ex: chamar `filterBar.getState()`) — um acoplamento oculto que a própria ADR-006 pede para evitar, e que além disso era assimétrico (`sort` já recebia estado primitivo, não uma instância). A versão abaixo corrige isso: `ListView` só recebe **valores primitivos**, nunca a referência de outro componente. A página é responsável por sincronizar cada evento (`onSearch`, `onFilterChange`, `onSort`) chamando `listView.update()` com o novo estado.

## Propriedades (config de entrada)

| Propriedade | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `items` | `Array<T>` | sim | Dados já carregados (busca é sempre responsabilidade da página) |
| `renderItem` | `(item: T) => string` | sim | HTML de um item da lista |
| `getItemId` | `(item: T) => string` | não | Necessário apenas se `selection` for fornecido |
| `search` | `{ termo: string, fields: (item:T)=>string[] }` | não | Se fornecido, filtra `items` cujos `fields(item)` contenham `termo` (case-insensitive) |
| `filters` | `{ estado: Record<string,string[]>, predicate: (item:T, estado) => boolean }` | não | Se fornecido, filtra `items` pelo estado de filtro atual |
| `sort` | `{ key: string, direction: 'asc'\|'desc', comparator: (a:T,b:T,key)=>number }` | não | Se fornecido, ordena `items` antes de renderizar |
| `selection` | `SelectionController` | não | Única exceção que recebe instância, não estado: `SelectionController` não tem estado serializável relevante para o `ListView` decidir renderização — o `ListView` só chama `selection.isSelected(id)` por item, sem nunca ler/depender do formato interno da seleção |
| `bulkActionBar` | `BulkActionBar` | não | Se fornecido, exibido acima/abaixo da lista |
| `emptyState` | `EmptyState` | não (default: mensagem genérica) | Exibido quando a lista filtrada está vazia |
| `loadingState` | `LoadingState` | não | Exibido enquanto `loading: true` |
| `errorState` | `ErrorState` | não | Exibido quando `errorMessage` estiver presente |
| `loading` | `boolean` | não (default `false`) | Estado de carregamento |
| `errorMessage` | `string \| null` | não | Se presente, exibe `ErrorState` no lugar da lista |

## Saída

`{ el, update(novosProps), destroy() }`. `update()` segue o contrato geral de merge raso (ver `docs/ui/README.md`): `update({ items: novaLista })` não apaga `search`/`filters`/`sort` já configurados.

## Eventos

Nenhum próprio — todos os eventos de interação (busca, filtro, ordenação, seleção, ação em massa) chegam através dos componentes que a página já instanciou. O `ListView` só decide **quando re-renderizar a lista** (ao receber `update()` com `items`, `search.termo`, `filters.estado` ou `sort` diferentes).

## Regras de comportamento

1. `ListView` nunca importa nem instancia `SearchBox`/`FilterBar`/`SortableHeader`/`BulkActionBar` — a página cria e posiciona esses componentes livremente no layout, e só repassa o estado resultante ao `ListView` via `update()`. A única exceção documentada é `SelectionController` (ver tabela acima), por não ter estado que precise ser lido pelo `ListView` além de `isSelected(id)`.
2. A ordem de aplicação é fixa e documentada para previsibilidade: filtro → busca → ordenação → paginação (quando existir).
3. Paginação (mencionada nos requisitos, não implementada nesta fase): quando adicionada, deve ser mais uma propriedade opcional (`pagination: { pageSize, onPageChange }`), seguindo o mesmo princípio de estado primitivo — nunca embutida sem opção de desligar.
4. Se `items` mudar (ex: evento realtime), `ListView.update({ items: novaLista })` reaplica filtro/busca/ordenação correntes e preserva o estado de seleção ativo (delegado ao `SelectionController`, que vive fora do `ListView` e não é recriado).

## Exemplo de uso (veiculos.js migrado)

```js
import { criarListView } from '../ui/list-view.js';
import { criarSearchBox } from '../ui/search-box.js';
import { criarFilterBar } from '../ui/filter-bar.js';

const search = criarSearchBox({
  placeholder: 'Buscar placa...',
  onSearch: (termo) => listView.update({ search: { termo, fields: (v) => [v.placa] } })
});

const filterBar = criarFilterBar({
  groups: [...],
  onFilterChange: (estado) => listView.update({
    filters: { estado, predicate: (v, e) => (!e.status?.length || e.status.includes(v.status)) }
  })
});

const listView = criarListView({
  items: _veiculos,
  renderItem: (v) => `<div class="vehicle-card" data-placa="${v.placa}">...</div>`
});
```
