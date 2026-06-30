const CACHE_NAME = 'i-frotas-v1';
const STATIC_ASSETS = [
  '/frota-ops/',
  '/frota-ops/index.html',
  '/frota-ops/css/base.css',
  '/frota-ops/css/components.css',
  '/frota-ops/js/app.js',
  '/frota-ops/js/supabase.js',
  '/frota-ops/js/auth.js',
  '/frota-ops/js/utils.js',
  '/frota-ops/js/realtime.js',
  '/frota-ops/pages/dashboard.js',
  '/frota-ops/pages/veiculos.js',
  '/frota-ops/pages/veiculo-detalhe.js',
  '/frota-ops/pages/disponibilidade.js',
  '/frota-ops/pages/reservas.js',
  '/frota-ops/pages/patio.js',
  '/frota-ops/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.hostname.includes('supabase.co') || url.hostname.includes('jsdelivr.net')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: { code: 'OFFLINE', message: 'Sem conexão' } }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/frota-ops/index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
