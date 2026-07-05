# ADR-008 — Roteamento SPA via hash (`#/rota`) no frota-ops

**Data:** 2026-01-01 (registrada originalmente em `apps/frota-ops/docs/adr/`, consolidada aqui em 2026-07-05)
**Status:** Aceito
**Contexto:** i-Frotas PWA (`apps/frota-ops`) — navegação entre páginas

---

## Contexto

O i-Frotas é uma SPA servida como arquivo estático no Vercel. Precisávamos de roteamento client-side sem depender de configuração de servidor para reescritas de URL (history API).

## Decisão

Usar **hash routing** (`#/dashboard`, `#/veiculos`, `#/admin`) via `window.location.hash` e evento `hashchange`.

## Motivação

- Sem configuração especial no Vercel ou servidor — qualquer URL com hash funciona sem reescrita.
- `hashchange` é um evento nativo confiável — sem polyfills.
- Compatível com o cache do Service Worker — a URL base (`/`) é sempre a mesma.
- Navegação entre páginas não recarrega o shell HTML — apenas o conteúdo interno muda.

## Consequências

**Positivas:**
- Deploy simples — apenas `index.html` precisa ser servido.
- Deep links funcionam nativamente (ex: `#/veiculo/ABC-1234`).
- Back/forward do browser funcionam via histórico de hash.

**Negativas:**
- URLs menos "limpas" visualmente (ex: `app.vercel.app/#/dashboard`).
- SEO irrelevante para este caso (PWA autenticado), mas hash routes não são indexados por crawlers.

## Alternativas consideradas

- **History API (pushState)**: rejeitado — exige `vercel.json` com rewrites para todas as rotas; adiciona ponto de falha na configuração de deploy.
- **Sem roteamento (single page)**: rejeitado — deep links e bookmarks não funcionariam.

---

**Nota de consolidação (2026-07-05):** esta ADR existia originalmente em `apps/frota-ops/docs/adr/ADR-002-hash-spa-routing.md`, uma pasta órfã criada quando o frota-ops era um repositório standalone (antes da unificação de repos). Renumerada para ADR-008 e movida para cá — ver ADR resolvida na Technical Audit de 2026-07-05, item D8 — para eliminar a duplicação de numeração com a sequência canônica (que já tinha seu próprio ADR-002, sobre Supabase como backend).
