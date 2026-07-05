# Modal

## Objetivo

Diálogo modal genérico para formulários e confirmações. Substitui as três implementações duplicadas de `createModal` hoje existentes em `veiculo-detalhe.js`, `reservas.js` e `admin.js`.

## Propriedades (config de entrada)

| Propriedade | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `title` | `string` | sim | Título exibido no cabeçalho |
| `bodyHtml` | `string` \| `() => string` | sim | Conteúdo HTML do corpo (string estática ou função para conteúdo dinâmico) |
| `onConfirm` | `() => Promise<boolean \| void>` | sim | Executado ao clicar em confirmar. Retornar `false` mantém o modal aberto (ex: falha de validação); qualquer outro retorno fecha o modal |
| `confirmLabel` | `string` | não (default `"Confirmar"`) | Texto do botão de confirmação |
| `cancelLabel` | `string` | não (default `"Cancelar"`) | Texto do botão de cancelamento |

## Saída

`{ el, update(novoConfig), destroy() }` — `el` já vem anexado ao `document.body` na criação (mantém o comportamento atual de overlay fixo).

## Eventos

- `onConfirm` (via config, ver acima).
- `onClose` (opcional, config) — chamado ao fechar por qualquer via (X, clique fora, Cancelar, ou confirmação bem-sucedida).

## Regras de comportamento

1. Fecha ao clicar no botão de fechar (X), no botão Cancelar, ou fora do conteúdo do modal (clique no overlay).
2. Durante a execução de `onConfirm`, o botão de confirmação fica desabilitado com indicador de carregamento (`btn-loading`) — replica o comportamento já existente hoje.
3. Se `onConfirm` lançar uma exceção, o modal permanece aberto e exibe um erro genérico (via `showToast`, que já existe em `utils.js`) — não deve fechar silenciosamente em caso de falha.
4. Não faz fetch, não conhece Supabase, não sabe o que `onConfirm` faz — é puramente um contêiner de interação.

## Acessibilidade

- Contêiner com `role="dialog"` e `aria-modal="true"`, `aria-label` igual ao `title`.
- Foco move automaticamente para o primeiro campo/controle focável do corpo ao abrir; retorna ao elemento que abriu o modal ao fechar.
- Tecla `Esc` fecha o modal (equivalente a clicar no X), a menos que uma ação esteja em execução (`onConfirm` pendente) — nesse caso `Esc` é ignorado, para não fechar no meio de uma escrita em andamento.
- Foco preso dentro do modal (focus trap): `Tab`/`Shift+Tab` circulam apenas entre os elementos focáveis do modal, nunca vazam para o conteúdo por trás do overlay.

## Exemplo de uso

```js
import { criarModal } from '../ui/modal.js';

criarModal({
  title: 'Registrar Retorno',
  bodyHtml: `<input class="form-input" type="datetime-local" id="ret-dt" />`,
  onConfirm: async () => {
    const dt = document.getElementById('ret-dt').value;
    if (!dt) { showToast('Informe a data.', 'warning'); return false; }
    await vehicleStatusService.registrarRetorno(placa, dt);
    return true;
  }
});
```
