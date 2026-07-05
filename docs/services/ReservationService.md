# ReservationService — Contrato Técnico

Ver [docs/domain/ReservationService.md](../domain/ReservationService.md) para objetivo e responsabilidades.

**Status:** ainda não implementado — depende de [VehicleStatusService](VehicleStatusService.md) estar pronto e testado primeiro (ver dependência registrada na arquitetura aprovada).

## Assinatura proposta

```
descreverTransicaoReserva(
  reserva: Reserva,
  statusDestino: ReservaStatusValue,
  contexto?: { placa?: string }
): TransicaoReservaResult
```

## Tipos

```ts
type ReservaStatusValue = 'PREVISTO' | 'CONFIRMADO' | 'CONCLUIDO' | 'CANCELADO'

type TransicaoReservaResult =
  | { valido: true, payloadReserva: Partial<Reserva>, payloadVeiculo?: { placa: string, payload: Partial<Veiculo> } }
  | { valido: false, motivo: string }
```

## Comportamento a garantir (extraído do código atual de `reservas.js`)

| Transição | payloadReserva | payloadVeiculo (via VehicleStatusService) |
|---|---|---|
| `PREVISTO → CONFIRMADO` | `{ status: 'CONFIRMADO', placa_atribuida: placa }` (recusa se `placa` ausente) | transição `DISPONIVEL → LOCADO` do veículo `placa` |
| `CONFIRMADO → CONCLUIDO` | `{ status: 'CONCLUIDO' }` | transição `LOCADO → DEVOLVIDO` do veículo `placa_atribuida`, se houver |
| `PREVISTO/CONFIRMADO → CANCELADO` | `{ status: 'CANCELADO' }` | **nenhum, sempre** (decisão confirmada com o Product Owner em 2026-07-05) — cancelar uma reserva `CONFIRMADO` (veículo `LOCADO`) não libera o veículo automaticamente. O veículo pode já estar fisicamente com o cliente; a decisão sobre o que fazer com ele é do operador, feita separadamente em `veiculo-detalhe.js`. |

- A validação de transição de status em si (quais estados existem, quais sequências são permitidas) deve reutilizar `apps/intake-admin/shared/locacao-status.js` como fonte — este serviço não redefine essa tabela-verdade, só adiciona o efeito colateral sobre o veículo.

## Testes a criar

`tests/reservation-service.test.js`, cobrindo as transições acima, incluindo o caso "não confirma sem placa" e o caso "cancelar CONFIRMADO não gera payloadVeiculo".
