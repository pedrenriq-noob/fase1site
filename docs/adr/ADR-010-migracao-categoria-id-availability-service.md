# ADR-010 — Migração do AvailabilityService para `categoria_id`

**Data:** 2026-07-05
**Status:** Adiado (evolução arquitetural aprovada em princípio, execução não autorizada)
**Contexto:** `_shared/disponibilidade.ts` + `apps/frota-ops/js/utils.js` (calcularDisponibilidade) — algoritmo central de disponibilidade (ver ADR-003)

---

## Contexto

A migration 028 (2026-07-01) adicionou `categoria_id uuid REFERENCES categorias(id)` a `frota_veiculos` e `frota_reservas`, com backfill do histórico, para resolver a causa estrutural do bug de divergência de grafia ("J-PREMIUM" vs "J-PREMIUM ") que já fez reservas sumirem do cálculo de disponibilidade.

A Technical Audit de 2026-07-05 (Ação #2) encontrou que a coluna existia mas não estava sendo mantida corretamente: o trigger `fn_sincronizar_frota_reserva` — o caminho principal de criação de reservas ativas — nunca gravava `categoria_id`, mesmo tendo esse valor disponível. Isso foi corrigido na migration 029 (trigger + backfill do histórico).

**O que a migration 029 explicitamente NÃO fez, por decisão consciente:** trocar a chave usada nas consultas do próprio algoritmo de disponibilidade. Hoje, tanto `checkDisponibilidade` (`_shared/disponibilidade.ts`) quanto `calcularDisponibilidade` (`apps/frota-ops/js/utils.js`) continuam filtrando `frota_veiculos`/`frota_reservas` por `categoria` (texto), não por `categoria_id`. A correção da Ação #2 garante que `categoria_id` esteja sempre populado corretamente dali para frente — mas não elimina o risco de origem: o texto `categoria` ainda pode divergir (ex: erro de digitação numa importação de CSV futura), e o algoritmo não perceberia, porque não é essa a chave que ele usa para decidir o que é "a mesma categoria".

## Decisão (proposta, não executada)

Trocar a chave de filtro do `AvailabilityService` de `categoria` (texto) para `categoria_id` (uuid, FK), nas duas implementações (`disponibilidade.ts` e `calcularDisponibilidade`), eliminando de vez a superfície de divergência de grafia como fonte de bug — não só na origem da escrita (já resolvido), mas também na leitura que decide disponibilidade.

**Esta ADR registra a decisão como aprovada em princípio, mas seu prazo de execução é deliberadamente indefinido.** Não iniciar a implementação sem instrução explícita do Product Owner.

## Por que foi adiada

- É uma mudança no algoritmo mais sensível do projeto — o histórico de revisões da ADR-003 mostra que qualquer alteração no cálculo de disponibilidade já recebeu tratamento cauteloso, com testes de paridade e validação extensiva antes de qualquer mudança de comportamento.
- A Ação #2 já eliminou o risco imediato e mensurável (o vazamento de `categoria_id` na origem, confirmado em produção). O risco restante (divergência futura de texto) é hipotético — ainda não se materializou desde a correção.
- Trocar a chave de consulta tem uma complicação real a resolver antes de implementar: a categoria `U-UTILITARIO` não tem `categoria_id` (não existe na tabela `categorias` — é exclusiva de um cliente específico, nunca ofertada ao público). O algoritmo precisaria de um caminho híbrido (categoria_id quando existir, fallback para texto quando não) ou uma decisão de produto sobre como tratar essa categoria de forma permanente.
- Seguindo o princípio de simplicidade já aplicado no projeto (ver `docs/DECISION_LOG.md`): não resolver um problema hipotético quando o problema real e mensurável já foi fechado.

## Benefícios esperados quando implementada

- Elimina definitivamente a classe de bug "categoria some da disponibilidade por divergência de texto" — não apenas na escrita (já resolvido), mas também na leitura, fechando o ciclo completo.
- Torna `categoria` (texto) um campo puramente de exibição, sem papel na lógica de negócio — reduz a superfície de erro humano em importações futuras (CSV, digitação manual em `admin.js`).
- Alinha o `AvailabilityService` com o padrão já usado corretamente em `apps/intake-admin/pages/reservas.js` (que já opera sobre `categoria_id` via `solicitacoes.categoria_id`), reduzindo a assimetria entre os dois lados do sistema.

## Riscos a considerar quando a implementação for retomada

- **U-UTILITARIO**: definir explicitamente o comportamento — via product owner, não assumido pela engenharia — antes de qualquer código. Opções a avaliar no momento: (a) manter um caminho de fallback permanente para essa categoria específica; (b) criar uma entrada correspondente em `categorias` mesmo sem oferta pública, só para ter um `categoria_id` válido; (c) outra solução ainda não considerada.
- **Dupla implementação**: a mudança precisa ser feita simultaneamente em `_shared/disponibilidade.ts` (Deno/TS) e `apps/frota-ops/js/utils.js` (JS), mantendo paridade — usar `tests/disponibilidade.test.js` (já existente) como guarda de regressão, estendendo os casos de teste para cobrir a nova chave antes de mudar o código de produção.
- **Dados em trânsito**: qualquer reserva criada entre a decisão de migrar e o deploy efetivo precisa continuar funcionando — a migração de leitura só deve ser habilitada depois de uma janela de confiança sobre a integridade de `categoria_id` (a correção da Ação #2 já é esse período de confiança começando).
- **Reversibilidade**: como toda mudança em `AvailabilityService`, deve ser acompanhada de plano de rollback claro (ver P8 do CLAUDE.md) — a coluna `categoria` texto continua existindo e não deve ser removida até esta migração estar validada em produção por um período de estabilidade.

## Gatilho para revisitar

Esta ADR deve ser revisitada (não implementada preventivamente) se qualquer um destes sinais aparecer:
- Uma nova ocorrência real de divergência de grafia em `categoria` afetando disponibilidade (o mesmo tipo de incidente que originou a migration 028).
- Decisão de produto sobre o tratamento definitivo de `U-UTILITARIO` que resolva a complicação acima.
- Crescimento do volume de dados que motive de qualquer forma revisitar o algoritmo de disponibilidade por outras razões (performance, por exemplo — ver dívida técnica D4/D5 da Technical Audit de 2026-07-05).

## Alternativas consideradas

- **Implementar agora, já que a Ação #2 estava em andamento**: rejeitado explicitamente pelo Product Owner — escopo da Ação #2 foi conscientemente limitado a fechar a origem do vazamento, não a evoluir o algoritmo.
- **Não registrar formalmente, deixar só como item de dívida técnica**: rejeitado — o Product Owner pediu registro como decisão arquitetural com contexto completo (por que adiada, benefícios, riscos), não como uma linha de lista de pendências.
