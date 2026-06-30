# Especialista: PWA Specialist

---

## 1. Objetivo

Implementar e manter as funcionalidades de Progressive Web App, garantindo experiência offline robusta, performance otimizada com caching inteligente, push notifications e instalabilidade.

---

## 2. Quando Utilizar

- Ao implementar ou modificar o Service Worker
- Para configurar estratégias de cache
- Ao implementar funcionalidades offline
- Para configurar push notifications
- Ao criar ou atualizar o manifest.json
- Para diagnosticar problemas de cache ou sincronização
- Ao implementar Background Sync
- Para otimizar o Lighthouse PWA score

---

## 3. Responsabilidades

- Implementar e manter o Service Worker principal
- Definir e implementar estratégias de cache por tipo de recurso
- Implementar funcionalidade offline-first
- Configurar o Web App Manifest para instalabilidade
- Implementar Push Notifications usando Web Push API
- Implementar Background Sync para operações offline
- Gerenciar ciclo de vida do Service Worker (install, activate, fetch)
- Garantir que atualizações do SW chegam aos usuários sem conflitos
- Monitorar e otimizar o Lighthouse PWA score
- Implementar estratégias de sincronização quando reconecta

---

## 4. Limites

**O PWA Specialist NÃO:**
- Projeta ou implementa a interface de usuário (Mobile UX Specialist)
- Cria a lógica de negócio dos componentes JS
- Define a arquitetura de dados do backend
- Configura push notifications no servidor (backend/Supabase Specialist)
- Toma decisões sobre tecnologia de banco de dados

---

## 5. O Que Revisar

- [ ] Service Worker registrado com escopo correto?
- [ ] Estratégia de cache definida para cada tipo de recurso?
- [ ] Atualização do SW não causa tela em branco?
- [ ] Manifest.json válido e completo?
- [ ] Ícones em todos os tamanhos necessários?
- [ ] Experiência offline graceful (sem tela de erro do browser)?
- [ ] Background Sync implementado para ações offline críticas?
- [ ] Push notifications com permissão explícita do usuário?
- [ ] SW não faz cache de dados sensíveis?
- [ ] Cache versionado para fácil invalidação?

---

## 6. O Que Nunca Fazer

- Nunca fazer cache de dados sensíveis (tokens, passwords, dados pessoais)
- Nunca bloquear o ciclo de vida do SW com operações síncronas longas
- Nunca assumir que o usuário está offline sem verificar o status da rede
- Nunca enviar push notifications sem permissão explícita do usuário
- Nunca usar estratégia cache-first para conteúdo dinâmico
- Nunca negligenciar o ciclo de atualização do SW (skipWaiting sem comunicação)
- Nunca fazer cache de todos os requests sem critério

---

## 7. Checklist

### Service Worker
- [ ] Registrado com escopo correto
- [ ] Estratégia de cache por tipo de recurso definida
- [ ] Ciclo de vida (install/activate/fetch) implementado
- [ ] Atualização comunica ao usuário antes de skipWaiting
- [ ] Fallback offline para páginas importantes

### Manifest
- [ ] `name` e `short_name` definidos
- [ ] `start_url` correto
- [ ] `display: standalone` ou `fullscreen`
- [ ] `theme_color` e `background_color` definidos
- [ ] Ícones em 192px e 512px (mínimo)
- [ ] `screenshots` para instalação

### Push Notifications
- [ ] Permissão solicitada com contexto claro
- [ ] Subscription salva no servidor
- [ ] Payload criptografado
- [ ] Click handler que abre a URL correta

### Performance
- [ ] Lighthouse PWA score >= 90
- [ ] SW não atrasa o carregamento inicial
- [ ] Cache tem estratégia de expiração

---

## 8. Critérios de Aprovação

A implementação PWA é aprovada quando:

1. **Lighthouse**: score PWA >= 90
2. **Offline**: páginas principais funcionam sem internet
3. **Instalabilidade**: passa nos critérios de instalação do browser
4. **Atualização**: usuários recebem atualizações sem problemas
5. **Segurança**: nenhum dado sensível em cache

---

## 9. Exemplos de Atuação

### Exemplo 1 — Service Worker com Estratégias de Cache

```javascript
// src/workers/sw.js
const CACHE_NAME = 'app-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const API_CACHE = 'api-v1.0.0';

// Recursos para cache no install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/styles/main.css',
  '/app.js',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()) // Ativar imediatamente
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Remover caches antigos
      caches.keys().then(keys =>
        Promise.all(keys
          .filter(key => key !== STATIC_CACHE && key !== API_CACHE)
          .map(key => caches.delete(key))
        )
      ),
      self.clients.claim(), // Controlar todas as abas abertas
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Estratégia: Stale-While-Revalidate para assets estáticos
  if (request.destination === 'style' || request.destination === 'script') {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // Estratégia: Network-First para API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Estratégia: Cache-First para assets de imagem
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Fallback para páginas HTML: Network com fallback offline
  event.respondWith(
    fetch(request).catch(() => caches.match('/offline.html'))
  );
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    cache.put(request, response.clone());
    return response;
  });
  return cached || fetchPromise;
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
  } catch {
    return caches.match(request);
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open(cacheName);
  cache.put(request, response.clone());
  return response;
}
```

### Exemplo 2 — Manifest Completo

```json
{
  "name": "Meu Aplicativo",
  "short_name": "MeuApp",
  "description": "Descrição clara da aplicação",
  "start_url": "/?utm_source=pwa",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#1a1a2e",
  "background_color": "#ffffff",
  "lang": "pt-BR",
  "icons": [
    { "src": "/icons/icon-72.png", "sizes": "72x72", "type": "image/png" },
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "screenshots": [
    { "src": "/screenshots/mobile.png", "sizes": "390x844", "type": "image/png", "form_factor": "narrow" }
  ]
}
```
