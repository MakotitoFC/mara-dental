// public/sw.js
// Service Worker para modo offline de lectura (Mara Dental - Rol doctor_admin)

const CACHE_VERSION = 'mara-v2-20260926';
const STATIC_CACHE = `mara-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `mara-dynamic-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/offline-shell',
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-icon-192x192.png',
  '/icons/maskable-icon-512x512.png',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      try {
        await cache.addAll(PRECACHE_ASSETS);
      } catch (err) {
        console.warn('[SW] Error en precache básico:', err);
      }

      // Precache dinámico: inspeccionar el HTML de /offline-shell para precachear todos sus chunks JS y CSS
      try {
        const shellRes = await fetch('/offline-shell');
        if (shellRes.ok) {
          const html = await shellRes.text();
          const scriptMatches = html.match(/src="(\/_next\/static\/[^"]+)"/g) || [];
          const linkMatches = html.match(/href="(\/_next\/static\/[^"]+)"/g) || [];

          const chunks = new Set();
          for (const s of scriptMatches) {
            const m = s.match(/src="([^"]+)"/);
            if (m && m[1]) chunks.add(m[1]);
          }
          for (const l of linkMatches) {
            const m = l.match(/href="([^"]+)"/);
            if (m && m[1]) chunks.add(m[1]);
          }

          const chunkList = Array.from(chunks);
          if (chunkList.length > 0) {
            console.log('[SW] Precacheando chunks dinámicos:', chunkList.length);
            await cache.addAll(chunkList);
          }
        }
      } catch (err) {
        console.warn('[SW] Error analizando chunks de offline-shell:', err);
      }
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
            console.log('[SW] Purgando caché obsoleto:', key);
            return caches.delete(key);
          }
        })
      );
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Solo peticiones GET
  if (request.method !== 'GET') return;

  // 1. Navegación (HTML de páginas): Network-first con fallback al /offline-shell
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            return networkResponse;
          }
        } catch {
          // Fallo de red (offline)
        }

        // Servir el shell offline agnóstico
        const cache = await caches.open(STATIC_CACHE);
        const cachedShell = await cache.match('/offline-shell');
        if (cachedShell) {
          return cachedShell;
        }

        return new Response(
          '<!DOCTYPE html><html><head><title>Sin conexión</title></head><body><h1>Modo sin conexión no listo</h1></body></html>',
          { headers: { 'Content-Type': 'text/html' }, status: 200 }
        );
      })().catch(() => new Response(null, { status: 408 }))
    );
    return;
  }

  // 2. Chunks estáticos de Next.js (_next/static/*): Cache-first con actualización en background
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) {
          // Revalidación en background si hay red
          fetch(request)
            .then(async (fresh) => {
              if (fresh && fresh.status === 200) {
                const cache = await caches.open(STATIC_CACHE);
                cache.put(request, fresh);
              }
            })
            .catch(() => {});
          return cached;
        }

        try {
          const fresh = await fetch(request);
          if (fresh && fresh.status === 200) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, fresh.clone());
          }
          return fresh;
        } catch {
          return new Response(null, { status: 408 });
        }
      })().catch(() => new Response(null, { status: 408 }))
    );
    return;
  }

  // 3. Recursos estáticos locales (iconos, fuentes, imágenes locales)
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/icons/') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.ico') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.woff2'))
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        try {
          const fresh = await fetch(request);
          if (fresh && fresh.status === 200) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, fresh.clone());
          }
          return fresh;
        } catch {
          return new Response(null, { status: 408 });
        }
      })().catch(() => new Response(null, { status: 408 }))
    );
    return;
  }

  // 4. Cualquier otra petición: network-first con captura silenciosa de errores
  event.respondWith(
    (async () => {
      try {
        return await fetch(request);
      } catch {
        return new Response(null, { status: 408 });
      }
    })().catch(() => new Response(null, { status: 408 }))
  );
});

// Mensajería desde el cliente
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_URLS' && Array.isArray(event.data.urls)) {
    caches.open(STATIC_CACHE).then((cache) => {
      event.data.urls.forEach((u) => {
        fetch(u)
          .then((res) => {
            if (res.ok) cache.put(u, res);
          })
          .catch(() => {});
      });
    });
  }
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
