/**
 * Offline support. Caches only the app's own files (HTML, scripts, styles,
 * fonts, icons), never her data: the data lives in localStorage and is not touched here.
 *
 * - Install: the page plus this build's scripts, styles and Hebrew/Latin
 *   fonts, so the very first offline open works too. The build fills in
 *   CACHE and PRECACHE (scripts/sw-precache.mjs); in dev the worker is not
 *   registered and the placeholders stay.
 * - Pages, the manifest and icons: network first, so a new version arrives as
 *   soon as she is online; the cached copy is used offline.
 * - Other files: cache first. Vite names them by content hash, so a cached
 *   file never goes stale; a new build brings new names and a new cache.
 */
const CACHE = 'app-b9e0611bb2';
const PRECACHE = ["./assets/index-1qEJo1U8.js", "./assets/index-M99_UDB8.css", "./assets/rubik-hebrew-400-normal-Dp0lvSRB.woff2", "./assets/rubik-hebrew-500-normal-B_5jqoVI.woff2", "./assets/rubik-hebrew-600-normal-CpCbvE17.woff2", "./assets/rubik-latin-400-normal-j0pmKyiQ.woff2", "./assets/rubik-latin-500-normal-1os41rQk.woff2", "./assets/rubik-latin-600-normal-7iWW07_k.woff2"];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(['./', './manifest.webmanifest', './icons/icon-192.png', ...PRECACHE]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Network first; a good response refreshes the cached copy (under `key`), offline the copy is used. */
function networkFirst(request, key) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(key, copy));
      }
      return response;
    })
    .catch(() => caches.match(key).then((cached) => cached ?? Response.error()));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Only this app's own files; anything else goes straight to the network.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, './'));
    return;
  }

  if (url.pathname.endsWith('/manifest.webmanifest') || url.pathname.includes('/icons/')) {
    event.respondWith(networkFirst(request, request));
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
