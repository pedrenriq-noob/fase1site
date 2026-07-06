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
- `contexto?: { patioAtual?, pontoRetirada?, pontoRetorno?, prevRetorno?, horaEntradaLavador? }` — dados adicionais que a transição específica precisa. Ver `docs/services/VehicleStatusService.md` para quais campos são obrigatórios em qual transição.

## Saídas

- `{ valido: boolean, motivo?: string, payload?: Partial<Veiculo> }` — `payload` é o que a página deve enviar ao Supabase; `motivo` explica por que uma transição foi recusada, se `valido: false`.

## O que nunca faz

- Não executa a query `UPDATE` — quem persiste é sempre a página (RB-01, serviços stateless).
- Não gera timestamps internamente (`horaEntradaLavador` sempre vem de `contexto`, fornecido por quem chama) — mantém o serviço puro e determinístico, testável sem mockar relógio.
- Não conhece Supabase, RLS ou tenant — recebe e devolve dados puros.

## Decisão de domínio (revisada em 2026-07-05 — substitui a redação anterior deste documento)

**Somente as transições documentadas em `docs/services/VehicleStatusService.md` são consideradas válidas.** Qualquer par (`statusAtual`, `statusDestino`) fora dessa lista retorna `valido: false`. Esta é uma decisão deliberada do Product Owner: `VehicleStatusService` representa o **fluxo operacional oficial** da locadora, não um mecanismo permissivo genérico.

Isso ajusta a leitura do princípio #11 dos 18 Princípios de UX ("o sistema não deve impor uma sequência obrigatória de transições") especificamente para este serviço: o princípio continua valendo para a **interface** (nenhuma tela deve esconder uma ação de status atrás de múltiplos cliques ou telas por causa de uma suposta ordem) — mas o **serviço de domínio** é a fonte de verdade de quais transições existem de fato na operação. Se uma necessidade operacional real exigir contornar o fluxo oficial (ex: correção administrativa de um estado inconsistente), isso deve ocorrer por um mecanismo explícito e separado (ex: uma ação administrativa dedicada), nunca como comportamento padrão deste serviço.

**Mecanismo de bypass efetivamente adotado (2026-07-06, ver ADR-011):** as ações em lote de `veiculos.js` (Camada 5 do Fase 1B) gravam `status`/`limpo` diretamente no Supabase, sem passar por `descreverTransicao` — é exatamente o "mecanismo explícito e separado" previsto no parágrafo acima, não uma reversão desta decisão de domínio. O fluxo item a item (`veiculo-detalhe.js`, `reservas.js`) continua exclusivamente sob a autoridade deste serviço; só a ação em lote administrativa tem esse atalho, e é declaradamente temporária (ver ADR-011 para o gatilho de reversão).

Ver `docs/domain/CicloVidaVeiculo.md` para a referência funcional do fluxo oficial.

## Casos de uso

- `veiculo-detalhe.js` usa para montar o payload de cada ação de status.
- `reservas.js` usa para colocar o veículo em `LOCADO`/`DEVOLVIDO` ao confirmar saída/retorno — eliminando a duplicação hoje existente.
- Futuro: ação rápida de status em qualquer tela que exiba veículos (Dashboard, Pátio, listagem de Veículos), reaproveitando a mesma lógica sem duplicar.

## Casos que não resolve

- Não decide disponibilidade agregada da frota (ver AvailabilityService).
- Não avalia risco de atraso (ver FleetWarningService, futuro).
