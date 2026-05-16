// LOW-4: Service Worker — offline fallback
// Strategy: Network First for API calls, Cache First for static assets,
// offline fallback page for navigation requests.

const CACHE_NAME = "findx-v1";
const OFFLINE_URL = "/offline.html";

// Static assets to pre-cache on install
const PRECACHE_ASSETS = [
  "/",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  // Activate new SW immediately without waiting for old tabs to close
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Clean up old caches from previous versions
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Let API calls go through — network only, no caching
  if (url.pathname.startsWith("/api/")) {
    return; // default browser fetch
  }

  // Navigation requests: network first, fallback to offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then(
          (cached) => cached ?? new Response("Offline", { status: 503 })
        )
      )
    );
    return;
  }

  // Static assets (JS, CSS, fonts, images): cache first, update in background
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font" ||
    request.destination === "image"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        });
        return cached ?? networkFetch;
      })
    );
    return;
  }
});
