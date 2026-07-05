# Contratos de Serviços

Esta pasta documenta o **contrato técnico** (assinatura, entrada, saída, comportamento) de cada serviço de domínio. Para o *porquê* de cada serviço existir, ver [docs/domain/](../domain/).

Regra permanente (ADR-006): serviços são funções puras — recebem dados, devolvem resultado, nunca tocam `document`, `fetch`/`supabase`, ou qualquer estado global. Quem busca e persiste dados é sempre a página que consome o serviço.

| Serviço | Contrato | Domínio |
|---|---|---|
| AvailabilityService | [AvailabilityService.md](AvailabilityService.md) | [docs/domain/AvailabilityService.md](../domain/AvailabilityService.md) |
| IdleWindowService | [IdleWindowService.md](IdleWindowService.md) | [docs/domain/IdleWindowService.md](../domain/IdleWindowService.md) |
| VehicleStatusService | [VehicleStatusService.md](VehicleStatusService.md) | [docs/domain/VehicleStatus.md](../domain/VehicleStatus.md) |
| ReservationService | [ReservationService.md](ReservationService.md) | [docs/domain/ReservationService.md](../domain/ReservationService.md) |
