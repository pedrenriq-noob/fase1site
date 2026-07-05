# FilterBar

## Objetivo

Padronizar filtros simples e combináveis. Substitui dois padrões divergentes hoje existentes: os "filter chips" de `veiculos.js` (status e categoria, cada um single-select, sem combinação real de UI embora o efeito seja combinado no filtro) e as "tabs" de `reservas.js` (status, single-select).

## Propriedades (config de entrada)

| Propriedade | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `groups` | `Array<{ key: string, label: string, options: Array<{value, label}>, multi?: boolean }>` | sim | Um grupo de filtro por critério (ex: status, categoria, pátio). `multi: true` permite múltiplas opções ativas dentro do mesmo grupo |
| `onFilterChange` | `(estado: Record<string, string[]>) => void` | sim | Chamado a cada mudança, com o estado completo de todos os grupos (`{ status: ['DISPONIVEL'], categoria: ['C'] }`). Renomeado de `onChange` na Architecture Validation de 2026-07-05 para seguir a convenção `on<Evento>` específico do domínio, consistente com `onSearch`/`onSort` |

## Saída

`{ el, update(novoConfig), reset(), getState(), destroy() }`.

### Garantias de `update({ groups })` (adicionado na revisão de contrato de 2026-07-05, antes de qualquer implementação existir)

`FilterBar` tem natureza diferente de componentes com config estática (ex: `SearchBox`): `groups`/`options` representam um estado derivado de dados que evoluem continuamente durante o uso (contagens mudam a cada busca, evento realtime, importação). Por isso `update()` é obrigatório aqui, com estas garantias explícitas:

1. **Atualiza apenas os dados dinâmicos** (rótulos e contagens de `options`) — nunca reconstrói o componente inteiro internamente como estratégia de atualização.
2. **Preserva integralmente a seleção ativa** de cada grupo — reaplicar `update()` não limpa o que o operador já tinha marcado.
3. **Remove uma seleção automaticamente apenas se a opção correspondente deixar de existir** em `groups` no novo `update()` — nesse caso, ela realmente deixou de ser válida, e `onFilterChange` é chamado refletindo a remoção.
4. **Preserva o foco do usuário quando possível** — se o operador estiver com foco em um botão de opção no momento do `update()`, e essa opção continuar existindo, o foco permanece nela (não pula para o início do componente).
5. **Não recria listeners desnecessariamente** — apenas os botões de opção que mudaram de rótulo/contagem/presença têm seu DOM tocado; botões inalterados mantêm o mesmo nó e o mesmo listener.

## Eventos

- `onFilterChange(estado)`.

## Regras de comportamento

1. Grupos são combinados com E lógico entre si (categoria C **e** status Sujo), e dentro do mesmo grupo com OU lógico se `multi: true`.
2. Cada grupo exibe contagem por opção quando a página fornecer `options` já com contagens pré-calculadas (mesmo padrão visual do `chip-count` hoje existente em `veiculos.js`) — o componente não calcula contagens sozinho, pois isso exigiria conhecer os dados de domínio.
3. Não sabe filtrar a lista — só emite o estado dos filtros selecionados; quem aplica o filtro aos dados é a página (ou o `ListView`, que recebe esse estado já pronto — ver `ListView.md`).
4. Layout visual único para todos os grupos — elimina a divergência chips-vs-tabs.

## Acessibilidade

- Cada grupo é um `role="group"` com `aria-label` igual ao `label` do grupo (mesmo padrão já usado em `veiculos.js` hoje, `role="group" aria-label="Filtro por status"`).
- Cada opção é um `<button aria-pressed="true|false">`, navegável por Tab, ativável com Enter/Espaço.
- Estado ativo comunicado via `aria-pressed`, não apenas por cor (contraste mínimo WCAG AA).

## Exemplo de uso

```js
import { criarFilterBar } from '../ui/filter-bar.js';

const filterBar = criarFilterBar({
  groups: [
    { key: 'status', label: 'Status', options: STATUS_FILTERS },
    { key: 'categoria', label: 'Categoria', options: catOptions }
  ],
  onFilterChange: (estado) => { _filtros = estado; renderGrid(); }
});
```
