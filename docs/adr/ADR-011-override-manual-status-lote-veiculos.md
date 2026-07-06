# ADR-011 — Override manual de status em lote em `veiculos.js`

**Data:** 2026-07-06
**Status:** Aceito (temporário, com gatilho de reversão explícito)
**Contexto:** `apps/frota-ops/pages/veiculos.js` (Camada 5 do Fase 1B), `apps/frota-ops/js/services/vehicle-status.js`, `docs/domain/VehicleStatus.md`

---

## Contexto

Na Camada 3 da Fase 1B, `VehicleStatusService.descreverTransicao` foi desenhado como **única autoridade** para mudança de status de veículo, com uma decisão de domínio explícita: só as 7 transições documentadas em `docs/services/VehicleStatusService.md` são válidas — qualquer outro par (`statusAtual`, `statusDestino`) é recusado (`valido:false`), *deny-by-default*. Essa mesma decisão já previa a possibilidade de bypass: *"Caso futuramente exista necessidade operacional de ignorar esse fluxo, isso deverá ocorrer por outro mecanismo... nunca como comportamento padrão do serviço"* (`docs/domain/VehicleStatus.md`).

Na primeira entrega de "status em lote" (Camada 5, 2026-07-06), a ação em massa foi implementada respeitando essa autoridade: só as 2 transições sem contexto obrigatório (`*→MANUTENCAO`, `MANUTENCAO→DISPONIVEL`) foram expostas como ações de `BulkActionBar`.

O Product Owner, na sequência, pediu explicitamente a reversão desse escopo: **todos** os status devem poder ser definidos em lote, para qualquer veículo selecionado, sem seguir a sequência/validação de `VehicleStatusService` — incluindo marcar `limpo`/`sujo` em lote (campo que hoje só é definido como efeito colateral de transições do serviço, nunca diretamente). Justificativa dada: o sistema atual opera como "quebra-galho" de um sistema oficial que ainda não gera eventos de devolução/retirada/lavagem individualmente; o operador precisa poder corrigir/definir o status real dos veículos manualmente, em lote, para o mapa de disponibilidade refletir a realidade.

## Decisão

`veiculos.js` ganha um mecanismo de escrita direta de `status`/`limpo`, via `BulkActionBar`, que **não** passa por `VehicleStatusService.descreverTransicao` — grava o campo solicitado diretamente no Supabase (`UPDATE frota_veiculos SET status = X` ou `SET limpo = Y`), sem checar se a transição a partir do status atual está na lista de transições documentadas.

Isto é exatamente o "outro mecanismo" que `docs/domain/VehicleStatus.md` já prometia como única forma aceitável de contornar o *deny-by-default* — a decisão de Camada 3 não foi revertida (o fluxo operacional normal, item a item, continua exclusivamente sob `VehicleStatusService`); foi criado um caminho paralelo, explícito e documentado, só para a ação em lote administrativa.

## Consequências

- **Positivo:** operador consegue corrigir rapidamente o mapa de disponibilidade sem depender de eventos individuais que o sistema oficial ainda não gera — resolve uma necessidade operacional real e atual.
- **Negativo/risco assumido:** o override não valida nada — é possível, por exemplo, marcar em lote um veículo `LOCADO` como `DISPONIVEL` sem de fato ele ter sido devolvido, ou marcar `limpo:true` sem lavagem real ter ocorrido. Não há proteção de domínio contra erro operacional nesta via — a responsabilidade pela correção do dado passa a ser inteiramente do operador que aciona a ação em lote.
- Duas fontes de verdade para "como o status muda" passam a coexistir: o fluxo automático/guiado (`VehicleStatusService`, usado item a item quando existir) e o override manual em lote (usado hoje como principal, dado que a maioria dos eventos ainda chega via importação/CSV, não via ações individuais na UI).

## Gatilho para revisitar/reverter

Esta ADR deve ser revisitada — reduzindo ou removendo o override em lote — quando (palavras do Product Owner): *"futuramente ele não será mais quebra-galho e fará parte de um SaaS, e aí sim, alteração de status em lote não fará sentido... as mudanças serão feitas uma a uma à medida que ocorrerem devoluções, retiradas, lavagem entre outros eventos."* Ou seja: quando o sistema deixar de depender de importação em lote de um sistema legado e passar a registrar cada evento operacional individualmente pela própria aplicação.

## Alternativas consideradas

- **Manter o escopo restrito às 2 transições sem contexto** (decisão original desta mesma Camada 5, ver `docs/DECISION_LOG.md` de 2026-07-06): rejeitada pelo Product Owner por não cobrir o caso de uso real atual (marcar disponibilidade em lote a partir de qualquer status, e marcar limpo/sujo).
- **Estender `VehicleStatusService` para aceitar um modo "forçar" que ignora a tabela de transições**: rejeitada — misturaria, dentro do serviço que é hoje a autoridade normativa do fluxo operacional, um caminho que explicitamente não segue regra nenhuma; mais claro manter os dois mecanismos fisicamente separados (serviço vs. escrita direta da página), como o próprio `docs/domain/VehicleStatus.md` já recomendava.
