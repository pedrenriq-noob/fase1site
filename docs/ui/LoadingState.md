# LoadingState

## Objetivo

Padronizar o indicador de carregamento — hoje repetido como `<div class="loading-screen"...><div class="spinner"></div></div>` em praticamente toda tela (`dashboard.js`, `veiculos.js`, `veiculo-detalhe.js`, `patio.js`, `disponibilidade.js`, `ociosidade.js`, `reservas.js`).

## Propriedades (config de entrada)

| Propriedade | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `minHeight` | `string` (valor CSS) | não (default `'20vh'`) | Altura mínima da área de loading, para evitar salto de layout |

## Saída

`{ el, destroy() }`.

## Eventos

Nenhum.

## Regras de comportamento

1. Puramente apresentacional — não sabe o que está carregando nem por quanto tempo.
2. Substituir o padrão `<div class="loading-screen">` inline por este componente não muda o CSS/visual existente — só centraliza o markup.

## Exemplo de uso

```js
import { criarLoadingState } from '../ui/loading-state.js';

container.appendChild(criarLoadingState({ minHeight: '40vh' }).el);
```
