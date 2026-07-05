# StatusBadge

## Objetivo

Exibir o status de um veículo ou de uma reserva com label e cor consistentes em toda a plataforma. Hoje o mesmo conceito é montado inline em cada tela como `<span class="badge badge-${statusColor(v.status)}">${statusLabel(v.status)}</span>` (veiculos.js, veiculo-detalhe.js, dashboard.js) e sua variante de reserva (`reservaStatusColor`/`reservaStatusLabel`) em reservas.js/disponibilidade.js.

## Propriedades (config de entrada)

| Propriedade | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `status` | `string` | sim | Valor bruto do status (ex: `'DISPONIVEL'`, `'CONFIRMADO'`) |
| `tipo` | `'veiculo' \| 'reserva'` | sim | Determina qual tabela de labels/cores usar |

## Saída

`{ el, update(novoConfig), destroy() }`. `el` é um único `<span class="badge ...">`.

## Eventos

Nenhum por padrão — é apresentacional. **Não** inclui, por si só, a ação de mudar o status (isso é responsabilidade de quem compõe o badge com um menu/ação — ver princípio de composabilidade da ADR-006; misturar exibição com edição no mesmo componente violaria responsabilidade única).

## Regras de comportamento

1. Internamente delega para as funções de label/cor já existentes e testadas em `utils.js` (`statusLabel`, `statusColor`, `reservaStatusLabel`, `reservaStatusColor`) — não reimplementa o mapeamento, só padroniza o markup em volta.
2. Se `status` for desconhecido/nulo, exibe um badge neutro (`badge-gray`) com o valor bruto, nunca quebra.

## Exemplo de uso

```js
import { criarStatusBadge } from '../ui/status-badge.js';

const badge = criarStatusBadge({ status: v.status, tipo: 'veiculo' });
card.appendChild(badge.el);
```

## Nota de composabilidade

Uma ação rápida de mudança de status (ver roadmap operacional da auditoria de UX, item "ação onde o veículo aparece") deve ser um componente separado (ex: um menu/dropdown) que recebe o `StatusBadge` como parte de si, não uma propriedade `onClick` embutida no badge.
