/* CyberDoom PWA Service Worker (simple)
   Cachea assets estáticos para modo offline.
*/
const CACHE_NAME = "cyberdoom-cache-v1";
const PRECACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./landing.html",
  "./certificate.html",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/maskable-192.png",
  "./assets/icons/maskable-512.png",
  "./assets/icons/favicon-64.png",

  // JS (ES modules)
  "./src/main.js",
  "./src/pwa.js",
  "./src/config.js",
  "./src/utils.js",
  "./src/levels.js",
  "./src/roles.js",
  "./src/storage.js",
  "./src/api.js",
  "./src/ui.js",
  "./src/engine.js",
  "./src/game.js",
  "./src/input.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE);
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo maneja mismo origen
  if (url.origin !== self.location.origin) return;

  // Navegación: network-first (para actualizar index)
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match("./index.html")) || (await cache.match("./"));
      }
    })());
    return;
  }

  // Assets: cache-first
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;

    try {
      const res = await fetch(req);
      // cachea solo respuestas válidas
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      return cached || Response.error();
    }
  })());
});
