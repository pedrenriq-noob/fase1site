# Checklist: Performance

> Referência: CLAUDE.md § RP-*, standards/css.md, standards/javascript.md

---

## Core Web Vitals

- [ ] LCP (Largest Contentful Paint) < 2.5s
- [ ] FID/INP (Interaction to Next Paint) < 200ms
- [ ] CLS (Cumulative Layout Shift) < 0.1
- [ ] Lighthouse score geral >= 90
- [ ] Lighthouse performance >= 90

## JavaScript

- [ ] Bundle total < 200KB gzipped
- [ ] Sem bibliotecas desnecessárias
- [ ] Code splitting implementado para features grandes
- [ ] Lazy loading de módulos não críticos
- [ ] Nenhuma operação síncrona pesada no thread principal
- [ ] Debounce/throttle em handlers de scroll, resize, input

## CSS

- [ ] Nenhuma animação usa `top`, `left`, `width`, `height` (usa `transform`)
- [ ] `will-change` usado com moderação (apenas onde necessário)
- [ ] CSS crítico carregado primeiro
- [ ] Fonts com `font-display: swap`
- [ ] Sem regras CSS não utilizadas em produção

## Imagens

- [ ] Formato WebP ou AVIF onde suportado
- [ ] `loading="lazy"` em imagens below-the-fold
- [ ] `decoding="async"` em todas as imagens
- [ ] `width` e `height` explícitos para evitar CLS
- [ ] Imagens redimensionadas para o tamanho real de exibição
- [ ] `srcset` e `sizes` para imagens responsivas

## Banco de Dados

- [ ] Nenhuma query > 100ms em produção (P95)
- [ ] EXPLAIN ANALYZE executado para queries novas
- [ ] Sem Seq Scan em tabelas > 1000 linhas
- [ ] N+1 queries eliminadas
- [ ] `LIMIT` em todas as queries de listagem

## Rede e Cache

- [ ] Assets estáticos com Cache-Control: max-age longo
- [ ] Service Worker implementado para cache (PWA)
- [ ] Compressão gzip/brotli habilitada no servidor
- [ ] CDN configurado para assets estáticos
- [ ] HTTP/2 ou HTTP/3 habilitado

## PWA

- [ ] Lighthouse PWA score >= 90
- [ ] Páginas principais funcionam offline
- [ ] Service Worker com estratégia de cache adequada
- [ ] Manifest.json válido
