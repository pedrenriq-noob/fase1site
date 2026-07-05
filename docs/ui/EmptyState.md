# EmptyState

## Objetivo

Padronizar a exibição de "nenhum resultado" — hoje reimplementado com HTML quase idêntico em `veiculos.js` e `reservas.js`, e ausente em telas como `ociosidade.js` (que usa uma variação textual simples).

## Propriedades (config de entrada)

| Propriedade | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `icon` | `string` (SVG inline) | não | Ícone ilustrativo; se omitido, não exibe ícone |
| `title` | `string` | sim | Título curto (ex: `"Nenhum veículo encontrado"`) |
| `message` | `string` | não | Mensagem de apoio (ex: `"Tente ajustar os filtros ou a busca."`) |

## Saída

`{ el, update(novoConfig), destroy() }`.

## Eventos

Nenhum — componente puramente apresentacional.

## Regras de comportamento

1. Não decide quando aparecer — quem chama (`ListView` ou a página) decide, baseado em `items.length === 0`.
2. Não tem estado próprio nem side effects.

## Exemplo de uso

```js
import { criarEmptyState } from '../ui/empty-state.js';

criarEmptyState({
  title: 'Nenhum veículo encontrado',
  message: 'Tente ajustar os filtros ou a busca.'
});
```
