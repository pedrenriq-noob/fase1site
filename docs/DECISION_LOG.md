# Decision Log — i-Frotas

Pequenas decisões arquiteturais e de implementação que não justificam uma ADR, mas que não devem depender do histórico de conversas para serem lembradas. Cada entrada contém apenas: Data, Decisão, Justificativa, Impacto. Ordem cronológica, mais recente no topo.

---

**Data:** 2026-07-07
**Decisão:** Consolidado o mapeamento categoria→frota: `_shared/disponibilidade.ts` (edge functions `check-disponibilidade`/`criar-solicitacao`) não usa mais o `SLUG_MAP` hardcoded — passa a consultar `categoria_frota_map` (tabela já criada em `sql/027`, mesma fonte usada pelo trigger de sincronização). Deploy feito e validado (smoke test + `get_logs` sem erros novos).
**Justificativa:** Havia dois mapeamentos independentes mantidos manualmente em paralelo (`SLUG_MAP` em TypeScript e `categoria_frota_map` no banco) — o mesmo tipo de risco de divergência que já causou o bug histórico do GRUPO J. `SLUG_MAP` ainda tinha `'U - UTILITARIO'` com espaços (grafia divergente da normalizada em `admin.js`), mas era código morto (`categorias` não tem entrada `grupo_u` — U-UTILITARIO nunca é ofertado ao público).
**Impacto:** Uma única fonte de verdade para o mapeamento. `resolverCategoriaFrota()` faz join `categorias`↔`categoria_frota_map` via `slug`, com filtro de `tenant_id`. Testado em produção: `check-disponibilidade` retornou `total:3` para `grupo_b` (antes e depois do deploy, mesmo resultado).

---

**Data:** 2026-07-07
**Decisão:** Corrigido bug real no trigger de sincronização `solicitacoes`→`frota_reservas` (`sql/027`): a FK `frota_reservas.solicitacao_id` não tinha `ON DELETE SET NULL`, então excluir uma `solicitacao` já sincronizada falhava com violação de FK — o trigger `AFTER DELETE` documentado para cancelar a reserva nunca chegava a rodar. Corrigido em `sql/032` (FK vira `SET NULL`, trigger vira `BEFORE DELETE`).
**Justificativa:** Encontrado testando o trigger de ponta a ponta em produção (solicitação de teste, criada/apagada em seguida) como parte da preparação do handoff para o SaaS — validação pedida explicitamente pelo usuário antes de assumir que a automação "já resolve" a integração site→frota. Não havia UI em `intake-admin` usando esse caminho de exclusão, por isso nunca foi notado.
**Impacto:** `confirmada`→cria `frota_reservas`, `concluida`→conclui, `cancelada`→cancela, `DELETE`→cancela e desvincula (`solicitacao_id` vira `NULL`, histórico preservado) — todos os 4 caminhos testados e confirmados em produção após a correção.

---

**Data:** 2026-07-06
**Decisão:** ~~"Mudança de status em lote" (Camada 5) só cobre as 2 transições do `VehicleStatusService` que não exigem contexto por veículo (`*→MANUTENCAO`, `MANUTENCAO→DISPONIVEL`).~~ **Superada no mesmo dia** — ver entrada seguinte (mais recente) e ADR-011.
**Justificativa:** Decisão explícita do Product Owner — a tela hoje supre um sistema oficial que ainda não gera esses eventos automaticamente; faz sentido operar em lote enquanto isso. Quando o SaaS definitivo registrar cada evento individualmente (devolução, retirada, lavagem, uma por uma), essa ação deixa de fazer sentido. Não deve ser generalizada como precedente para outras ações em lote sem repetir essa checagem de contexto por transição.
**Impacto:** Válido só pela primeira entrega do dia — substituído horas depois pela decisão abaixo, a pedido do próprio Product Owner.

---

**Data:** 2026-07-06
**Decisão:** Ação em lote de `veiculos.js` passa a permitir **qualquer** status (`DISPONIVEL`/`LOCADO`/`DEVOLVIDO`/`NO_LAVADOR`/`MANUTENCAO`) e também `limpo`/`sujo`, gravando direto no Supabase — sem passar por `VehicleStatusService.descreverTransicao`, sem checar transição válida. Substitui a decisão anterior (mesmo dia, restrita a 2 transições).
**Justificativa:** Pedido explícito do Product Owner: o sistema opera hoje como quebra-galho de um sistema oficial que não gera eventos individuais de devolução/retirada/lavagem; o operador precisa poder corrigir/definir o status real dos veículos livremente, em lote, sem seguir sequência. Documentado formalmente em `ADR-011` (inclui gatilho explícito de reversão: quando o SaaS definitivo passar a registrar cada evento individualmente).
**Impacto:** `veiculos.js` ganhou 7 ações de `BulkActionBar` (5 de status + 2 de limpeza); `VehicleStatusService` deixa de ser usado nesta tela para a ação em lote (continua sendo a única autoridade para o fluxo item a item em `veiculo-detalhe.js`/`reservas.js`). Sem validação de domínio nesta via — responsabilidade do dado correto passa a ser do operador.

