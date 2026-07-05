# ConfirmationDialog

## Objetivo

Padronizar confirmações de ação (hoje feitas com `confirm()` nativo do navegador em `veiculo-detalhe.js`, `reservas.js` e `admin.js`), mantendo consistência visual com o resto da aplicação.

É um caso de uso específico de [Modal](Modal.md) — não uma implementação paralela.

## Propriedades (config de entrada)

| Propriedade | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `message` | `string` | sim | Pergunta de confirmação (ex: `"Cancelar a locação LOC-2024-001?"`) |
| `onConfirm` | `() => Promise<void> \| void` | sim | Executado se o usuário confirmar |
| `tone` | `'default' \| 'danger'` | não (default `'default'`) | `'danger'` estiliza o botão de confirmação em vermelho (ações destrutivas: cancelar, remover) |

## Saída

`{ el, destroy() }`.

## Eventos

- `onConfirm`.
- `onCancel` (opcional, config).

## Regras de comportamento

1. Implementado internamente como um `Modal` sem corpo de formulário, só a mensagem e os dois botões — reaproveita o mesmo mecanismo de loading/erro do Modal.
2. `tone: 'danger'` é a única diferença visual em relação ao Modal padrão.
3. Mudança de comportamento visível ao usuário em relação ao estado atual: substitui o popup nativo do navegador por um modal da aplicação — sinalizado como risco na proposta de arquitetura aprovada, não é uma mudança silenciosa.

## Acessibilidade

Herda integralmente o contrato de acessibilidade do [Modal](Modal.md) (`role="dialog"`, foco automático, `Esc` para cancelar, focus trap) — não redefine nada, por ser implementado como um caso de uso do Modal.

## Exemplo de uso

```js
import { criarConfirmationDialog } from '../ui/confirmation-dialog.js';

criarConfirmationDialog({
  message: `Cancelar a locação ${r.locacao_numero}?`,
  tone: 'danger',
  onConfirm: async () => {
    await reservationService.cancelar(r.id);
    showToast('Reserva cancelada.', 'info');
  }
});
```
