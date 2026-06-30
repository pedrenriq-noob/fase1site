const CACHE_NAME = 'i-frotas-v1';
const STATIC_ASSETS = [
  '/frota/',
  '/frota/index.html',
  '/frota/css/base.css',
  '/frota/css/components.css',
  '/frota/js/app.js',
  '/frota/js/supabase.js',
  '/frota/js/auth.js',
  '/frota/js/utils.js',
  '/frota/js/realtime.js',
  '/frota/pages/dashboard.js',
  '/frota/pages/veiculos.js',
  '/frota/pages/veiculo-detalhe.js',
  '/frota/pages/disponibilidade.js',
  '/frota/pages/reservas.js',
  '/frota/pages/patio.js',
  '/frota/manifest.json'
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
          return caches.match('/frota/index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
