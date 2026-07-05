# FleetWarningService (futuro — não implementar sem instrução explícita)

## Objetivo

Responder: **"Onde existem riscos operacionais?"** — quais contratos merecem atenção, onde ocorrerá overbooking, quais veículos estão em situação anômala (ex: atraso de retorno).

## Responsabilidades (previstas, sujeitas a especificação futura)

- Sinalizar contratos com risco de atraso (retorno previsto ultrapassado sem devolução registrada).
- Sinalizar overbooking previsto além do já detectado pontualmente pelo AvailabilityService (visão agregada/proativa, não sob demanda).
- Sinalizar veículos parados há muito tempo em um mesmo status (ex: manutenção prolongada).

## O que nunca fará

- Não altera disponibilidade, ociosidade, nem status de veículo/reserva — é somente leitura e sinalização, como os demais serviços de domínio.
- Não substitui o AvailabilityService nem o IdleWindowService — é o terceiro serviço do princípio arquitetural de 3 serviços do i-Frotas (ver [ADR-003](../adr/ADR-003-algoritmo-disponibilidade-por-pool.md) e a diretriz "Princípio Arquitetural do i-Frotas" registrada em memória de projeto).

## Status

Não iniciado. Este documento existe apenas para reservar o espaço conceitual e de diretório (`docs/domain/FleetWarningService.md`, `js/services/fleet-warning.js` quando criado) — nenhuma implementação deve começar sem instrução explícita do Product Owner, incluindo os critérios de aceite específicos (que ainda não foram definidos, diferente do IdleWindowService).
