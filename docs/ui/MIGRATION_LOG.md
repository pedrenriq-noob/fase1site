# Migration Log — Design System Operacional do i-Frotas

Histórico permanente de cada tela migrada para os componentes de `docs/ui/`, e (a partir da Camada 3 da Fase 1B) dos serviços de domínio implementados. Ver `docs/ui/README.md` para a tabela-resumo de "status de adoção"; este documento é o relato detalhado de cada entrega, incluindo dificuldades e ajustes de contrato.

---

## veiculos.js — 2026-07-06 (Camada 5 da Fase 1B — seleção múltipla + ações em lote + status em lote, escopo final)

### Componentes adotados nesta etapa

- `SelectionController` — checkbox por card (`.vehicle-select`), usando `v.placa` como id (mesmo padrão do exemplo do contrato).
- `BulkActionBar` — 7 ações: 5 de status (`Definir: Disponível/Locado/Devolvido/Lavador/Manutenção`) + 2 de limpeza (`Marcar Limpo`/`Marcar Sujo`).

### Histórico desta entrega (revisado no mesmo dia)

A primeira versão desta entrega restringia a ação em lote às 2 transições do `VehicleStatusService` sem contexto obrigatório (`*→MANUTENCAO`, `MANUTENCAO→DISPONIVEL`), usando `descreverTransicao` para validar cada veículo antes de gravar (ver entrada de decisão correspondente, marcada como superada em `docs/DECISION_LOG.md`).

O Product Owner pediu explicitamente a reversão desse escopo: **todos** os status devem poder ser definidos em lote, para qualquer veículo, sem seguir a sequência/validação do serviço — incluindo marcar `limpo`/`sujo` diretamente (campo que antes só mudava como efeito colateral de uma transição). Justificativa: o sistema opera hoje como quebra-galho de um sistema oficial que ainda não gera eventos de devolução/retirada/lavagem individualmente.

Isso foi formalizado como **ADR-011** (não como mero ajuste de escopo) porque introduz um caminho paralelo de escrita de `status`/`limpo` que conscientemente ignora a autoridade normativa que `VehicleStatusService` representa para o fluxo item a item — o próprio `docs/domain/VehicleStatus.md` já previa essa necessidade como algo que deveria vir "por outro mecanismo, nunca como comportamento padrão do serviço"; esta é exatamente essa via, documentada e com gatilho de reversão explícito.

### Implementação final

`runBulkAction` não usa mais `descreverTransicao` — grava `{ [campo]: valor }` diretamente via Supabase para cada veículo selecionado (`campo` é `'status'` ou `'limpo'`, conforme a ação clicada). Sem validação de domínio: um veículo `LOCADO` pode ser definido como `DISPONIVEL` em lote sem ter passado por devolução real — responsabilidade do dado correto passa a ser do operador que aciona a ação.

Checkbox de seleção usa `e.stopPropagation()` no `click` para não disparar a navegação do card (`vehicle-card` já tem handler de clique para abrir o detalhe do veículo).

### Validação em ambiente real

`preview_eval`: os 7 botões da `BulkActionBar` renderizam com os labels corretos; reimplementação isolada do wiring checkbox→`SelectionController`→`BulkActionBar.update()` (já validada na versão anterior desta entrega) confirma exibição/ocultação e contagem corretas; payload de cada ação (`{status: X}` ou `{limpo: Y}`) confirmado por inspeção direta. `node --check` e `npm test` (50/50) sem regressão. Fluxo completo autenticado (clique real → grava no Supabase) não pôde ser testado — login segue proibido.

### Problemas encontrados

Nenhum de implementação — a mudança de escopo é uma decisão de produto (ADR-011), não uma inconsistência técnica.

### Ajustes realizados

Nenhuma mudança nos contratos de `SelectionController`/`BulkActionBar` (ambos já suportavam esse uso sem alteração). `VehicleStatusService` não teve seu contrato alterado — o bypass vive inteiramente em `veiculos.js`, fora do serviço.

### Mudanças na API

Nenhuma.

### Contagem de adoção

- `SelectionController`: 1 tela (`veiculos.js`). Faltam 2 para Stable.
- `BulkActionBar`: 1 tela (`veiculos.js`). Faltam 2 para Stable.

---

## veiculos.js — 2026-07-06 (Camada 5 da Fase 1B — ordenação por coluna)

### Componentes adotados nesta etapa

- `SortableHeader` — 3 instâncias independentes (Placa, Categoria, Status) renderizadas em uma nova `#sort-container`, acima da grade de cards.

### Decisão de arquitetura

`veiculos.js` usa uma grade de cards (`.vehicle-card`), não uma tabela — `SortableHeader` não exige `<table>`/`<th>` no seu contrato (é só um `<button>`), então foi possível reaproveitá-lo sem adaptação, na mesma composição já usada para `SearchBox`/`FilterBar` (uma "barra" acima da lista). Nenhuma mudança de contrato foi necessária.

