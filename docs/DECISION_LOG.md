# Decision Log — i-Frotas

Pequenas decisões arquiteturais e de implementação que não justificam uma ADR, mas que não devem depender do histórico de conversas para serem lembradas. Cada entrada contém apenas: Data, Decisão, Justificativa, Impacto. Ordem cronológica, mais recente no topo.

---

**Data:** 2026-07-14
**Decisão:** Tornados clicáveis os indicadores de etapa na barra de progresso (`#steps-bar`, topo de `reserva.html`). Antes, os círculos "Período/Proteção/Adicionais/Confirmação" eram só decorativos — para voltar do Step 3 ao Step 1, o cliente precisava clicar em "← Voltar" duas vezes. Agora cada etapa já alcançada nesta sessão (`S.maxStep`, novo campo persistido em `sessionStorage`) é clicável e navega direto (`goToStep(n)`), sem re-render intermediário nem re-validação (os dados dessas etapas já foram validados quando o cliente passou por elas da primeira vez). Etapas ainda não alcançadas continuam sem interação (clique é ignorado, `aria-disabled="true"`, `tabindex="-1"`) — avançar ainda exige `nextStep()`/validação normal, isso não é um atalho para pular etapas.
**Justificativa:** Pedido do usuário: "quanto menos clicks melhor" — voltar várias etapas só com o botão "Voltar" era um retrabalho desnecessário para algo que a UI já sinalizava visualmente (a barra de progresso).
**Impacto:** `reserva.html` (`onclick`/`onkeydown` nos 4 `.step`), `script.js` (`S.maxStep`, `window.goToStep()`, `renderStep()` agora marca `.reachable`/`aria-current`/`aria-disabled` em cada `.step`), `style.css` (`.step.reachable` — cursor pointer, hover e foco visível). Validado no browser: do Step 3, clique no chip "Período" volta direto ao Step 1 em um clique só; chips não alcançados (ex. "Confirmação" antes de passar por Proteção/Adicionais) não reagem a clique; estado (`S.maxStep`) sobrevive a reload via `sessionStorage`. Sem erros de console. `npm test` 60/60, inalterado.

---

