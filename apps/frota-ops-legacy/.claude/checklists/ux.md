# Checklist: UX e Acessibilidade

> Referência: standards/html.md, CLAUDE.md § RF-06, WCAG 2.1 AA

---

## Acessibilidade Visual

- [ ] Contraste mínimo 4.5:1 para texto normal
- [ ] Contraste mínimo 3:1 para texto grande (18px+)
- [ ] Contraste mínimo 3:1 para componentes de UI interativos
- [ ] Foco visível em todos os elementos interativos (não apenas `outline: none`)
- [ ] Informação não transmitida apenas por cor

## Navegação por Teclado

- [ ] Tab order lógico e intuitivo
- [ ] Skip link para "Ir para conteúdo principal"
- [ ] Todos os elementos interativos acessíveis por teclado
- [ ] Enter/Space ativam botões e links
- [ ] Escape fecha modais e menus
- [ ] Foco aprisionado em modais (focus trap)
- [ ] Foco retorna ao elemento trigger ao fechar modal

## Leitores de Tela

- [ ] Hierarquia de headings lógica (h1 → h2 → h3)
- [ ] Imagens informativas têm `alt` descritivo
- [ ] Imagens decorativas têm `alt=""`
- [ ] Formulários têm `<label>` associado a cada input
- [ ] Erros de formulário associados ao campo via `aria-describedby`
- [ ] Regiões ao vivo (`aria-live`) para conteúdo dinâmico
- [ ] Botões de ícone têm `aria-label` descritivo
- [ ] Status de carregamento anunciado (`aria-busy`)

## Mobile UX

- [ ] Alvos de toque mínimo de 44x44px
- [ ] Espaçamento entre alvos mínimo de 8px
- [ ] Texto mínimo de 16px em corpo
- [ ] Sem scroll horizontal em 320px
- [ ] Formulários com `inputmode` e `autocomplete` corretos
- [ ] Safe areas consideradas (notch, home indicator)
- [ ] Funciona em orientação retrato e paisagem

## Feedback ao Usuário

- [ ] Estado de loading visível durante operações (> 300ms)
- [ ] Mensagens de sucesso após ações confirmadas
- [ ] Mensagens de erro claras e acionáveis (não apenas "Erro!")
- [ ] Estado vazio (empty state) com ação sugerida
- [ ] Confirmação antes de ações destrutivas (deletar, etc.)
- [ ] Formulários preservam dados em caso de erro de validação

## Usabilidade Geral

- [ ] Ações irreversíveis têm confirmação
- [ ] Formulários longos têm indicador de progresso
- [ ] Botões de submit desabilitados durante processamento
- [ ] Erros de validação mostrados próximo ao campo
- [ ] Texto de placeholder não substitui label
- [ ] Links descritivos ("Clique aqui" é inadequado)