`_sort` (estado da página, não do componente) guarda `{key, dir}`; a página garante que só um `SortableHeader` fique `active` por vez, atualizando os 3 via `update()` a cada clique — exatamente a responsabilidade que a regra de comportamento #3 do contrato atribui à página, não ao componente. Ordenação padrão inicial (`placa`/`asc`) replica a ordem da query atual (`order('placa')`), sem mudança de comportamento perceptível até o operador trocar de critério.

Comparador usa `localeCompare` sobre os 3 campos (todos string/categoria), aplicado sobre a lista já filtrada (`getSorted(getFiltered())`) — ordenação e filtro compõem sem se conhecerem.

### Validação em ambiente real

`preview_eval`: os 3 headers renderizam corretamente; clique em "Categoria" ativa Categoria (`aria-sort="ascending"`) e desativa Placa (`aria-sort="none"`) simultaneamente; segundo clique alterna para `descending`; comparador testado isoladamente com dataset de 3 itens (asc/desc por placa, asc por categoria) — resultados corretos. `node --check` e `npm test` (50/50) sem regressão.

### Problemas encontrados

Nenhum.

### Ajustes realizados

Nenhuma mudança de contrato.

### Mudanças na API

Nenhuma.

### Contagem de adoção

- `SortableHeader`: 1 tela (`veiculos.js`). Faltam 2 para Stable.

---

## admin.js — 2026-07-05 (Camada 4 da Fase 1B — quarta e última tela migrada)

### Componentes adotados nesta etapa

- `Modal` (`criarModal`) — substitui o `createModal(title, bodyHtml, onConfirm, onDone)` local (API posicional própria) nos 4 usos: `showVeiculoModal`, `showUsuarioModal`, `showResetSenhaModal`, `showPatioModal`.
- `ConfirmationDialog` (`criarConfirmationDialog`, tone `'danger'`) — substitui o `confirm()` nativo em `deleteVeiculo`.

### Decisão de migração

O `createModal` local tinha `onDone` (callback pós-fechamento, chamado só quando `onConfirm` fecha com sucesso) sem equivalente direto no contrato de `Modal` (`onClose` do Design System dispara em **qualquer** fechamento — X, Cancelar, clique fora, ou confirmação). Usar `onClose` no lugar de `onDone` recarregaria a lista mesmo ao cancelar (fetch desnecessário, mas nenhuma mudança de dado incorreta). Para preservar exatamente o comportamento atual, a chamada de `loadTab(...)` foi movida para dentro do próprio `onConfirm`, no branch de sucesso, antes do `return true` — não depende de nenhum evento do Modal.

Todos os 4 modais recebiam `confirmLabel` fixo "Salvar" no `createModal` local (nunca "Confirmar"); mantido explicitamente via `confirmLabel: 'Salvar'` para não alterar o texto visível ao operador.

`deleteVeiculo`: `confirm()` nativo bloqueante era substituído por um `ConfirmationDialog` assíncrono — mesma mudança de UX já sinalizada como risco aceito na proposta de arquitetura do Modal/ConfirmationDialog (ver `ConfirmationDialog.md`), já aplicada anteriormente em `veiculo-detalhe.js`/`reservas.js`.

### Validação em ambiente real

`node --check` (sintaxe ok). `preview_eval` chamando `init()` com container isolado: módulo carrega sem exceções — mas o guard `user?.role !== 'admin'` bloqueia o restante do fluxo sem uma sessão autenticada (login nunca é executado neste projeto, por restrição de segurança). Os componentes `Modal`/`ConfirmationDialog` em si já foram validados ao vivo (clique, foco, `Esc`, erro genérico) nas migrações-piloto de `veiculo-detalhe.js`/`reservas.js`; esta entrega reaproveita a mesma implementação sem alterações, apenas ajusta a chamada. `npm test`: 50/50.

### Problemas encontrados

Nenhuma inconsistência de contrato — `createModal` local mapeia 1:1 para `criarModal` com o ajuste de `onDone`→chamada explícita dentro de `onConfirm` (ver acima).

### Ajustes realizados

Nenhuma mudança nos contratos de `Modal.md`/`ConfirmationDialog.md`.

### Mudanças na API

Nenhuma.

### Contagem de adoção

- `Modal`: 3 telas (`veiculo-detalhe.js`, `reservas.js`, `admin.js`) — **Stable**.
- `ConfirmationDialog`: 3 telas (`veiculo-detalhe.js`, `reservas.js`, `admin.js`) — **Stable**.

### Fechamento da Camada 4

Com esta entrega, as 4 telas da Camada 4 estão endereçadas: `veiculos.js` (SearchBox+FilterBar), `patio.js` (avaliado, nada a migrar), `reservas.js` (FilterBar), `admin.js` (Modal+ConfirmationDialog). Próximo passo: Camada 5 (Funcionalidades Operacionais), mediante autorização.

---

## reservas.js — 2026-07-05 (Camada 4 da Fase 1B — segunda tela migrada)

### Componentes adotados nesta etapa

