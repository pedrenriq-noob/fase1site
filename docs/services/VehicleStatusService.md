# VehicleStatusService — Contrato Técnico

Ver [docs/domain/VehicleStatus.md](../domain/VehicleStatus.md) para objetivo e responsabilidades.

**Status:** ainda não implementado — este contrato é a especificação a validar antes da extração de `veiculo-detalhe.js`.

## Assinatura proposta

```
descreverTransicao(
  statusAtual: VehicleStatusValue,
  statusDestino: VehicleStatusValue,
  contexto?: { limpo?: boolean, patioDestino?: string, pontoRetorno?: string, horaEntradaLavador?: string }
): TransicaoResult
```

## Tipos

```ts
type VehicleStatusValue = 'DISPONIVEL' | 'LOCADO' | 'DEVOLVIDO' | 'NO_LAVADOR' | 'MANUTENCAO'

type TransicaoResult =
  | { valido: true, payload: Partial<Veiculo> }
  | { valido: false, motivo: string }
```

## Comportamento a garantir (extraído do código atual de `veiculo-detalhe.js`)

| Transição | Payload esperado |
|---|---|
| `LOCADO → DEVOLVIDO` | `{ status: 'DEVOLVIDO', limpo: false, patio_atual: pontoRetorno, ponto_retorno: pontoRetorno }` |
| `DEVOLVIDO → NO_LAVADOR` | `{ status: 'NO_LAVADOR', hora_entrada_lavador: agora, patio_atual: 'Lavador' }` |
| `DEVOLVIDO → DISPONIVEL` (marcar limpo direto) | `{ status: 'DISPONIVEL', limpo: true }` |
| `NO_LAVADOR → DISPONIVEL` | `{ status: 'DISPONIVEL', limpo: true, patio_atual: patioAtual === 'Lavador' ? 'Garagem' : patioAtual }` |
| `DISPONIVEL → LOCADO` | `{ status: 'LOCADO', limpo: true, patio_atual: null, ponto_retirada, ponto_retorno, prev_retorno }` |
| `qualquer → MANUTENCAO` | `{ status: 'MANUTENCAO' }` |
| `MANUTENCAO → DISPONIVEL` | `{ status: 'DISPONIVEL', limpo: true }` |

- Nenhuma transição é recusada por "sequência errada" — princípio #11 dos 18 Princípios de UX. `valido: false` só deve ocorrer por dado ausente/inválido no `contexto` exigido pela transição (ex: mover para `LOCADO` sem `ponto_retirada`), nunca por "veículo estava em X, não pode ir direto para Y".
- `updated_at`/`updated_by` são responsabilidade da página (dependem de sessão/timestamp no momento da escrita), não do serviço.

## Testes a criar

`tests/vehicle-status.test.js` — uma tabela-verdade cobrindo todas as transições da tabela acima, no mesmo padrão de `tests/locacao-status.test.js`, antes de qualquer página passar a depender deste serviço.