**Data:** 2026-07-14
**Decisão:** Corrigido gap de validação local×horário na edição de período pela sidebar (Step 2+). O seletor de hora da sidebar (`sb-devHora`) permite 0h–23h sem nenhuma restrição, diferente do Step 1 (`devHora`), que já revalida `locaisParaDevolucao()` a cada troca e força o cliente a reescolher local se ele sair da janela de atendimento. Como os `<select>` de local só existem no Step 1, uma troca de horário pela sidebar em Step 2/3/4 deixava a reserva com uma combinação local+horário inválida (ex.: devolução às 19:00 mantendo o local "Av. Brasil, 90 — Centro", que atende só até 18:00) sem nenhum aviso — o erro só apareceria na validação server-side de `criar-solicitacao` (`RB-02`/entrada #23 deste log), no fim do fluxo. Criada `revalidarLocaisPeriodo()`, chamada após qualquer troca de data/hora pela sidebar (`sb-retData`, `sb-devData`, `sb-retHora`, `sb-devHora`): reexecuta `locaisParaRetirada`/`locaisParaDevolucao` com o novo período e, se o local atual não é mais válido, corrige automaticamente para o único local restante (na prática, o aeroporto — único ponto 24h) chamando `syncAeroAdd()` para já refletir a taxa correspondente, ou limpa o local e pede para revisar a Etapa 1 se houver ambiguidade (0 ou 2+ opções válidas). Em qualquer caso, um pop-up (`showLocationModal()`, novo componente de modal genérico) explica ao cliente o que mudou e por quê.
**Justificativa:** Reportado pelo usuário: "cliente selecionou devolução na loja às 16h, altera para 19h no sidebar — vai continuar considerando devolução na loja, ou muda automaticamente pro aeroporto?" — investigação confirmou que a troca ficava silenciosamente inconsistente. Pedido explícito de um pop-up cordial explicando a mudança de local, com autonomia para redigir o texto.
**Impacto:** `script.js`: `revalidarLocaisPeriodo()`, `janelaTexto()`, `nomeCurto()`, `showLocationModal()`; hooks em `bindSbPeriod()` (`sb-retData`/`sb-devData`) e `selectHora()` (ramo `sb-*`). `style.css`: `.modal-overlay`/`.modal-box`/`.modal-close`/`.modal-body`/`.modal-divider`/`.modal-ok`. Validado no browser: mudar `sb-devHora` de 09:00→19:00 com devLocal "Centro" (08:00–18:00) corrige automaticamente para "Estacionamento Taroba 2 - Aeroporto", adiciona a taxa "DEVOLUCAO NO AEROPORTO" ao resumo, recalcula `dias`, e exibe pop-up explicativo — testado em 1280px e 375px, fechamento via X/backdrop/Esc funcional, sem erros de console. `npm test` 60/60, inalterado.

---

**Data:** 2026-07-14
**Decisão:** Adicionado bloco de "upgrade de categoria" na sidebar de resumo (`#summaryUpgrade`, dentro de `<aside id="summary">`), visível a partir do Step 2 (Proteção) em diante. Mostra até 3 categorias com `preco_diaria` maior que a atual, ordenadas ascendente por preço, cada uma com o **valor total da reserva** (diárias na nova categoria + proteção + adicionais já escolhidos) caso o cliente trocasse. Clicar num card chama `selectCat(id)` (já usado pelos cards do Step 1 e pelo dropdown antigo da sidebar), agora generalizado para re-renderizar o conteúdo do Step 2/3 quando a troca acontece fora do Step 1 (mantendo o limite de cadeirinhas coerente com a nova categoria). Step 4 é explicitamente excluído do re-render — a sidebar já não aparece nessa etapa (`updateSummary()` retorna cedo em `S.step===4`), e um re-render ali apagaria dados do formulário de cliente ainda não sincronizados em `S` (só são lidos do DOM no envio).
**Justificativa:** Pedido direto do usuário (proposta de UX com screenshot anotado): dar visibilidade ao custo de subir de categoria sem sair do fluxo. Critérios confirmados com o usuário antes de implementar: ordenar por `preco_diaria` (não pela ordem do catálogo), limitar a 3 blocos, funcionar tanto no layout desktop (grid ao lado do conteúdo) quanto no mobile empilhado — mesmo elemento `#summary` nos dois casos, sem duplicar markup.
**Impacto:** `reserva.html` (novo `<div id="summaryUpgrade">`), `script.js` (`renderUpgradeBlocks()`, chamada em `updateSummary()`; `selectCat()` generalizado para Step 2/3), `style.css` (`.summary-upgrade*`). Validado no browser: cards renderizam ordenados corretamente, clique troca categoria e recalcula a lista (excluindo a nova categoria atual), sem erros de console, visível e funcional em 1280px (grid lateral) e 375px (empilhado). `npm test` 60/60, inalterado.

---

**Data:** 2026-07-08
**Decisão:** Corrigida regressão introduzida pela limpeza de `renderLanding()` (entrada anterior deste log, mesmo dia): a classe `mode-flow` no `#app` nunca era só sobre a landing morta — era o gatilho do CSS que coloca a sidebar (`#summary`) ao lado do conteúdo em telas ≥860px (`style.css:868`, `#app.mode-flow { display:grid; ... }`). Ao remover o toggle `app?.classList.toggle('mode-flow', !isLanding)` de `renderStep()`, a classe deixou de ser aplicada e a sidebar caiu para baixo do conteúdo em qualquer largura de tela. Corrigido aplicando `mode-flow` estaticamente no `#app` de `reserva.html` (é a única modalidade que existe agora que a landing morta foi removida — não precisa mais de toggle dinâmico).
**Justificativa:** Reportado pelo usuário com screenshot ("sidebar foi lá pra baixo, não está mais na lateral") logo após o deploy da limpeza anterior — testado por mim em viewport de 800px (abaixo do breakpoint de 860px, onde o bug não aparece por engano de teste), não peguei a regressão antes do commit. Corrigido sob pressão de tempo (usuário precisava do sidebar funcionando para explicar uma proposta de mudança de layout).
**Impacto:** `reserva.html`: `<div class="container" id="app">` → `<div class="container mode-flow" id="app">`. Validado via `getBoundingClientRect()` em 1280px: `#app` fica `display:grid`, `#summary` alinhado ao lado de `#content`. `npm test` 60/60. **Lição:** ao remover uma classe/toggle CSS por parecer "só sobre a feature morta", conferir todos os seletores CSS que dependem dela antes de remover — não só os que parecem óbvios pelo nome.

---

**Data:** 2026-07-08
**Decisão:** Duas limpezas em `apps/site`, a partir dos "pontos de atenção" registrados em `docs/HANDOFF-SITE-RESERVAS.md`: (1) unificada a criação do cliente Supabase — `index.html` tinha um bloco `<script type="module">` inline duplicando `supabase.js` (mesma URL/chave, CDN diferente); extraído para `apps/site/landing.js`, que agora importa `supabase`/`TENANT_ID` do módulo compartilhado. (2) removido `renderLanding()`/`iniciarReserva()` de `script.js` — código morto confirmado (nenhum caminho no código atual seta `S.step = 0`; `prevStep()` já impede voltar abaixo de 1; a landing real é `index.html`, separada, desde que o site foi dividido).
**Justificativa:** Ambos os itens foram identificados no handoff e confirmados como seguros/baratos antes de tocar em qualquer proposta de layout futura — não alteram comportamento visível, só removem duplicação e código morto.
**Impacto:** `index.html` carrega um único `<script type="module" src="landing.js">`; `landing.js` reaproveita `supabase.js`. `renderStep()` simplificado (removida toda a ramificação `isLanding`/`mode-landing`/`mode-flow`/`header-dark`, hoje sempre falsa). Validado no browser: landing carrega locais/frota reais sem erro, `window._reservarCat` funcional; `reserva.html` renderiza Step 1 direto, sem regressão. `npm test` 60/60.

---

**Data:** 2026-07-08
**Decisão:** Removida toda a integração de disponibilidade em tempo real de `apps/site` (checagem/UI dos cards de categoria, debounce, badge "verificando…", bloqueio de categoria esgotada) e a trava de overbooking (erro 409 `sem_disponibilidade`) dentro de `criar-solicitacao`. A Edge Function `check-disponibilidade` continua existindo (ainda usada por `extensions/cotacao-rapida`).
**Justificativa:** Decisão explícita do Product Owner — "o site de disponibilidade não funcionou como eu queria. Vou descontinuar." A funcionalidade fica reservada para reintegração futura no SaaS unificado, com desenho próprio.
**Impacto:** `apps/site/script.js` não faz mais fetch para `check-disponibilidade`; categorias no site sempre aparecem selecionáveis, sem checagem de estoque. `criar-solicitacao` aceita qualquer solicitação dentro das demais validações (local/horário/cadeirinhas), sem checar disponibilidade de frota. Removido código morto associado (`_dispDebounce`, `_dispAbortCtrl`, `AbortController`, CSS `.esgotado`/`.cat-disp-badge`). Deploy de `criar-solicitacao` validado (smoke test + `get_logs`).

---

**Data:** 2026-07-07
**Decisão:** Consolidado o núcleo de cálculo de disponibilidade (total/ocupados/disponivel/overbooking/alerta) numa fonte canônica única — `supabase/functions/_shared/disponibilidade-core.js`, com cópia física em `apps/frota-ops/js/disponibilidade-core.js` garantida por `tests/disponibilidade-core-parity.test.js` (mesmo padrão de `pricing.js`). `_shared/disponibilidade.ts` (Edge Function) e `apps/frota-ops/js/utils.js` (`calcularDisponibilidade`) passam a chamar o núcleo compartilhado em vez de reimplementar a fórmula cada um. A investigação encontrou só 2 implementações reais do algoritmo (não 3 como o handoff inicial supôs) — `apps/frota-ops/pages/disponibilidade.js` já delegava para `calcularDisponibilidade` de `utils.js`, não é uma terceira variante.
**Justificativa:** A mesma fórmula estava duplicada manualmente entre a Edge Function e o frota-ops — mesmo risco de divergência silenciosa já corrigido para o mapeamento categoria→frota. `apps/frota-ops/js/utils.js` mantém por cima o detalhamento por veículo (`detalhes`), que não existe na Edge Function (o site público só precisa do agregado).
**Impacto:** `npm test` 60/60 (novo teste de paridade), comportamento idêntico confirmado via `preview_eval` (frota-ops) e smoke test em produção (Edge Function, mesmo `total:3` antes/depois). Deploy de `check-disponibilidade`/`criar-solicitacao` feito e validado.

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
