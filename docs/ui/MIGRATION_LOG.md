# Migration Log — Design System Operacional do i-Frotas

Histórico permanente de cada tela migrada para os componentes de `docs/ui/`. Ver `docs/ui/README.md` para a tabela-resumo de "status de adoção"; este documento é o relato detalhado de cada migração, incluindo dificuldades e ajustes de API.

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