- `FilterBar` — substitui as "tabs" de status (`PREVISTO`/`CONFIRMADO`/`CONCLUIDO`) por um grupo de `FilterBar`. (`Modal`/`ConfirmationDialog` já haviam sido migrados na Ação #5 da Technical Audit — não fazem parte desta entrega.)

### Decisão de migração

Mesma decisão já aplicada em `veiculos.js`: removida a opção `'ALL'`/`'Todas'` explícita — ausência de seleção no grupo já significa "sem restrição".

### Validação em ambiente real

`preview_eval` chamando `init()` com container isolado: módulo carrega sem exceções, `FilterBar` renderiza com as 3 opções de status, clique não gera erro.

### Problemas encontrados

Nenhum.

### Ajustes realizados

Nenhuma mudança de contrato.

### Mudanças na API

Nenhuma.

### Contagem de adoção

- `FilterBar`: 2 telas (`veiculos.js`, `reservas.js`). Falta 1 para Stable.

---

## patio.js — 2026-07-05 (Camada 4 da Fase 1B — nada a migrar)

### Avaliação

`patio.js` não usa nenhuma capacidade correspondente a um componente já implementado — sem busca, sem filtro, sem modal/confirmação. É uma grade de tiles agrupada por localização física, com atualização manual via botão. Adicionar busca/filtro agora seria funcionalidade **nova** (Camada 5), não migração de algo existente — decisão do Product Owner: não antecipar escopo da Camada 5, pular esta tela nesta etapa e seguir para `reservas.js`.

### Ação

Nenhuma mudança de código. Este registro existe para deixar explícito que a tela foi avaliada e propositalmente não teve nada migrado, evitando que pareça um passo esquecido.

---

## veiculos.js — 2026-07-05 (Camada 4 da Fase 1B — primeira tela migrada)

### Componentes adotados

- `SearchBox` — substitui o `<input type="search">` inline por busca de placa.
- `FilterBar` — substitui os dois grupos de "filter chips" manuais (status, categoria) por uma única instância com dois grupos.

### Decisão de migração: remoção da opção "ALL"/"Todas"

O padrão antigo tinha uma opção explícita `ALL`/`Todas` em cada grupo de chips, sempre ativa por padrão. `FilterBar` não precisa dessa opção especial: nenhuma seleção num grupo já significa "sem restrição" (mesmo comportamento, sem um valor mágico `'ALL'` no meio dos dados) — é o próprio padrão documentado no exemplo de `docs/ui/FilterBar.md`. Resultado equivalente ao usuário (grupo sem seleção = mostra tudo), mas sem o caso especial no código.

### Validação em ambiente real

Testado via `preview_eval` (chamando `init()` diretamente com um container isolado, já que o app exige login): módulo carrega sem exceções, `SearchBox` e `FilterBar` renderizam corretamente dentro da tela real (não isolados como nos testes de componente), digitação na busca e clique num filtro não geram erro, contagem de resultados atualiza. Não foi possível validar com dados reais (consulta ao Supabase sem sessão autenticada retorna vazio/RLS), mas a integração dos componentes na tela foi confirmada sem exceções.

### Problemas encontrados

Nenhum.

### Ajustes realizados

Nenhuma mudança de contrato — só a decisão de migração acima (remoção do valor `'ALL'`, não uma mudança em `FilterBar` em si).

### Lições aprendidas

A primeira migração de tela real confirma que os componentes puros validados isoladamente (Camadas 1-2) se integram sem atrito a uma página real — nenhuma surpresa, nenhuma mudança de API necessária.

### Mudanças na API

Nenhuma.

### Contagem de adoção

- `SearchBox`: 1 tela (`veiculos.js`). Faltam 2 para Stable.
- `FilterBar`: 1 tela (`veiculos.js`). Faltam 2 para Stable.

---

## VehicleStatusService (Camada 3) — 2026-07-05 (Fase 1B, implementação — não é migração de tela)

### Serviço implementado

`apps/frota-ops/js/services/vehicle-status.js`, conforme `docs/services/VehicleStatusService.md`. Ainda não adotado por nenhuma tela (Camada 4 migra `veiculo-detalhe.js`/`reservas.js` para usá-lo).

### Revisão de contrato antes da implementação — a mais substancial até agora, com decisões de domínio reais

Diferente dos componentes de UI (Camadas 1-2), aqui a revisão expôs lacunas de **regra de negócio**, não só de arquitetura. Todas levadas ao Product Owner antes de codar, nenhuma decidida por suposição:

1. `contexto.limpo` e `contexto.patioDestino` — removidos do contrato: nenhuma transição documentada os lia (o serviço decide `limpo` sozinho a partir da transição; movimentação de pátio é declarada fora de escopo, candidata a um serviço futuro dedicado).
2. `contexto.patioAtual`, `contexto.pontoRetirada`, `contexto.prevRetorno` — adicionados: sem eles, 2 das 7 transições documentadas não eram implementáveis como especificado.
3. **Transições fora da tabela oficial**: minha proposta original era permitir qualquer par (origem, destino) por padrão, citando o princípio #11 dos 18 Princípios de UX ("sem sequência obrigatória"). O Product Owner decidiu o oposto: `VehicleStatusService` representa o fluxo operacional oficial da locadora — só as 7 transições documentadas são válidas, qualquer outra retorna `valido:false`. Isso exigiu revisar o texto de `docs/domain/VehicleStatus.md`, que antes citava o princípio #11 para justificar a leitura contrária — reconciliado: o princípio continua valendo para a *interface* (nenhuma ação escondida atrás de cliques por causa de suposta ordem), mas o *serviço de domínio* é a fonte de verdade de quais transições existem de fato.
4. `horaEntradaLavador` passou de opcional para obrigatório em `DEVOLVIDO→NO_LAVADOR` — o serviço nunca gera timestamp internamente (`new Date()`), mantendo-o puro e determinístico.

### Documentação adicional criada

`docs/domain/CicloVidaVeiculo.md` — referência funcional do ciclo de vida oficial (fluxo principal + ramificação de manutenção), a ser consultada antes de qualquer nova transição ser discutida. Não substitui o contrato técnico, complementa.

### Validação

`tests/vehicle-status.test.js` — 17 testes, tabela-verdade completa: as 7 transições válidas com payload exato, cada uma com contexto obrigatório faltando, pares fora do fluxo oficial (recusados mesmo sem ambiguidade técnica), `statusAtual === statusDestino`, e confirmação de pureza (mesma entrada → mesma saída). Todos passando na primeira tentativa após a revisão de contrato — nenhuma surpresa na implementação em si, só nas decisões de domínio anteriores a ela.

### Problemas encontrados

Nenhum na implementação. Todos os achados foram de contrato/domínio, resolvidos antes de qualquer código.

### Ajustes realizados

Nenhum CSS (serviço de domínio, sem UI).

### Lições aprendidas

Extrair regra de negócio de código real e ad-hoc (`veiculo-detalhe.js`) expõe decisões que nunca tinham sido formalizadas — cada handler decidia sozinho o que era "óbvio" fazer. Centralizar forçou perguntas que o código espalhado nunca tinha precisado responder explicitamente (o que fazer fora do fluxo principal? de onde vem o timestamp?). Vale esperar o mesmo ao extrair `ReservationService` (Camada 3 seguinte, se aplicável) — reservar tempo para revisão de domínio, não só técnica.

### Mudanças na API

Sim — várias, todas antes de qualquer implementação existir (não quebra nenhum consumidor).

### Dependências

Nenhuma — função pura, sem imports.

---

## BulkActionBar (Camada 2) — 2026-07-05 (Fase 1B, implementação — não é migração de tela) — **Camada 2 concluída**

### Componente implementado

`apps/frota-ops/js/ui/bulk-action-bar.js`, conforme `docs/ui/BulkActionBar.md`. Ainda não adotado por nenhuma tela (Camada 4).

### Revisão de contrato antes da implementação — a mais significativa até agora

O contrato anterior pedia que cada ação tivesse `onAction(idsSelecionados: Set<string>)`, mas a config só recebia `selectedCount: number` — o componente nunca teria de onde tirar os ids reais para repassar. Encontrada e apresentada ao Product Owner, que propôs uma simplificação mais profunda do que a correção mínima (adicionar os ids à config): o componente deixa de manipular ids em qualquer forma. `actions` passou a ser `Array<{id, label}>` (sem função própria por ação); um único `onAction(actionId)` no nível do componente é chamado ao clicar em qualquer botão; a página é responsável por obter os ids do seu próprio `SelectionController` (por closure) e decidir o que fazer. Resultado: `BulkActionBar` não conhece veículos, não conhece ids, não conhece nenhuma estrutura de dados de seleção — apenas sinaliza escolha de ação, o desacoplamento mais completo de todos os componentes implementados até aqui.

### Validação em ambiente real

Testado via `preview_eval`:
- Visibilidade correta (`display:none` com `selectedCount:0`, visível com `selectedCount>0`), contagem exibida corretamente ("N selecionado(s)").
- Clique em botão de ação dispara `onAction(actionId)` com o id correto.
- **Bloqueio de concorrência**: durante a execução de uma ação (Promise pendente), o botão fica `disabled`; um segundo clique enquanto a primeira ainda está pendente **não** dispara uma segunda execução — confirmado contando as chamadas recebidas.
- Após a Promise resolver, botões reabilitados.
- **Tratamento de erro**: quando `onAction` rejeita, o componente exibe um toast genérico (mesmo padrão do `Modal`), reabilita os botões, e **não fecha sozinho** — confirmado que o elemento continua no DOM após o erro.
- `onCancelSelection()` chamado corretamente ao clicar em "Cancelar seleção".
- `destroy()` remove o elemento do DOM.

### Problemas encontrados

O problema de fundo (contrato pedindo dado que o componente não tinha) foi encontrado na revisão crítica antes de qualquer código, não durante a implementação.

### Ajustes realizados

CSS novo criado (`.bulk-action-bar`, `.bulk-action-bar__count`, `.bulk-action-bar__actions`, `.bulk-action-bar__cancel`) — necessidade comprovada: não existe nenhuma barra de ação contextual no projeto hoje. Reaproveita classes de botão já existentes (`.btn`, `.btn-sm`, `.btn-secondary`) e variáveis de cor já existentes (`--orange`, `--orange-lt`).

### Lições aprendidas

A correção mínima (só adicionar os ids que faltavam) teria resolvido o bug, mas não teria produzido o desacoplamento mais completo que o Product Owner identificou como possível. Vale, ao encontrar uma inconsistência de contrato, perguntar não só "qual é o menor ajuste que resolve isso?" mas também "existe uma simplificação mais profunda que elimina a necessidade do ajuste inteiro?".

### Mudanças na API

Sim — reformulação completa de `actions`/`onAction` antes de qualquer implementação existir (não quebra nenhum consumidor).

### Dependências

Nenhuma — `BulkActionBar` não importa nenhum outro módulo de `js/ui/` (importa `showToast` de `../utils.js`, mesmo padrão já usado pelo `Modal`).

### Camada 2 — encerramento

Com este componente, a **Camada 2 (Componentes Compostos)** do plano de implementação da Fase 1B está concluída. Próxima etapa: Camada 3 (`VehicleStatusService`).

---

## SelectionController (Camada 1) — 2026-07-05 (Fase 1B, implementação — não é migração de tela) — **Camada 1 concluída**

### Componente implementado

`apps/frota-ops/js/ui/selection-controller.js`, conforme `docs/ui/SelectionController.md`. Ainda não adotado por nenhuma tela (Camada 4).

### Revisão de contrato antes da implementação

Antes de codar, revisão crítica encontrou uma prop obrigatória (`getItemId`) que nenhum método da Saída invocava — recebida na config, mas nunca usada internamente, já que toda a API (`toggle`, `selectAll`, `isSelected`, `getSelected`) opera diretamente sobre `string` ids, nunca sobre objetos de item. Removida do contrato antes de qualquer código, para não carregar uma abstração prematura (um método de conveniência que a consumisse, tipo `toggleItem(item)`, não existe ainda — se a necessidade aparecer na Camada 4, volta junto do método que a use). Também precisado explicitamente que `toggle()`/`selectAll()`/`clear()` só disparam `onSelectionChange` quando efetivamente mudam o conteúdo da seleção.

Avaliação estática-vs-dinâmica: config (`onSelectionChange`) é puramente estática — **sem `update()`**, documentado explicitamente no contrato, consistente com a regra geral do Design System.

### Validação em ambiente real

Testado via `preview_eval`:
- `toggle()` liga/desliga corretamente, `selectAll()` adiciona só os ids ainda não presentes.
- `clear()` chamado duas vezes seguidas só dispara `onSelectionChange` na primeira vez (seleção já vazia na segunda não gera evento) — confirma a garantia de precisão adicionada ao contrato.
- `getSelected()` retorna uma **cópia** do estado interno, não a referência — mutar o `Set` retornado não afeta o estado real do componente (testado explicitamente: adicionar um id no snapshot e confirmar que o componente não o reflete).
- `destroy()` limpa o estado interno.

### Problemas encontrados

Nenhum na implementação — o único achado foi a lacuna de contrato (`getItemId` não utilizado), encontrada e corrigida antes de qualquer código, como no `FilterBar`.

### Ajustes realizados

Nenhum CSS (este componente não renderiza nada, por contrato).

### Lições aprendidas

Duas rodadas seguidas (`FilterBar`, `SelectionController`) encontraram lacunas de contrato reais só perguntando "isso é usado de verdade?" antes de codar — reforça que a Camada 1 valeu o tempo gasto em revisão prévia, mesmo em componentes aparentemente simples.

### Mudanças na API

Sim — `getItemId` removido da config antes de qualquer implementação existir (não quebra nenhum consumidor, pois nenhuma tela usa este componente ainda).

### Dependências

Nenhuma — `SelectionController` não importa nenhum outro módulo de `js/ui/`.

### Camada 1 — encerramento

Com este componente, a **Camada 1 (Componentes Fundamentais)** do plano de implementação da Fase 1B está concluída: `SearchBox`, `FilterBar`, `SortableHeader`, `SelectionController` — todos implementados, validados em ambiente real, sem dependência entre si, sem CSS desnecessário, sem conhecimento de domínio. Próxima etapa: Camada 2 (`BulkActionBar`, que depende de `SelectionController`).

---

## SortableHeader (Camada 1) — 2026-07-05 (Fase 1B, implementação — não é migração de tela)

### Componente implementado

`apps/frota-ops/js/ui/sortable-header.js`, conforme `docs/ui/SortableHeader.md`. Ainda não adotado por nenhuma tela (Camada 4).

### Avaliação estática-vs-dinâmica (lição da entrega do FilterBar, aplicada proativamente desta vez)

`label`/`sortKey` são estáticos por instância; `active`/`direction` são dinâmicos (mudam sempre que o critério de ordenação ativo da tela muda — inclusive quando **outro** `SortableHeader` da mesma tela passa a ser o ativo). O próprio contrato já previa `update(novoConfig)` desde a Fase 0 — nenhuma lacuna encontrada desta vez, ao contrário do `FilterBar`. A pergunta "estática ou dinâmica?" feita antes de codar (e não reativamente) confirmou que o contrato já estava correto.

### Validação em ambiente real

Testado via `preview_eval`:
- Ciclo de clique confirmado exatamente como especificado: header inativo → primeiro clique emite `('sortKey', 'asc')`; após a página chamar `update({active:true, direction:'asc'})`, próximo clique emite `'desc'`; após `update({direction:'desc'})`, próximo clique volta a emitir `'asc'` — nunca remove a ordenação.
- `aria-sort` reflete corretamente `none`/`ascending`/`descending`; indicador visual (▲/▼) aparece só quando `active`.
- **Independência entre instâncias confirmada**: ativar um `SortableHeader` via `update()` não afeta outra instância na mesma página sem chamada explícita — a coordenação ("só um ativo por vez") é responsabilidade da página, como o contrato já documentava.
- `destroy()` remove o elemento do DOM sem afetar outras instâncias.

### Problemas encontrados

Nenhum.

### Ajustes realizados

Nenhum no contrato. **CSS novo criado** (`.sortable-header` em `components.css`) — necessidade comprovada: não existia nenhum estilo para cabeçalho clicável/ordenável no projeto (`.admin-table th` é só apresentacional, sem interação). Minimalista: reaproveita `var(--muted)`/`var(--orange)` já existentes, sem introduzir cor nova.

### Lições aprendidas

Confirma a lição da entrega anterior: perguntar "estática ou dinâmica?" antes de codar evita retrabalho — desta vez o contrato já estava certo, então a pergunta serviu para confirmar (não corrigir), o que também tem valor.

### Mudanças na API

Nenhuma.

### Dependências

Nenhuma — `SortableHeader` não importa nenhum outro módulo de `js/ui/`.

---

## SearchBox (Camada 1) — 2026-07-05 (Fase 1B, implementação — não é migração de tela)

### Componente implementado

`apps/frota-ops/js/ui/search-box.js`, conforme `docs/ui/SearchBox.md`. Ainda não adotado por nenhuma tela — a migração de `veiculos.js`/`patio.js`/`reservas.js`/`admin.js` é a Camada 4 do plano de implementação da Fase 1B, deliberadamente posterior.

### Validação em ambiente real

Testado isoladamente via `preview_eval` (o app exige login, não preenchido por regra de segurança):
- `type="search"`, `aria-label` e `placeholder` corretos.
- Debounce (default 150ms, testado com 30-40ms): múltiplas teclas digitadas rapidamente colapsam em **uma única** chamada de `onSearch`, com o termo final já em minúsculas e `trim()`-ado.
- `clear()`: limpa o campo e dispara `onSearch('')` imediatamente, sem esperar o debounce.
- Tecla `Esc`: equivalente a `clear()` — confirmado.
- `destroy()`: cancela o timer de debounce pendente (nenhuma chamada de `onSearch` ocorre após `destroy()`, mesmo com uma digitação em andamento) e remove o elemento do DOM.

### Problemas encontrados

Nenhum. Contrato implementado sem divergência na primeira tentativa — provavelmente porque o contrato já era detalhado o suficiente (debounce, trim, minúsculas, `Esc`, garantia de `destroy()` já explícitas em `docs/ui/SearchBox.md` desde a Fase 0).

### Ajustes realizados

Nenhum ajuste de contrato. Reaproveita exatamente as classes CSS já existentes (`.search-wrapper`, `.search-icon`, `.form-input.search-input`) de `veiculos.js` — nenhum CSS novo criado.

### Lições aprendidas

Um contrato bem escrito na Fase 0 (com regras de comportamento e acessibilidade explícitas, não só a assinatura) reduz a zero o atrito de implementação — contraste com o `Modal`, cujo contrato não especificava a ordem de inicialização e teve um bug real encontrado na Migração Piloto.

### Mudanças na API

Nenhuma.

### Dependências

Nenhuma — confirmado que `SearchBox` não importa nenhum outro módulo de `js/ui/`, consistente com a regra da Camada 1 ("nenhum deles deverá depender de outro componente").

---

## FilterBar (Camada 1) — 2026-07-05 (Fase 1B, implementação — não é migração de tela)

### Componente implementado

`apps/frota-ops/js/ui/filter-bar.js`, conforme `docs/ui/FilterBar.md`. Ainda não adotado por nenhuma tela (Camada 4).

### Revisão de contrato antes da implementação

Antes de codar, revisão crítica encontrou uma lacuna real no contrato original: `Saída` não incluía `update()`, apesar de `groups`/`options` representarem um estado dinâmico (contagens mudam com busca/realtime/importação). Sem `update()`, a única forma de refletir contagens novas seria destruir e recriar o componente, descartando a seleção ativa do operador — violação direta do princípio de continuidade operacional. Corrigido **antes** de qualquer código: `docs/ui/FilterBar.md` ganhou `update({ groups })` com garantias explícitas (preserva seleção, preserva foco quando possível, não recria listeners, remove seleção automaticamente só quando a opção correspondente deixa de existir). A mesma revisão gerou uma regra permanente do Design System, registrada em `docs/ui/README.md`: todo componente com config dinâmica precisa de `update()` com essas garantias; componentes com config estática documentam explicitamente por que não precisam (aplicado retroativamente ao `SearchBox.md`).

### Validação em ambiente real

Testado via `preview_eval`:
- Combinação de filtros: grupos combinam com E lógico, grupo `multi:true` combina opções internas com OU lógico — confirmado com 2 grupos e múltiplas seleções simultâneas.
- `update()` com contagem alterada mas opção ainda existente: **o mesmo nó do botão é reaproveitado** (não recriado), o **foco do usuário é preservado**, a **seleção ativa é preservada**, e o texto/contagem exibidos são atualizados.
- `update()` removendo uma opção previamente selecionada: seleção é limpa automaticamente e `onFilterChange` é chamado refletindo a remoção — únicas condições em que uma seleção desaparece sem ação do operador.
- `reset()`: limpa todas as seleções de todos os grupos e emite o evento.
- `destroy()`: remove o elemento do DOM.

### Problemas encontrados

Nenhum na implementação em si — o único problema foi a lacuna de contrato (`update()` ausente), encontrada e corrigida **antes** de escrever qualquer código, exatamente como o processo pede.

### Ajustes realizados

Nenhum CSS novo — reaproveita `.filter-bar`, `.filter-chip`, `.chip-count` já existentes (mesmas classes usadas hoje em `veiculos.js`).

### Lições aprendidas

A pergunta "este componente tem config estática ou dinâmica?" deveria ter sido feita para **todo** componente já na Fase 0, não descoberta reativamente aqui — vale revisar `StatusBadge`, `SortableHeader` e `SelectionController` (ainda não implementados) sob essa mesma lente antes de codar, para não repetir o mesmo ciclo de "implementar → descobrir lacuna → corrigir contrato".

### Mudanças na API

Sim — `docs/ui/FilterBar.md` ganhou `update({ groups })` antes da implementação (não é uma mudança retroativa quebrando um consumidor existente, já que nenhuma tela ainda usa `FilterBar`).

### Dependências

Nenhuma — `FilterBar` não importa nenhum outro módulo de `js/ui/`.

---

## reservas.js — 2026-07-05 (Ação #5 da Technical Audit)

### Componentes adotados

- `Modal` — substitui o `createModal` local (nova reserva, confirmar saída).
- `ConfirmationDialog` — substitui `confirm()` nativo (confirmar retorno, cancelar reserva; `tone: 'danger'` no cancelamento).

### Problemas encontrados

Nenhum problema novo — as duas divergências de contrato do `Modal` (ordem de `appendChild`/`render()`, escopo do autofoco) já tinham sido corrigidas na migração piloto de `veiculo-detalhe.js`. Esta segunda migração serviu para confirmar que a correção realmente generaliza para um segundo consumidor, sem necessidade de nenhum ajuste adicional.

### Ajustes realizados

- Mesmo padrão da migração piloto: cada `onConfirm` de `Modal` passou a chamar `await loadData()` explicitamente (o `createModal` local antigo fazia isso automaticamente); as duas ações que usavam `confirm()` nativo mantêm seu próprio `try/catch` dentro do `onConfirm` do `ConfirmationDialog`, preservando mensagens de erro específicas.
- Função `createModal` local removida do arquivo (não usada por nenhum outro código restante em `reservas.js`).

### Lições aprendidas

- **Segundo consumidor sem atrito é o resultado esperado quando a Migração Piloto já fez seu trabalho** — nenhum bug novo apareceu, nenhuma mudança de API foi necessária. Isso é evidência a favor de promover `Modal`/`ConfirmationDialog` a Stable assim que uma terceira tela adotar.

### Mudanças na API

Nenhuma.

### Contagem de adoção (rastreamento de Stable)

- `Modal`: 2 telas (`veiculo-detalhe.js`, `reservas.js`). Falta 1 para Stable.
- `ConfirmationDialog`: 2 telas (`veiculo-detalhe.js`, `reservas.js`). Falta 1 para Stable.

---

## veiculo-detalhe.js — 2026-07-05 (Migração Piloto)

### Componentes adotados

- `Modal` (`../js/ui/modal.js`) — substitui o `createModal` local em `showRetornoModal`, `showMoverPatioModal`, `showSaidaModal`.
- `ConfirmationDialog` (`../js/ui/confirmation-dialog.js`) — substitui `confirm()` nativo em `enviarLavador`, `marcarLimpo`, `marcarDisponivel`, `saiuLavador`, `sairManutencao`.
- **Fora do escopo, deliberadamente não tocado:** `colocarManutencao` continua usando `prompt()` nativo (não é `confirm()`, não fazia parte do escopo autorizado desta migração piloto).

### Problemas encontrados

Todos encontrados por teste direto no navegador (via `preview_eval`, instanciando os componentes fora do fluxo autenticado, já que o app exige login e não posso preencher credenciais) — não apenas leitura de código:

1. **Bug real de foco automático:** `Modal` chamava `render()` (que tenta `.focus()` no primeiro elemento) **antes** de `overlay` ser anexado ao `document.body`. `.focus()` em elemento desanexado do DOM é *no-op* silencioso — o autofoco documentado no contrato nunca funcionou, em nenhuma instância do componente, desde a Fase 1A. Só foi descoberto ao testar de fato no navegador; a leitura de código na code review anterior não pegou isso.
2. **Divergência de escopo do autofoco:** mesmo depois de corrigir (1), o foco ia para o botão "Fechar" (X) do cabeçalho — que aparece antes do corpo no DOM — em vez do primeiro campo do formulário. O contrato diz "primeiro elemento focável **do corpo**", mas a implementação buscava no modal inteiro.
3. **Ergonomia do `ConfirmationDialog` com mensagens de erro específicas:** o wrapper interno do `ConfirmationDialog` (`await onConfirm(); return true;`) deixa qualquer exceção lançada por `onConfirm` escapar para o `catch` genérico do `Modal` subjacente (mostra sempre "Erro ao salvar. Tente novamente."). As 5 ações migradas tinham mensagens de erro específicas (ex: "Erro ao enviar para o lavador."). Não é um bug do componente — é uma característica documentada (`ConfirmationDialog` não foi desenhado para permitir customizar a mensagem de erro) — mas exigiu uma decisão de como migrar sem perder a especificidade.

### Ajustes realizados

- **Correção no `Modal` (código do componente, não da página):** `document.body.appendChild(overlay)` movido para antes de `render()`, garantindo que o elemento já esteja no DOM quando o autofoco tenta agir.
- **Correção no `Modal`:** autofoco agora busca primeiro dentro de `.modal-body`, caindo para o modal inteiro só se o corpo não tiver nenhum elemento focável (ex: modal de confirmação sem formulário).
- **Na página (não no componente):** cada `onConfirm` das 5 ações mantém seu próprio `try/catch` interno com `showToast` de mensagem específica, sem deixar a exceção escapar para o `catch` genérico do `Modal`. Isso reproduz fielmente o comportamento anterior (com `confirm()` nativo, o diálogo já fechava antes de qualquer chamada assíncrona; o resultado — sucesso ou falha — sempre aparecia como toast independente, nunca como reabertura do diálogo). Ou seja: `ConfirmationDialog` fecha sempre ao confirmar, e a página é responsável por comunicar o resultado da operação assíncrona via toast — não existe (nem deveria existir, para este componente) um caminho de "manter aberto para nova tentativa".
- **Na página:** todo `onConfirm` de `Modal` que antes dependia do `createModal` local chamar `loadData()` automaticamente após fechar agora chama `await loadData()` explicitamente antes do `return true` — o `Modal` do Design System não sabe nada sobre a página e não recarrega dados sozinho (correto, mas é uma responsabilidade que migrou do componente para a página).

### Lições aprendidas

- **Testar no navegador encontra bugs que a leitura de código não encontra.** O bug do autofoco (item 1) sobreviveu a uma Architecture Validation inteira porque nunca foi de fato executado em um DOM real antes desta migração — só existe um consumidor agora, e mesmo assim já valeu a pena. Reforça a decisão do usuário de validar em uso real antes da Fase 1B.
- **"Confirmação simples" e "formulário com validação" são dois contratos genuinamente diferentes**, e `ConfirmationDialog` vs `Modal` capturam essa diferença corretamente — `ConfirmationDialog` não tenta (e não deveria tentar) suportar "falhar e manter aberto", porque isso não existe no conceito de confirmação simples que ele representa.
- **Toda responsabilidade de "o que fazer depois de fechar"** (recarregar dados, mostrar toast específico) pertence à página, nunca ao componente — ficou mais visível durante a migração do que estava na documentação abstrata.

### Mudanças na API

Sim, uma — no próprio `Modal` (`apps/frota-ops/js/ui/modal.js`), não em `veiculo-detalhe.js`:

- Ordem interna de inicialização corrigida (`appendChild` antes de `render()`), sem mudança de assinatura pública.
- Escopo do autofoco inicial restrito a `.modal-body` — comportamento corrigido para bater com o que o contrato já dizia (`docs/ui/Modal.md`), não uma mudança de contrato, uma correção de bug de implementação.

Nenhuma mudança na assinatura pública de `Modal` ou `ConfirmationDialog` (`{el, update, destroy}` e `{el, destroy}` respectivamente permanecem exatamente como documentado).

### Contagem de adoção (rastreamento de Stable)

- `Modal`: 1 tela (`veiculo-detalhe.js`). Faltam 2 para considerar Stable.
- `ConfirmationDialog`: 1 tela (`veiculo-detalhe.js`). Faltam 2 para considerar Stable.
