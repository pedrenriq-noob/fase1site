# ADR-001 — Vanilla JS sem framework frontend

**Data:** 2026-01-01  
**Status:** Aceito  
**Contexto:** I-Frotas PWA

---

## Contexto

O I-Frotas é um PWA para gestão de frota rodando em navegadores mobile. Precisávamos de reatividade de UI, roteamento SPA, gerenciamento de estado e suporte offline — decidindo entre framework e JS puro.

## Decisão

Usar **JavaScript puro com ES Modules** (`import`/`export`), sem framework.

## Motivação

- PWA com foco em performance mobile — cada KB de JS importa em redes 3G/4G
- ES Modules nativos do browser permitem lazy loading de páginas sem bundler
- A equipe mantém o mesmo padrão do Fase 1 site — base de conhecimento unificada
- Supabase SDK é a única dependência real — tudo mais é nativo do browser

## Consequências

**Positivas:**
- Lazy loading de páginas via `import()` dinâmico — apenas o módulo da rota atual é carregado
- Service Worker (`sw.js`) cacheia módulos individualmente — granularidade de cache melhor
- Zero dependência de runtime — sem risco de breaking changes de framework

**Negativas:**
- Estado global gerenciado manualmente — disciplina de módulos é obrigatória
- Sem type-checking — risco de erros de contrato entre módulos

## Alternativas consideradas

- **React / Next.js**: rejeitado — bundle pesado, SSR desnecessário para PWA autenticado
- **Lit / Web Components**: avaliado — interessante, mas adiciona abstração sem ganho real para este escopo
