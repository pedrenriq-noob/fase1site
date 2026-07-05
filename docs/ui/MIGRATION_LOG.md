# Migration Log — Design System Operacional do i-Frotas

Histórico permanente de cada tela migrada para os componentes de `docs/ui/`. Ver `docs/ui/README.md` para a tabela-resumo de "status de adoção"; este documento é o relato detalhado de cada migração, incluindo dificuldades e ajustes de API.

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
