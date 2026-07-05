# SearchBox

## Objetivo

Padronizar a busca em tempo real — hoje existe apenas em `veiculos.js` (busca por placa). Este componente generaliza o padrão para qualquer tela (reservas por cliente/nº locação, admin por placa/modelo etc.).

## Propriedades (config de entrada)

| Propriedade | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `placeholder` | `string` | não (default `'Buscar...'`) | Texto de placeholder |
| `debounceMs` | `number` | não (default `150`) | Atraso antes de disparar `onSearch`, para não filtrar a cada tecla em listas grandes |
| `onSearch` | `(termo: string) => void` | sim | Chamado a cada mudança (após debounce) com o termo em minúsculas já `trim()`-ado |

## Saída

`{ el, clear(), destroy() }`. `clear()` limpa o campo e dispara `onSearch('')`. `destroy()` cancela o timer de debounce pendente, se houver, além das garantias mínimas gerais (ver `docs/ui/README.md`) — é o componente do Design System com maior risco de vazar um timer se essa garantia não for respeitada.

**Sem `update()`, deliberadamente** (ver regra "Quando um componente precisa de `update()`" em `docs/ui/README.md`): toda a config (`placeholder`, `debounceMs`, `onSearch`) é estática — nenhuma delas representa um dado que evolui durante o uso. Não há nada para um `update()` refletir.

## Eventos

- `onSearch(termo)`.

## Regras de comportamento

1. Não sabe em quais campos buscar nem como comparar — só emite o termo digitado. A lógica de "quais campos" (placa, cliente, nº locação) é responsabilidade de quem consome (a página ou o `ListView`), mantendo o componente independente de domínio.
2. Não faz fetch — a busca é sempre client-side sobre dados já carregados (mesmo padrão de hoje em `veiculos.js`), a menos que a página decida diferente.
3. Ícone de lupa e estilo replicam exatamente o `.search-wrapper`/`.search-input` já existentes em CSS — não introduz uma variante visual nova.

## Acessibilidade

- `<input type="search">` com `aria-label` (usa `placeholder` como fallback se nenhum for fornecido) — não depende só do placeholder para ser identificável por leitor de tela.
- Tecla `Esc` limpa o campo (equivalente a chamar `clear()`), sem submeter nenhum formulário.

## Exemplo de uso

```js
import { criarSearchBox } from '../ui/search-box.js';

const search = criarSearchBox({
  placeholder: 'Buscar placa...',
  onSearch: (termo) => { _search = termo; renderGrid(); }
});
container.appendChild(search.el);
```
