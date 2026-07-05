# ReservationService

## Objetivo

Responsabilidade única sobre transições de status de reserva: **decidir se uma transição é válida e o que ela implica** — incluindo o efeito colateral sobre o veículo associado (delegado ao [VehicleStatus](VehicleStatus.md), nunca reimplementado aqui).

Hoje esta regra está implícita dentro de `apps/frota-ops/pages/reservas.js` (`showConfirmarSaidaModal`, `confirmarRetorno`, `cancelarReserva`), e é o ponto onde a duplicação com `VehicleStatusService` acontece atualmente (linhas que gravam `frota_veiculos` diretamente).

## Responsabilidades

- Enumerar os status de reserva: `PREVISTO`, `CONFIRMADO`, `CONCLUIDO`, `CANCELADO` (mesma máquina de estados já formalizada em `apps/intake-admin/shared/locacao-status.js`/`fn_validar_transicao_status` — este serviço no frota-ops deve **reutilizar essa fonte**, não redefinir a tabela-verdade).
- Para `PREVISTO→CONFIRMADO`: validar que uma placa foi informada, retornar o payload de veículo (`LOCADO`) via VehicleStatus.
- Para `CONFIRMADO→CONCLUIDO`: retornar o payload de veículo (`DEVOLVIDO`) via VehicleStatus, se houver `placa_atribuida`.
- Para qualquer→`CANCELADO`: sem efeito sobre veículo (a menos que já esteja `LOCADO`, caso a definir com o Product Owner antes de implementar).

## Entradas

- `reserva: { id, status, placa_atribuida, data_saida, data_retorno_prev, ... }`
- `statusDestino: string`
- `contexto?: { placa? }` — necessário para `PREVISTO→CONFIRMADO`

## Saídas

- `{ valido: boolean, motivo?: string, payloadReserva: Partial<Reserva>, payloadVeiculo?: { placa, ...via VehicleStatus } }`

## O que nunca faz

- Não executa nenhuma escrita — a página persiste `payloadReserva` e `payloadVeiculo` (se houver) em duas chamadas, ou a página decide se agrupa numa transação/RPC futura.
- Não decide a transição de veículo por conta própria — sempre delega ao VehicleStatus, para não recriar a duplicação que motivou a extração deste serviço.
- Não simula disponibilidade (isso é o fluxo de `intake-admin/pages/reservas.js`, que já chama a Edge Function `check-disponibilidade` separadamente).

## Casos de uso

- `reservas.js` do frota-ops usa para confirmar saída/retorno/cancelamento sem duplicar a lógica de veículo.

## Casos que não resolve

- Não avalia se confirmar a reserva vai gerar overbooking (isso é responsabilidade da tela, chamando AvailabilityService/simulação, como já ocorre no intake-admin).
- Não é uma segunda implementação da máquina de estados de locação já existente em `locacao-status.js` — deve importar/reutilizar essa fonte.
