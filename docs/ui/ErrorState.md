# ErrorState

## Objetivo

Padronizar a exibição de erro de carregamento — hoje repetido inline como `<div class="alert alert-error">Erro ao carregar X.</div>` em toda tela (`dashboard.js`, `veiculos.js`, `patio.js`, `reservas.js` etc.), cada uma com sua própria mensagem sem estrutura comum.

Mantido deliberadamente simples (decisão do Product Owner, 2026-07-05): **não conhece retry**. Representar o estado de erro é sua única responsabilidade. Se uma tela quiser oferecer atualização, o botão fica na própria página (a maioria já tem um botão "Atualizar" no cabeçalho, ex: `dashboard.js`, `patio.js`) — não é reimplementado aqui.

## Propriedades (config de entrada)

| Propriedade | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `message` | `string` | sim | Mensagem de erro (ex: `"Erro ao carregar veículos."`) |

## Saída

`{ el, update(novoConfig), destroy() }`.

## Eventos

Nenhum — sem retry, sem interação. Puramente apresentacional, no mesmo espírito de `EmptyState`/`LoadingState`.

## Regras de comportamento

1. Não decide quando aparecer — quem chama decide, a partir do resultado de uma chamada de dados que falhou.
2. Não tenta novamente sozinho, não tem timer, não reexecuta a busca.
3. Reaproveita a classe CSS `.alert.alert-error` já existente — não introduz um estilo visual novo.

## Acessibilidade

- `role="alert"` no elemento raiz, para leitores de tela anunciarem o erro automaticamente ao aparecer (sem exigir foco manual do usuário).

## Exemplo de uso

```js
import { criarErrorState } from '../ui/error-state.js';

if (error) {
  content.innerHTML = '';
  content.appendChild(criarErrorState({ message: 'Erro ao carregar veículos.' }).el);
}
```
