# Checklist: PWA (Progressive Web App)

> Referência: skills/pwa-specialist.md, CLAUDE.md § RP-04

---

## Manifest

- [ ] `/manifest.json` presente e válido
- [ ] `name` e `short_name` definidos
- [ ] `description` presente
- [ ] `start_url` correto (com `?utm_source=pwa`)
- [ ] `display: standalone` ou `fullscreen`
- [ ] `theme_color` definido
- [ ] `background_color` definido
- [ ] `lang: pt-BR` definido
- [ ] Ícone 192x192 presente (para Android)
- [ ] Ícone 512x512 presente (para splash screen)
- [ ] Ícone maskable disponível
- [ ] Screenshots incluídas (melhora taxa de instalação)

## Service Worker

- [ ] Service Worker registrado com escopo correto
- [ ] Estratégia de cache definida por tipo de recurso:
  - Assets estáticos: Cache First ou Stale While Revalidate
  - API/dados dinâmicos: Network First
  - Imagens: Cache First com limite de espaço
- [ ] Cache versionado (atualiza ao fazer deploy)
- [ ] Caches antigos removidos no `activate`
- [ ] `skipWaiting()` e `clients.claim()` configurados
- [ ] Atualização comunica ao usuário antes de recarregar

## Experiência Offline

- [ ] Página `/offline.html` criada como fallback
- [ ] Páginas principais funcionam sem internet
- [ ] Dados críticos pré-cacheados no install
- [ ] Background Sync para ações offline (se necessário)
- [ ] Indicador visual quando offline
- [ ] Dados de formulário preservados se ficou offline

## Push Notifications

- [ ] Permissão solicitada com contexto claro (não no carregamento)
- [ ] Subscription do usuário salva no servidor
- [ ] Service Worker tem handler de `push` event
- [ ] Click em notificação abre URL correta
- [ ] Notificações têm ícone e badge configurados
- [ ] Opção de cancelar notificações disponível

## Instalabilidade

- [ ] Critérios de instalação do browser atendidos
- [ ] `beforeinstallprompt` capturado para prompt customizado
- [ ] Prompt de instalação oferecido no momento certo (não imediato)

## Lighthouse PWA

- [ ] Score PWA >= 90
- [ ] "Fast and reliable" pass
- [ ] "Installable" pass
- [ ] "PWA Optimized" pass

## Meta Tags

- [ ] `<link rel="manifest">` na head
- [ ] `<meta name="theme-color">` na head
- [ ] `<link rel="apple-touch-icon">` para iOS
- [ ] `<meta name="apple-mobile-web-app-capable">` (opcional)
