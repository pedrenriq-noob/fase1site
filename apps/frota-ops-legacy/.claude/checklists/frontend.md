# Checklist: Frontend

> Referência: standards/html.md, standards/css.md, standards/javascript.md, CLAUDE.md § RF-*

---

## HTML

- [ ] Documento começa com `<!DOCTYPE html>`
- [ ] `<html lang="pt-BR">` definido
- [ ] `<meta charset="UTF-8">` presente
- [ ] `<meta name="viewport">` correto
- [ ] Título descritivo e único para a página
- [ ] Meta description presente
- [ ] Elementos semânticos corretos (`<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`, `<footer>`)
- [ ] Hierarquia de headings correta (h1 → h2 → h3, sem pular)
- [ ] Nenhum `<div>` onde elemento semântico é adequado
- [ ] Nenhuma tabela usada para layout (apenas para dados tabulares)
- [ ] Todos os `<img>` têm `alt` (descritivo ou vazio se decorativo)
- [ ] Todos os `<button>` têm `type` explícito
- [ ] Todos os `<input>` têm `<label>` associado via `for`/`id`

## CSS

- [ ] CSS Custom Properties usadas para cores, espaçamentos e tipografia
- [ ] Classes seguem nomenclatura BEM
- [ ] CSS escrito mobile-first (sem `max-width` desnecessários)
- [ ] Nenhum `!important` (exceto utilities documentadas)
- [ ] Nenhum valor hardcoded para cor (use tokens)
- [ ] Contraste mínimo 4.5:1 para texto normal, 3:1 para texto grande
- [ ] Nenhum `outline: none` sem substituto de foco visível
- [ ] Animações respeitam `prefers-reduced-motion`

## JavaScript

- [ ] Apenas ES Modules (`import`/`export`) — sem `require()`
- [ ] Extensões `.js` explícitas nos imports
- [ ] Apenas `const` e `let` — sem `var`
- [ ] `async/await` em vez de `.then()/.catch()`
- [ ] `try/catch` em todos os blocos async
- [ ] Funções públicas têm JSDoc completo
- [ ] Nenhum `console.log` de debug
- [ ] `textContent` em vez de `innerHTML` para dados de usuário (XSS)
- [ ] Event listeners removidos quando componente é destruído
- [ ] Operações independentes em `Promise.all`
- [ ] Funções com máximo de 30 linhas

## Acessibilidade

- [ ] Navegação por teclado funciona em todos os elementos interativos
- [ ] `tabindex` usado corretamente (preferencialmente -1 ou 0)
- [ ] Elementos focáveis têm estilo de foco visível
- [ ] ARIA roles usados apenas quando necessário
- [ ] `aria-label` em elementos sem texto visível
- [ ] `aria-describedby` em campos com instrução adicional
- [ ] `aria-live` em regiões que atualizam dinamicamente
- [ ] Modais têm `aria-modal="true"` e gerenciamento de foco

## Estados da UI

- [ ] Estado de loading implementado para operações assíncronas
- [ ] Estado de erro com mensagem clara ao usuário
- [ ] Estado vazio (empty state) implementado onde aplicável
- [ ] Estado de sucesso para ações confirmadas

## Performance

- [ ] Imagens têm `loading="lazy"` onde aplicável
- [ ] Imagens têm `decoding="async"`
- [ ] Fontes carregadas com `font-display: swap`
- [ ] CSS não blocking crítico inline ou carregado primeiro
- [ ] JavaScript deferido ou assíncrono onde possível