---

**Data:** 2026-07-05
**Decisão:** `Modal` inicializa na ordem `document.body.appendChild(overlay)` antes de `render()`, não depois.
**Justificativa:** `render()` tenta focar o primeiro elemento focável; `.focus()` em elemento ainda não anexado ao DOM é *no-op* silencioso. Só foi descoberto testando de fato no navegador durante a Migração Piloto.
**Impacto:** Autofoco do `Modal` passou a funcionar em todas as instâncias (nenhuma mudança de API pública).

---

**Data:** 2026-07-05
**Decisão:** Autofoco inicial do `Modal` busca primeiro dentro de `.modal-body`, caindo para o modal inteiro só se o corpo não tiver elemento focável.
**Justificativa:** Sem essa restrição, o botão "Fechar" do cabeçalho (antes do corpo no DOM) roubava o foco do primeiro campo do formulário.
**Impacto:** Nenhuma mudança de contrato — corrige o comportamento para bater com o que `docs/ui/Modal.md` já dizia.

---

**Data:** 2026-07-05
**Decisão:** `ConfirmationDialog` fecha sempre ao confirmar; não expõe forma de manter aberto em caso de erro nem de customizar a mensagem de erro exibida.
**Justificativa:** É um componente de confirmação simples (sim/não), não um formulário com validação — esse papel já é coberto pelo `Modal`. Preservar mensagens de erro específicas por ação é responsabilidade da página, com seu próprio try/catch dentro de `onConfirm`.
**Impacto:** Migração de `veiculo-detalhe.js` manteve os 5 `try/catch` internos das ações que usavam `confirm()` nativo, em vez de deixar a exceção escapar para o toast genérico do `Modal`.

---

**Data:** 2026-07-05
**Decisão:** `FilterBar.onChange` renomeado para `onFilterChange`; `BulkActionBar.actions[].handler` renomeado para `onAction`.
**Justificativa:** Convenção `on<Evento>` deve ser universal em todo callback público do Design System, inclusive dentro de arrays — nenhuma exceção, mesmo que pareça pequena.
**Impacto:** Mudança de contrato aplicada antes de qualquer implementação existir (Fase 0 ainda), sem consumidores para migrar.

---

**Data:** 2026-07-05
**Decisão:** `ListView` recebe estado primitivo (`search.termo`, `filters.estado`) em vez da instância de `SearchBox`/`FilterBar`.
**Justificativa:** Receber a instância exigiria que `ListView` conhecesse a API interna de outro componente (ex: chamar `filterBar.getState()`), um acoplamento oculto que a ADR-006 pede para evitar. Também era assimétrico: `sort` já recebia estado primitivo, `search`/`filters` não.
**Impacto:** Contrato do `ListView` corrigido antes da implementação (Fase 0 ainda) — nenhum código a migrar.

---

**Data:** 2026-07-05
**Decisão:** "Migração Piloto" e "Validação em ambiente real" tratadas como uma única etapa do ciclo de vida de componentes (ADR-007), não duas sequenciais.
**Justificativa:** Na prática, migrar uma tela sem de fato executá-la no navegador não tem valor de validação — foi exatamente essa execução real que encontrou o bug de foco do `Modal`, não a leitura de código da etapa anterior.
**Impacto:** ADR-007 passou de 7 para 6 etapas; `docs/ui/COMPONENT_CHECKLIST.md` já refletia essa fusão (seção única "5. Integração”).

---

**Data:** 2026-07-05
**Decisão:** Storybook, testes de acessibilidade automatizados (axe-core) e versionamento semântico por componente não serão adotados agora.
**Justificativa:** Os dois primeiros exigiriam build tooling, contrariando a ADR-001 (sem bundler); o terceiro não tem necessidade real enquanto existe um único consumidor por componente.
**Impacto:** Nenhum — mantém o Design System dentro das restrições arquiteturais já decididas. Revisitar apenas se surgir necessidade concreta (ex: múltiplos consumidores com ciclos de deploy independentes).
