# VehicleStatus (VehicleStatusService)

## Objetivo

Responsabilidade única sobre transições de status de veículo: **decidir se uma transição é válida e qual payload ela implica** — não executar a escrita em si.

Hoje esta regra está implícita e espalhada dentro de `apps/frota-ops/pages/veiculo-detalhe.js` (`updateVeiculo()` + os handlers `enviarLavador`, `marcarLimpo`, `marcarDisponivel`, `saiuLavador`, `colocarManutencao`, `sairManutencao`, `showSaidaModal`, `showRetornoModal`) e duplicada parcialmente em `apps/frota-ops/pages/reservas.js` (que grava `frota_veiculos.status` diretamente ao confirmar saída/retorno de uma reserva, sem passar por essa lógica).

## Responsabilidades

- Enumerar os status possíveis de um veículo: `DISPONIVEL`, `LOCADO`, `DEVOLVIDO`, `NO_LAVADOR`, `MANUTENCAO`.
- Para cada transição, descrever quais campos mudam junto (ex: `DEVOLVIDO→DISPONIVEL` exige `limpo: true`; `LOCADO→DEVOLVIDO` seta `limpo: false` e `patio_atual` para o ponto de retorno).
- Servir como única fonte da regra "quais transições existem e o que cada uma implica", consumida tanto por `veiculo-detalhe.js` quanto por `reservas.js`.

## Entradas

- `statusAtual: string`
- `statusDestino: string`
- `contexto?: { limpo?, patioDestino?, pontoRetorno?, horaEntradaLavador? }` — dados adicionais que a transição específica precisa

## Saídas

- `{ valido: boolean, motivo?: string, payload?: Partial<Veiculo> }` — `payload` é o que a página deve enviar ao Supabase; `motivo` explica por que uma transição foi recusada, se `valido: false`.

## O que nunca faz

- Não executa a query `UPDATE` — quem persiste é sempre a página (RB-01, serviços stateless).
- Não impõe uma sequência obrigatória entre status — princípio #11 dos 18 Princípios de UX é explícito: "o sistema não deve impor uma sequência obrigatória de transições", a responsabilidade da decisão é do operador. Este serviço apenas garante que os **campos derivados** de uma transição (ex: `limpo`) fiquem consistentes, não que uma transição seja "proibida" por ordem.
- Não conhece Supabase, RLS ou tenant — recebe e devolve dados puros.

## Casos de uso

- `veiculo-detalhe.js` usa para montar o payload de cada ação de status.
- `reservas.js` usa para colocar o veículo em `LOCADO`/`DEVOLVIDO` ao confirmar saída/retorno — eliminando a duplicação hoje existente.
- Futuro: ação rápida de status em qualquer tela que exiba veículos (Dashboard, Pátio, listagem de Veículos), reaproveitando a mesma lógica sem duplicar.

## Casos que não resolve

- Não decide disponibilidade agregada da frota (ver AvailabilityService).
- Não avalia risco de atraso (ver FleetWarningService, futuro).
