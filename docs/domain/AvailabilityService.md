# AvailabilityService

## Objetivo

Responder: **"Existe disponibilidade para esta categoria neste período?"**

## Responsabilidades

- Calcular quantos veículos de uma categoria estão disponíveis para um intervalo `[início, fim)`.
- Detectar overbooking (mais reservas ativas que veículos existentes na categoria, no período).
- Sinalizar alertas de estoque baixo (`ultimo_veiculo`) e ausência de dados (`sem_veiculos`, quando não há frota cadastrada na categoria).
- Detalhar, por veículo (quando há frota cadastrada), se está disponível e por quê.

## Entradas

- `categoria: string`
- `inicio: Date`, `fim: Date`
- `veiculos: Array<{ placa, modelo, categoria, ... }>` — frota da categoria
- `reservas: Array<{ data_saida, data_retorno_prev, status, ... }>` — reservas ativas (`PREVISTO`/`CONFIRMADO`) da categoria

## Saídas

`{ disponivel: number, total: number, detalhes: Array<{placa, modelo, disponivel, motivo}>, overbooking: boolean, overbooking_qtd: number, alerta: 'sem_veiculos'|'ultimo_veiculo'|null, reservas_conflito: Array<ReservaConflito> }`

## O que nunca faz

- Não calcula ociosidade nem oportunidades de locação curta (isso é [IdleWindowService](IdleWindowService.md)).
- Não avalia risco operacional nem contratos que merecem atenção (isso é [FleetWarningService](FleetWarningService.md), futuro).
- Não aplica buffer operacional (tempo pós-devolução) — decisão permanente (ADR-003, revisão 2026-07-01).
- Não atribui veículo individual a uma reserva — modelo é de pool por categoria.
- Não persiste nada, não cria/altera reservas.

## Casos de uso

- Central de Reservas verifica se pode confirmar uma nova reserva sem estourar a frota.
- Simulação antes de confirmar uma mudança de status de reserva para `CONFIRMADO` (usado em `intake-admin/pages/reservas.js`).
- Tela `/disponibilidade` do frota-ops (consulta pontual).

## Casos que não resolve

- "Quando este veículo específico estará livre?" — não modela veículo individual.
- "Existe oportunidade de locação curta antes da próxima reserva?" — ver IdleWindowService.
- "Quais contratos têm risco de atraso?" — ver FleetWarningService (futuro).

## Implementação

- `supabase/functions/_shared/disponibilidade.ts` (Deno, consumido pela Edge Function `check-disponibilidade` — atende o site público sem RLS).
- `apps/frota-ops/js/services/availability.js` (JS, cópia física mantida em paridade via `tests/disponibilidade.test.js` — consumido pelo frota-ops, autenticado via RLS).

Duas implementações são necessárias aqui (diferente do IdleWindowService) porque os dois consumidores têm modelos de autorização diferentes: site público sem RLS precisa de Edge Function com `service_role`; frota-ops já é autenticado e lê direto via RLS.
